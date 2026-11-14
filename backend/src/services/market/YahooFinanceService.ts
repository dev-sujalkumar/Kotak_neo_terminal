import axios from 'axios';
import { QuoteData } from '../../types/index.js';
import { Candle } from '../technical/TechnicalAnalysisService.js';

interface YahooChartResponse {
  chart?: {
    error?: { description?: string } | null;
    result?: Array<{
      meta: {
        currency?: string;
        exchangeName?: string;
        symbol: string;
        longName?: string;
        shortName?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        marketState?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

interface StockSnapshot {
  quote: QuoteData;
  candles: Candle[];
  companyName: string;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; snapshot: StockSnapshot }>();
const pending = new Map<string, Promise<StockSnapshot>>();

function normalizeSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase();
  if (['^NSEI', '^NSEBANK', '^BSESN'].includes(normalized)) return normalized;
  if (!/^[A-Z0-9][A-Z0-9&._-]{0,19}$/.test(normalized)) {
    throw new Error('Enter a valid stock symbol using letters and numbers only.');
  }
  return normalized.endsWith('.NS') || normalized.endsWith('.BO')
    ? normalized
    : `${normalized}.NS`;
}

export class YahooFinanceService {
  public async getSnapshot(inputSymbol: string): Promise<StockSnapshot> {
    const yahooSymbol = normalizeSymbol(inputSymbol);
    const cached = cache.get(yahooSymbol);
    if (cached && cached.expiresAt > Date.now()) return cached.snapshot;

    const existingRequest = pending.get(yahooSymbol);
    if (existingRequest) return existingRequest;

    const request = this.fetchSnapshot(yahooSymbol);
    pending.set(yahooSymbol, request);
    try {
      const snapshot = await request;
      cache.set(yahooSymbol, { snapshot, expiresAt: Date.now() + CACHE_TTL_MS });
      return snapshot;
    } finally {
      pending.delete(yahooSymbol);
    }
  }

  private async fetchSnapshot(yahooSymbol: string): Promise<StockSnapshot> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`;
    let response;
    try {
      response = await axios.get<YahooChartResponse>(url, {
        params: { range: '1y', interval: '1d', events: 'history' },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10_000,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`No market data was found for ${yahooSymbol}. Check the stock symbol and exchange.`);
      }
      throw error;
    }

    const result = response.data.chart?.result?.[0];
    if (!result) {
      throw new Error(`No market data was found for ${yahooSymbol}. Check the stock symbol and exchange.`);
    }

    const quoteSeries = result.indicators?.quote?.[0];
    const timestamps = result.timestamp || [];
    const candles = timestamps.flatMap((timestamp, index) => {
      const open = quoteSeries?.open?.[index];
      const high = quoteSeries?.high?.[index];
      const low = quoteSeries?.low?.[index];
      const close = quoteSeries?.close?.[index];
      if (open == null || high == null || low == null || close == null) return [];
      return [{
        timestamp: new Date(timestamp * 1000).toISOString(),
        open,
        high,
        low,
        close,
        volume: quoteSeries?.volume?.[index] ?? 0,
      }];
    });

    const meta = result.meta;
    const latestCandle = candles[candles.length - 1];
    const ltp = meta.regularMarketPrice ?? latestCandle?.close;
    if (ltp == null || !Number.isFinite(ltp) || candles.length < 20) {
      throw new Error(`Yahoo Finance returned incomplete market history for ${yahooSymbol}.`);
    }

    const previousCandle = candles[candles.length - 2];
    const close = previousCandle?.close ?? meta.previousClose ?? latestCandle.close;
    const change = ltp - close;
    const changePercent = close ? (change / close) * 100 : 0;

    return {
      companyName: meta.longName || meta.shortName || yahooSymbol,
      candles,
      quote: {
        symbol: yahooSymbol.replace(/\.(NS|BO)$/, ''),
        tradingSymbol: yahooSymbol,
        exchangeSegment: meta.exchangeName || 'NSE',
        ltp,
        change,
        changePercent,
        open: latestCandle.open,
        high: latestCandle.high,
        low: latestCandle.low,
        close,
        volume: latestCandle.volume,
        bidPrice: 0,
        bidQty: 0,
        askPrice: 0,
        askQty: 0,
        fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
        lastUpdated: meta.regularMarketTime
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : latestCandle.timestamp,
        dataSource: 'Yahoo Finance',
        marketState: meta.marketState || 'UNKNOWN',
        currency: meta.currency || 'INR',
      },
    };
  }
}

export const yahooFinanceService = new YahooFinanceService();
