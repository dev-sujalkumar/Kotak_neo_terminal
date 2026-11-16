import axios from 'axios';
import { parse } from 'csv-parse/sync';
import WebSocket from 'ws';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { kotakRateLimiter } from '../../utils/rateLimiter.js';
import { yahooFinanceService } from '../market/YahooFinanceService.js';
import {
  KotakLoginResponse,
  KotakValidateResponse,
  QuoteData,
  OrderPlacementParams,
  OrderModifyParams,
  OrderCancelParams,
  MarginCheckParams,
  MarginCheckResponse,
  HoldingItem,
  PositionItem,
  OrderItem,
  TradeItem,
  LimitsData,
  QuoteInstrument,
  ScripSearchParams
} from '../../types/index.js';

function normalizeOrderType(value: unknown): string {
  const orderType = String(value || '').toUpperCase();
  if (orderType === 'M' || orderType === 'MKT') return 'MARKET';
  if (orderType === 'L') return 'LIMIT';
  return orderType || 'UNKNOWN';
}

function parseExpiryDate(value: string | undefined, segment: string): number | undefined {
  if (!value) return undefined;
  const timestamp = Number(value);
  if (Number.isFinite(timestamp) && timestamp > 0) {
    const apiDateOffset = segment.endsWith('_fo') && segment !== 'bse_fo' && segment !== 'mcx_fo' ? 315_511_200 : 0;
    return new Date((timestamp + apiDateOffset) * 1000).setUTCHours(0, 0, 0, 0);
  }

  const normalized = value.match(/^(\d{1,2})([A-Z]{3})(\d{4})$/i);
  if (!normalized) return undefined;
  const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    .indexOf(normalized[2].toLowerCase());
  if (monthIndex < 0) return undefined;
  return Date.UTC(Number(normalized[3]), monthIndex, Number(normalized[1]));
}

export interface IBrokerService {
  loginWithTotp(mobileNumber: string, ucc: string, totp: string, accessToken?: string): Promise<KotakLoginResponse>;
  validateMpin(mpin: string, viewToken: string, viewSid: string, accessToken?: string): Promise<KotakValidateResponse>;
  getScripMasterPaths(): Promise<any>;
  searchScrip(params: ScripSearchParams): Promise<Record<string, unknown>[]>;
  getQuotes(exchangeSegment: string, symbol: string, allowFallback?: boolean): Promise<QuoteData>;
  getQuotesBatch(instruments: QuoteInstrument[], quoteType?: string): Promise<Record<string, unknown>[]>;
  getHoldings(): Promise<HoldingItem[]>;
  getPositions(): Promise<PositionItem[]>;
  getLimits(segment?: string, exchange?: string, product?: string): Promise<LimitsData>;
  checkMargin(params: MarginCheckParams): Promise<MarginCheckResponse>;
  placeOrder(params: OrderPlacementParams): Promise<{ orderNumber: string; status: string }>;
  modifyOrder(params: OrderModifyParams): Promise<{ orderNumber: string; status: string }>;
  cancelOrder(params: OrderCancelParams): Promise<{ status: string }>;
  getOrderBook(): Promise<OrderItem[]>;
  getOrderHistory(orderNumber: string): Promise<OrderItem[]>;
  getTradeBook(): Promise<TradeItem[]>;
  logout(): Promise<void>;
}

export class KotakNeoBrokerService implements IBrokerService {
  private activeBaseUrl: string | null = null;
  private sessionToken: string | null = null;
  private sessionSid: string | null = null;
  private serverId: string | null = null;
  private viewServerId: string | null = null;
  private accessToken: string | null = null;
  private scripMasterPaths: string[] | Record<string, string> | null = null;
  private dataCenter: string | null = null;

  constructor() {
    this.accessToken = config.kotak.accessToken;
  }

  public setSession(
    baseUrl: string,
    sessionToken: string,
    sessionSid: string,
    accessToken?: string,
    serverId?: string,
    dataCenter?: string,
  ) {
    this.activeBaseUrl = baseUrl.replace(/\/+$/, '');
    this.sessionToken = sessionToken;
    this.sessionSid = sessionSid;
    this.serverId = serverId || null;
    this.dataCenter = dataCenter || null;
    this.scripMasterPaths = null;
    if (accessToken) this.accessToken = accessToken;
  }

  public clearSession() {
    this.activeBaseUrl = null;
    this.sessionToken = null;
    this.sessionSid = null;
    this.serverId = null;
    this.viewServerId = null;
    this.scripMasterPaths = null;
    this.dataCenter = null;
  }

  public isConnected(): boolean {
    return !!(this.activeBaseUrl && this.sessionToken && this.sessionSid);
  }

  public connectOrderFeed(): WebSocket {
    if (!this.isConnected()) throw new Error('Connect to Kotak Neo before opening the order feed.');
    const orderFeedHost = ({
      adc: 'cis',
      e21: 'e21',
      e22: 'e22',
      e41: 'e41',
      e43: 'e43',
    } as Record<string, string>)[(this.dataCenter || '').toLowerCase()] || 'mis';
    const socket = new WebSocket(`wss://${orderFeedHost}.kotaksecurities.com/realtime`);
    socket.on('open', () => {
      socket.send(JSON.stringify({
        type: 'CONNECTION',
        Authorization: this.sessionToken,
        Sid: this.sessionSid,
        source: 'WEB',
      }));
    });
    return socket;
  }

  private get sessionQuery(): Record<string, string> | undefined {
    return this.serverId ? { sId: this.serverId } : undefined;
  }

  private get sessionHeaders() {
    return {
      Auth: this.sessionToken || '',
      sid: this.sessionSid || '',
    };
  }

  // STEP 2: TOTP Trade API Login
  async loginWithTotp(mobileNumber: string, ucc: string, totp: string, accessToken?: string): Promise<KotakLoginResponse> {
    this.viewServerId = null;
    const token = accessToken || this.accessToken || config.kotak.accessToken;
    const url = `${config.kotak.baseLoginUrl}/login/1.0/tradeApiLogin`;

    // Format mobile number with +91 if 10 digits
    const formattedMobile = mobileNumber.startsWith('+')
      ? mobileNumber
      : (mobileNumber.length === 10 ? `+91${mobileNumber}` : (mobileNumber.startsWith('91') && mobileNumber.length === 12 ? `+${mobileNumber}` : mobileNumber));

    logger.info('Invoking Kotak Neo Trade API TOTP login');

    return kotakRateLimiter.enqueue(async () => {
      try {
        const response = await axios.post(
          url,
          { mobileNumber: formattedMobile, ucc, totp },
          {
            headers: {
              'Authorization': token, // Plain token without Bearer as per specification
              'neo-fin-key': 'neotradeapi',
              'Content-Type': 'application/json',
            },
          }
        );

        const data = response.data?.result || response.data?.data || response.data;
        const viewToken = data.token || data.viewToken;
        const viewSid = data.sid || data.viewSid;
        if (typeof viewToken !== 'string' || !viewToken || typeof viewSid !== 'string' || !viewSid) {
          throw new Error('Kotak TOTP login returned incomplete session details.');
        }
        this.viewServerId = data.hsServerId || data.serverId || null;
        return {
          viewToken,
          viewSid,
          requestId: data.requestId || '',
          serverId: data.hsServerId || data.serverId || '',
          status: response.data?.status || 'success',
        };
      } catch (error: any) {
        logger.error('Kotak Neo TOTP login failed', { status: error.response?.status });
        throw new Error('Kotak Neo rejected TOTP authentication. Verify the configured broker credentials and enter the current code.');
      }
    });
  }

  // STEP 3: MPIN Validation
  async validateMpin(mpin: string, viewToken: string, viewSid: string, accessToken?: string): Promise<KotakValidateResponse> {
    const token = accessToken || this.accessToken || config.kotak.accessToken;
    const url = `${config.kotak.baseLoginUrl}/login/1.0/tradeApiValidate`;

    logger.info('Invoking Kotak Neo Trade API MPIN Validation');

    return kotakRateLimiter.enqueue(async () => {
      try {
        const response = await axios.post(
          url,
          { mpin },
          {
            headers: {
              'Authorization': token,
              'neo-fin-key': 'neotradeapi',
              'sid': viewSid,
              'Auth': viewToken,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = response.data?.result || response.data?.data || response.data;
        const baseUrl = data.baseUrl || 'https://mis.kotaksecurities.com';
        const parsedBaseUrl = new URL(baseUrl);
        if (parsedBaseUrl.protocol !== 'https:' || !parsedBaseUrl.hostname.endsWith('kotaksecurities.com')) {
          throw new Error('Kotak MPIN validation returned an invalid API base URL.');
        }
        const sessionToken = data.token || '';
        const sessionSid = data.sid || '';
        if (!sessionToken || !sessionSid) throw new Error('Kotak MPIN validation returned incomplete session details.');
        const result: KotakValidateResponse = {
          baseUrl,
          sessionToken,
          sessionSid,
          dataCenter: data.dataCenter || 'DC1',
          serverId: data.hsServerId || data.serverId || this.viewServerId || '',
          status: response.data?.status || 'success',
        };

        this.setSession(result.baseUrl, result.sessionToken, result.sessionSid, token, result.serverId, result.dataCenter);
        return result;
      } catch (error: any) {
        logger.error('Kotak Neo MPIN validation failed', { status: error.response?.status });
        this.clearSession();
        throw new Error('Kotak Neo rejected MPIN validation. Verify the configured broker credentials and try again.');
      }
    });
  }

  // GET Master Scrip File Paths
  async getScripMasterPaths(): Promise<Record<string, unknown>> {
    if (!this.isConnected()) throw new Error('Kotak session not active. Please authenticate via TOTP & MPIN.');
    const url = `${this.activeBaseUrl}/script-details/1.0/masterscrip/file-paths`;

    return kotakRateLimiter.enqueue(async () => {
      const res = await axios.get(url, {
        params: this.sessionQuery,
        headers: this.sessionHeaders,
      });
      return res.data;
    });
  }

  async searchScrip(params: ScripSearchParams): Promise<Record<string, unknown>[]> {
    if (!this.isConnected()) throw new Error('Kotak session not active. Please authenticate via TOTP & MPIN.');
    const segment = params.exchangeSegment.trim().toLowerCase();
    const supportedSegments = ['nse_cm', 'bse_cm', 'nse_fo', 'bse_fo', 'cde_fo', 'mcx_fo', 'bcs-fo'];
    if (!supportedSegments.includes(segment)) throw new Error('Unsupported Kotak exchange segment.');

    return kotakRateLimiter.enqueue(async () => {
      if (!this.scripMasterPaths) {
        const response = await axios.get(`${this.activeBaseUrl}/script-details/1.0/masterscrip/file-paths`, {
          params: this.sessionQuery,
          headers: this.sessionHeaders,
        });
        const data = response.data?.data || response.data?.result || response.data;
        this.scripMasterPaths = data.filesPaths || data.filePaths || null;
      }

      const fileUrl = Array.isArray(this.scripMasterPaths)
        ? this.scripMasterPaths.find(path => path.toLowerCase().includes(`/${segment}.csv`))
        : Object.entries(this.scripMasterPaths || {}).find(([name]) => name.toLowerCase().includes(segment))?.[1];
      if (typeof fileUrl !== 'string') throw new Error(`Kotak did not return a scrip master file for ${segment}.`);
      const parsedUrl = new URL(fileUrl);
      if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname.endsWith('kotaksecurities.com')) {
        throw new Error('Kotak returned an invalid scrip master download URL.');
      }

      const fileResponse = await axios.get(fileUrl, { responseType: 'text' });
      const records = parse(fileResponse.data, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];
      const needle = params.symbol?.trim().toLowerCase();
      const optionTypes = params.optionType?.split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
      const isDerivativeSegment = segment.endsWith('_fo') || segment.endsWith('-fo');
      if (!isDerivativeSegment && (params.expiry || params.strikePrice)) {
        throw new Error('Expiry and strike filters are only valid for derivative segments.');
      }
      const expiryRange = params.expiry?.split('-') || [];
      if (expiryRange.length > 2) throw new Error('Expiry must be DDMMMYYYY or a start-end date range.');
      const expiryStart = expiryRange[0] ? parseExpiryDate(expiryRange[0], segment) : undefined;
      const expiryEnd = expiryRange[1] ? parseExpiryDate(expiryRange[1], segment) : expiryStart;
      if (params.expiry && (expiryStart === undefined || expiryEnd === undefined || expiryStart > expiryEnd)) {
        throw new Error('Expiry must be a valid DDMMMYYYY date or ascending date range.');
      }
      const strikeFilter = params.strikePrice?.trim();
      const strikeRange = strikeFilter?.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
      const strikeOperator = strikeFilter?.match(/^([<>])(\d+(?:\.\d+)?)$/);
      const exactStrike = strikeFilter && !strikeRange && !strikeOperator ? Number(strikeFilter) : undefined;
      if (strikeFilter && (
        (strikeRange && Number(strikeRange[1]) > Number(strikeRange[2]))
        || (!strikeRange && !strikeOperator && (!Number.isFinite(exactStrike) || Number(exactStrike) <= 0))
        || (strikeOperator && Number(strikeOperator[2]) <= 0)
      )) {
        throw new Error('Strike must be a positive value, a min-max range, or a > / < threshold.');
      }
      const results = records.filter(record => {
        const symbolMatches = !needle || (record.pSymbolName || '').toLowerCase().includes(needle)
          || (record.pTrdSymbol || '').toLowerCase().includes(needle);
        const optionMatches = !optionTypes?.length || optionTypes.includes((record.pOptionType || '').toLowerCase());
        const recordExpiry = parseExpiryDate(record.pExpiryDate, segment);
        const expiryMatches = !params.expiry || (
          recordExpiry !== undefined && recordExpiry >= expiryStart! && recordExpiry <= expiryEnd!
        );
        const strike = Number(record['dStrikePrice;'] || record.dStrikePrice);
        let strikeMatches = true;
        if (strikeRange) {
          strikeMatches = strike >= Number(strikeRange[1]) * 100 && strike <= Number(strikeRange[2]) * 100;
        } else if (strikeOperator) {
          strikeMatches = strikeOperator[1] === '>'
            ? strike >= Number(strikeOperator[2]) * 100
            : strike <= Number(strikeOperator[2]) * 100;
        } else if (exactStrike !== undefined) {
          strikeMatches = strike === exactStrike * 100;
        }
        return symbolMatches && optionMatches && expiryMatches && strikeMatches;
      });

      return results.slice(0, 500);
    });
  }

  // GET Quotes
  async getQuotes(exchangeSegment: string, symbol: string, allowFallback: boolean = true): Promise<QuoteData> {
    const token = this.accessToken || config.kotak.accessToken;
    const query = `${exchangeSegment.toLowerCase()}|${symbol}`;
    const url = `${this.activeBaseUrl || config.kotak.baseLoginUrl}/script-details/1.0/quotes/neosymbol/${encodeURIComponent(query)}/all`;

    return kotakRateLimiter.enqueue(async () => {
      try {
        const res = await axios.get(url, {
          headers: { 'Authorization': token },
        });

        const raw = res.data?.result?.[0] || res.data?.data?.[0] || res.data?.[0] || {};
        return {
          symbol,
          tradingSymbol: raw.ts || `${symbol}-EQ`,
          exchangeSegment,
          ltp: parseFloat(raw.ltp || raw.lastPrice || '0.0'),
          change: parseFloat(raw.cng || raw.change || '0.0'),
          changePercent: parseFloat(raw.nc || raw.changePercent || '0.0'),
          open: parseFloat(raw.op || raw.open || '0.0'),
          high: parseFloat(raw.h || raw.high || '0.0'),
          low: parseFloat(raw.lo || raw.low || '0.0'),
          close: parseFloat(raw.c || raw.close || raw.previousClose || '0.0'),
          volume: parseInt(raw.v || raw.volume || '0', 10),
          bidPrice: parseFloat(raw.bp || raw.bidPrice || '0.0'),
          bidQty: parseInt(raw.bq || raw.bidQty || '0', 10),
          askPrice: parseFloat(raw.sp || raw.askPrice || '0.0'),
          askQty: parseInt(raw.sq || raw.askQty || '0', 10),
          fiftyTwoWeekHigh: parseFloat(raw.yh || raw.fiftyTwoWeekHigh || '0.0'),
          fiftyTwoWeekLow: parseFloat(raw.yl || raw.fiftyTwoWeekLow || '0.0'),
          upperCircuit: parseFloat(raw.ucl || raw.upperCircuit || '0.0'),
          lowerCircuit: parseFloat(raw.lcl || raw.lowerCircuit || '0.0'),
          lastUpdated: new Date().toISOString(),
        };
      } catch (err: any) {
        logger.warn('Kotak Neo quote request failed', {
          symbol,
          message: err instanceof Error ? err.message : 'Unknown broker quote error',
        });
        if (!allowFallback) throw new Error('Kotak Neo quote is unavailable; live order validation cannot continue.');
        logger.info('Using Yahoo Finance daily data as a non-live quote fallback.', { symbol });
        const { quote } = await yahooFinanceService.getSnapshot(symbol);
        return { ...quote, exchangeSegment };
      }
    });
  }

  async getQuotesBatch(instruments: QuoteInstrument[], quoteType: string = 'all'): Promise<Record<string, unknown>[]> {
    if (instruments.length === 0 || instruments.length > 50) {
      throw new Error('Quote requests must include between 1 and 50 instruments.');
    }
    const supportedSegments = ['nse_cm', 'bse_cm', 'nse_fo', 'bse_fo', 'cde_fo', 'mcx_fo', 'bcs-fo'];
    if (instruments.some(instrument => !supportedSegments.includes(instrument.exchangeSegment.toLowerCase())
      || !instrument.instrumentToken.trim())) {
      throw new Error('Each quote instrument must have a supported exchange segment and instrument token.');
    }
    const supportedTypes = ['all', 'depth', 'ohlc', 'ltp', 'oi', '52w', 'circuit_limits', 'scrip_details'];
    if (!supportedTypes.includes(quoteType.toLowerCase())) throw new Error('Unsupported Kotak quote type.');
    const query = instruments
      .map(({ exchangeSegment, instrumentToken }) => `${exchangeSegment}|${instrumentToken}`)
      .join(',');
    const url = `${this.activeBaseUrl || config.kotak.baseLoginUrl}/script-details/1.0/quotes/neosymbol/${encodeURIComponent(query)}/${quoteType.toLowerCase()}`;
    return kotakRateLimiter.enqueue(async () => {
      const response = await axios.get(url, {
        headers: { Authorization: this.accessToken || config.kotak.accessToken },
      });
      const data = response.data?.result || response.data?.data || response.data;
      if (!Array.isArray(data)) throw new Error('Kotak returned an unexpected quote response.');
      return data;
    });
  }

  // Pre-Order Check Margin
  async checkMargin(params: MarginCheckParams): Promise<MarginCheckResponse> {
    if (!this.isConnected()) throw new Error('Connect to Kotak Neo to validate live order margin.');

    const url = `${this.activeBaseUrl}/quick/user/check-margin`;
    return kotakRateLimiter.enqueue(async () => {
      const form = new URLSearchParams({
        exSeg: params.exchangeSegment,
        prc: String(params.price),
        prcTp: params.orderType || 'L',
        prod: params.product,
        qty: String(params.quantity),
        tok: params.instrumentToken || '',
        trnsTp: params.transactionType === 'BUY' ? 'B' : 'S',
        trgPrc: String(params.triggerPrice || 0),
        brkName: params.brokerName || 'KOTAK',
        brnchId: params.branchId || 'ONLINE',
        slAbsOrTks: params.stopLossType || '',
        slVal: String(params.stopLossValue || 0),
        sqrOffAbsOrTks: params.squareOffType || '',
        sqrOffVal: String(params.squareOffValue || 0),
        trailSL: params.trailingStopLoss || '',
        tSLTks: String(params.trailingStopLossValue || 0),
      });
      const res = await axios.post(url, form.toString(), {
        params: this.sessionQuery,
        headers: {
          ...this.sessionHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const data = res.data?.data || res.data?.result || res.data;
      const availableCash = Number(data.avlCash ?? data.availCash ?? 0);
      const availableMargin = Number(data.avlMrgn ?? data.availMargin ?? 0);
      const requiredMargin = Number(data.reqdMrgn ?? data.reqMargin ?? 0);
      const orderMargin = Number(data.ordMrgn ?? data.orderMargin ?? 0);
      if (![availableCash, availableMargin, requiredMargin, orderMargin].every(Number.isFinite)) {
        throw new Error('Kotak Neo returned an invalid margin response.');
      }
      return {
        availableCash,
        availableMargin,
        requiredMargin,
        orderMargin,
        sufficientFunds: String(data.rmsVldtd || '').toUpperCase() === 'OK' && Number(data.insufFund || 0) === 0,
        statusMessage: String(data.rmsVldtd || data.stat || 'Margin checked successfully'),
      };
    });
  }

  // Live Order Placement
  async placeOrder(params: OrderPlacementParams): Promise<{ orderNumber: string; status: string }> {
    if (!this.isConnected()) throw new Error('Live trading requires active Kotak session.');

    const url = `${this.activeBaseUrl}/quick/order/rule/ms/place`;
    const orderType = params.orderType === 'MARKET' ? 'MKT' : params.orderType === 'LIMIT' ? 'L' : params.orderType;
    const jData = {
      am: params.isAmo ? 'YES' : 'NO',
      dq: params.disclosedQuantity ?? 0,
      es: params.exchangeSegment,
      mp: params.marketProtection ?? 0,
      pc: params.product,
      pf: 'N',
      pr: params.price ?? 0,
      pt: orderType,
      qt: params.quantity,
      rt: params.validity || 'DAY',
      tp: params.triggerPrice ?? 0,
      ts: params.tradingSymbol,
      tt: params.transactionType === 'BUY' ? 'B' : 'S',
      ig: params.tag,
      tk: params.scripToken,
      sot: params.squareOffType,
      slt: params.stopLossType,
      slv: params.stopLossValue,
      sov: params.squareOffValue,
      lat: params.lastTradedPrice,
      tlt: params.trailingStopLoss,
      tsv: params.trailingStopLossValue,
      os: 'WEB',
    };

    const formData = new URLSearchParams();
    formData.append('jData', JSON.stringify(jData));

    return kotakRateLimiter.enqueue(async () => {
      const res = await axios.post(url, formData.toString(), {
        params: this.sessionQuery,
        headers: {
          ...this.sessionHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const data = res.data?.data || res.data?.result || res.data;
      const orderNumber = data.nOrdNo || data.nMsgId || data.orderId;
      if (!orderNumber || (data.stat && data.stat.toLowerCase() !== 'ok')) {
        throw new Error(data.errMsg || data.message || 'Kotak did not confirm order placement.');
      }
      return {
        orderNumber: String(orderNumber),
        status: String(data.status || data.stat || 'success'),
      };
    });
  }

  // Modify Order
  async modifyOrder(params: OrderModifyParams): Promise<{ orderNumber: string; status: string }> {
    if (!this.isConnected()) throw new Error('Live trading requires active Kotak session.');
    if (!params.scripToken) {
      const scrips = await this.searchScrip({
        exchangeSegment: params.exchangeSegment,
        symbol: params.tradingSymbol,
      });
      const scrip = scrips.find(item => item.pTrdSymbol === params.tradingSymbol);
      if (!scrip?.pSymbol) throw new Error(`Kotak scrip details were not found for ${params.tradingSymbol}.`);
      params.scripToken = String(scrip.pSymbol);
    }
    const url = `${this.activeBaseUrl}/quick/order/vr/modify`;
    const body = {
      on: params.orderNumber,
      es: params.exchangeSegment,
      pc: params.product,
      pr: params.price ?? 0,
      pt: params.orderType === 'MARKET' ? 'MKT' : params.orderType === 'LIMIT' ? 'L' : params.orderType,
      qt: params.quantity,
      rt: params.validity || 'DAY',
      ts: params.tradingSymbol,
      tt: params.transactionType === 'BUY' ? 'B' : params.transactionType === 'SELL' ? 'S' : undefined,
      tp: params.triggerPrice ?? 0,
      dq: params.disclosedQuantity ?? 0,
      dd: params.filledQuantity ?? 0,
      mp: params.marketProtection ?? 0,
      am: params.isAmo ? 'YES' : 'NO',
      tk: params.scripToken,
      pf: 'N',
    };

    return kotakRateLimiter.enqueue(async () => {
      const res = await axios.post(url, body, {
        params: this.sessionQuery,
        headers: {
          ...this.sessionHeaders,
          'Content-Type': 'application/json',
        },
      });
      const data = res.data?.data || res.data?.result || res.data;
      if (data.stat && data.stat.toLowerCase() !== 'ok') {
        throw new Error(data.errMsg || data.message || 'Kotak rejected the order modification.');
      }
      return {
        orderNumber: String(data.nOrdNo || data.nMsgId || params.orderNumber),
        status: String(data.status || data.stat || 'success'),
      };
    });
  }

  // Cancel Order
  async cancelOrder(params: OrderCancelParams): Promise<{ status: string }> {
    if (!this.isConnected()) throw new Error('Live trading requires active Kotak session.');
    if (params.verifyStatus) {
      const order = (await this.getOrderBook()).find(item => item.orderNumber === params.orderNumber);
      if (order && ['rejected', 'cancelled', 'complete', 'traded'].includes(order.status.toLowerCase())) {
        throw new Error(`Cannot cancel an order with status ${order.status}.`);
      }
    }
    const orderClass = params.orderClass || 'REGULAR';
    const endpoint = orderClass === 'COVER' ? 'quick/order/co/exit'
      : orderClass === 'BRACKET' ? 'quick/order/bo/exit' : 'quick/order/cancel';
    const url = `${this.activeBaseUrl}/${endpoint}`;
    const body = new URLSearchParams({
      on: params.orderNumber,
      am: params.amo ? 'YES' : 'NO',
    });

    return kotakRateLimiter.enqueue(async () => {
      const res = await axios.post(url, body.toString(), {
        params: this.sessionQuery,
        headers: {
          ...this.sessionHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const data = res.data?.data || res.data?.result || res.data;
      if (data.stat && data.stat.toLowerCase() !== 'ok') {
        throw new Error(data.errMsg || data.message || 'Kotak rejected the cancellation.');
      }
      return { status: String(data.status || data.stat || 'success') };
    });
  }

  // Order Book
  async getOrderBook(): Promise<OrderItem[]> {
    if (!this.isConnected()) throw new Error('Connect to Kotak Neo to retrieve live orders.');
    const url = `${this.activeBaseUrl}/quick/user/orders`;

    return kotakRateLimiter.enqueue(async () => {
      const res = await axios.get(url, {
        params: this.sessionQuery,
        headers: this.sessionHeaders,
      });
      const list = res.data?.result || res.data?.data || [];
      if (!Array.isArray(list)) throw new Error('Kotak returned an unexpected order book response.');
      return list.map((item: any) => ({
        orderNumber: item.nOrdNo || item.nMsgId || item.orderId || '',
        symbol: item.sym || item.ts?.split('-')[0] || '',
        tradingSymbol: item.ts || '',
        exchangeSegment: item.es || '',
        transactionType: item.tt === 'B' ? 'BUY' : 'SELL',
        orderType: normalizeOrderType(item.pt),
        product: item.pc || 'CNC',
        quantity: parseInt(item.qt || '0', 10),
        price: parseFloat(item.pr || '0'),
        averagePrice: parseFloat(item.avgPr || '0'),
        status: item.ordSt || item.st || item.status || 'UNKNOWN',
        validity: item.rt || 'DAY',
        rejectionReason: item.rejRsn || item.rejReason || '',
        orderTime: item.ordTime || item.exchOrdTime || '',
        isAmo: item.am === 'YES',
      }));
    });
  }

  async getOrderHistory(orderNumber: string): Promise<OrderItem[]> {
    if (!this.isConnected()) throw new Error('Connect to Kotak Neo to retrieve live order history.');
    const url = `${this.activeBaseUrl}/quick/order/history`;
    return kotakRateLimiter.enqueue(async () => {
      const body = new URLSearchParams({ nOrdNo: orderNumber });
      const response = await axios.post(url, body.toString(), {
        params: this.sessionQuery,
        headers: {
          ...this.sessionHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const list = response.data?.data || response.data?.result || response.data;
      if (!Array.isArray(list)) throw new Error('Kotak returned an unexpected order history response.');
      return list.map((item: any) => ({
        orderNumber: item.nOrdNo || item.nMsgId || item.orderId || orderNumber,
        symbol: item.sym || item.ts?.split('-')[0] || '',
        tradingSymbol: item.ts || '',
        exchangeSegment: item.es || '',
        transactionType: item.tt === 'B' ? 'BUY' : 'SELL',
        orderType: normalizeOrderType(item.pt),
        product: item.pc || '',
        quantity: parseInt(item.qt || '0', 10),
        price: parseFloat(item.pr || '0'),
        averagePrice: parseFloat(item.avgPr || '0'),
        status: item.ordSt || item.st || item.status || 'UNKNOWN',
        validity: item.rt || 'DAY',
        rejectionReason: item.rejRsn || '',
        orderTime: item.ordTime || item.exchOrdTime || '',
        isAmo: item.am === 'YES',
      }));
    });
  }

  // Trade Book
  async getTradeBook(): Promise<TradeItem[]> {
    if (!this.isConnected()) throw new Error('Connect to Kotak Neo to retrieve live trades.');
    const url = `${this.activeBaseUrl}/quick/user/trades`;

    return kotakRateLimiter.enqueue(async () => {
      const res = await axios.get(url, {
        params: this.sessionQuery,
        headers: this.sessionHeaders,
      });
      const list = res.data?.result || res.data?.data || [];
      if (!Array.isArray(list)) throw new Error('Kotak returned an unexpected trade book response.');
      return list.map((item: any) => ({
        orderNumber: item.nOrdNo || item.nMsgId || item.orderId || '',
        tradeId: item.trdId || item.nTrdNum || '',
        symbol: item.sym || item.ts?.split('-')[0] || '',
        tradingSymbol: item.ts || '',
        exchangeSegment: item.es || '',
        transactionType: item.tt === 'B' ? 'BUY' : 'SELL',
        quantity: parseInt(item.qt || '0', 10),
        averagePrice: parseFloat(item.avgPrc || item.pr || '0'),
        tradeTime: item.trdTime || item.flTrdTime || '',
      }));
    });
  }

  // Holdings - with retry logic
  async getHoldings(retries: number = 3): Promise<HoldingItem[]> {
    if (!this.isConnected()) throw new Error('Connect to Kotak Neo to retrieve live holdings.');
    const url = `${this.activeBaseUrl}/portfolio/v1/holdings`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await kotakRateLimiter.enqueue(async () => {
          const res = await axios.get(url, {
            params: this.sessionQuery,
            headers: this.sessionHeaders,
            timeout: 10000,
          });
          const responseData = res.data?.result || res.data?.data || res.data;
          const list = Array.isArray(responseData) ? responseData : responseData?.holdings;
          if (!Array.isArray(list)) throw new Error('Kotak returned an unexpected holdings response.');
          const holdings = list.map((item: any) => {
            const qty = Number(item.quantity ?? item.qty ?? 0);
            const avg = Number(item.averagePrice ?? item.avgPrice ?? 0);
            const ltp = Number(item.ltp ?? item.closingPrice ?? 0);
            const symbol = item.displaySymbol || item.symbol || item.ts?.split('-')[0] || '';
            const reportedCost = Number(item.holdingCost);
            const inv = Number.isFinite(reportedCost) ? reportedCost : qty * avg;
            const reportedValue = Number(item.mktValue);
            const cur = Number.isFinite(reportedValue) ? reportedValue : qty * ltp;
            return {
              symbol,
              tradingSymbol: item.ts || item.tradingSymbol || `${symbol}-EQ`,
              exchangeSegment: item.exchangeSegment || item.es || 'nse_cm',
              quantity: qty,
              averagePrice: avg,
              currentPrice: ltp,
              investedValue: inv,
              currentValue: cur,
              unrealizedPnL: cur - inv,
              unrealizedPnLPct: inv > 0 ? ((cur - inv) / inv) * 100 : 0,
            };
          });
          
          logger.info(`✓ Fetched ${holdings.length} holdings from Kotak API on attempt ${attempt}`);
          return holdings;
        });
      } catch (err: any) {
        const isLastAttempt = attempt === retries;
        const errorMsg = err.response?.data?.message || err.message;
        logger.warn(`Holdings API attempt ${attempt}/${retries} failed: ${errorMsg}`);
        
        if (isLastAttempt) {
          logger.error('Holdings API failed after all retries');
          throw new Error(`Kotak holdings request failed: ${errorMsg}`);
        }
        
        // Exponential backoff: wait 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
    
    throw new Error('Kotak holdings request did not complete.');
  }

  // Positions - with retry logic
  async getPositions(retries: number = 3): Promise<PositionItem[]> {
    if (!this.isConnected()) throw new Error('Connect to Kotak Neo to retrieve live positions.');
    const url = `${this.activeBaseUrl}/quick/user/positions`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await kotakRateLimiter.enqueue(async () => {
          const res = await axios.get(url, {
            params: this.sessionQuery,
            headers: this.sessionHeaders,
            timeout: 10000,
          });
          const responseData = res.data?.result || res.data?.data || res.data;
          const list = Array.isArray(responseData) ? responseData : responseData?.positions;
          if (!Array.isArray(list)) throw new Error('Kotak returned an unexpected positions response.');
          const positions = list.map((item: any) => ({
            symbol: item.symbol || item.ts?.split('-')[0] || '',
            tradingSymbol: item.ts || '',
            exchangeSegment: item.es || 'nse_cm',
            product: item.pc || 'CNC',
            netQuantity: parseInt(item.netQty || '0', 10),
            buyQty: parseInt(item.buyQty || '0', 10),
            buyValue: parseFloat(item.buyVal || '0'),
            sellQty: parseInt(item.sellQty || '0', 10),
            sellValue: parseFloat(item.sellVal || '0'),
            averagePrice: parseFloat(item.avgPrice || '0'),
            realizedPnL: parseFloat(item.realizedPnL || '0'),
          }));
          
          logger.info(`✓ Fetched ${positions.length} positions from Kotak API on attempt ${attempt}`);
          return positions;
        });
      } catch (err: any) {
        const isLastAttempt = attempt === retries;
        const errorMsg = err.response?.data?.message || err.message;
        logger.warn(`Positions API attempt ${attempt}/${retries} failed: ${errorMsg}`);
        
        if (isLastAttempt) {
          logger.error('Positions API failed after all retries');
          throw new Error(`Kotak positions request failed: ${errorMsg}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
      }
    }
    
    throw new Error('Kotak positions request did not complete.');
  }

  // Limits
  async getLimits(segment: string = 'ALL', exchange: string = 'ALL', product: string = 'ALL'): Promise<LimitsData> {
    if (!this.isConnected()) {
      throw new Error('Connect to Kotak Neo to retrieve live account funds.');
    }

    const url = `${this.activeBaseUrl}/quick/user/limits`;
    return kotakRateLimiter.enqueue(async () => {
      const form = new URLSearchParams({
        jData: JSON.stringify({
          seg: segment,
          exch: exchange,
          prod: product,
        }),
      });
      const res = await axios.post(url, form.toString(), {
        params: this.serverId ? { sId: this.serverId } : undefined,
        headers: {
          'Auth': this.sessionToken,
          'sid': this.sessionSid,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      const data = res.data?.data || res.data?.result || res.data;
      const amount = (...keys: string[]): number | undefined => {
        const value = keys.map(key => data[key]).find(value => value !== undefined && value !== null && value !== '');
        if (value === undefined) return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };
      const netFunds = amount('Net', 'net', 'availCash', 'availableCash');
      if (netFunds === undefined) {
        throw new Error('Kotak Neo returned an unexpected funds response without a valid net balance.');
      }

      return {
        netFunds,
        marginUsed: amount('MarginUsed', 'MarginUsedPrsnt', 'usedMargin'),
        collateralValue: amount('CollateralValue', 'collateralValue', 'collateral'),
        notionalCash: amount('NotionalCash', 'notionalCash'),
        exposureMargin: amount('ExposureMarginPrsnt', 'exposureMargin'),
        timestamp: data.TimeStamp && Number.isFinite(Number(data.TimeStamp))
          ? Number.isNaN(new Date(Number(data.TimeStamp)).getTime())
            ? undefined
            : new Date(Number(data.TimeStamp)).toISOString()
          : undefined,
        raw: data,
      };
    });
  }

  async logout(): Promise<void> {
    if (!this.isConnected()) {
      this.clearSession();
      return;
    }

    const url = `${this.activeBaseUrl}/apim/login/2.0/logout`;
    try {
      await kotakRateLimiter.enqueue(async () => {
        await axios.post(url, undefined, {
          headers: {
            ...this.sessionHeaders,
            Authorization: `Bearer ${this.accessToken || config.kotak.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      });
    } finally {
      this.clearSession();
    }
  }

}

export const kotakNeoBrokerService = new KotakNeoBrokerService();
