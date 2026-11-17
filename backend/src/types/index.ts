export type TradingMode = 'MOCK' | 'PAPER' | 'LIVE';

export interface KotakLoginRequest {
  mobileNumber: string;
  ucc: string;
  totp: string;
}

export interface KotakLoginResponse {
  viewToken: string;
  viewSid: string;
  requestId: string;
  serverId?: string;
  status: string;
}

export interface KotakMpinValidateRequest {
  mpin: string;
}

export interface KotakValidateResponse {
  baseUrl: string;
  sessionToken: string;
  sessionSid: string;
  dataCenter: string;
  serverId?: string;
  status: string;
}

export interface MarketDepthLevel {
  price: number | string;
  quantity: number | string;
  orders: number | string;
}

export interface MarketDepth {
  buy: MarketDepthLevel[];
  sell: MarketDepthLevel[];
}

export interface QuoteData {
  symbol: string;
  tradingSymbol: string;
  exchangeSegment: string;
  ltp: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bidPrice: number;
  bidQty: number;
  askPrice: number;
  askQty: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  upperCircuit?: number;
  lowerCircuit?: number;
  lastUpdated: string;
  dataSource?: string;
  marketState?: string;
  currency?: string;
  depth?: MarketDepth;
  ohlc?: {
    open: number | string;
    high: number | string;
    low: number | string;
    close: number | string;
  };
  totalBuy?: number | string;
  totalSell?: number | string;
  lastTradedQuantity?: number | string;
  exchangeToken?: string;
  displaySymbol?: string;
}

export interface OrderPlacementParams {
  symbol: string;
  tradingSymbol: string; // ts
  exchangeSegment: string; // es (e.g. nse_cm)
  transactionType: 'BUY' | 'SELL'; // tt (B or S)
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M' | 'SP' | '2L' | '3L'; // pt
  product: 'CNC' | 'MIS' | 'NRML' | 'CO' | 'BO' | 'MTF'; // pc
  quantity: number; // qt
  price?: number; // pr
  triggerPrice?: number; // tp
  validity?: 'DAY' | 'IOC'; // rt
  disclosedQuantity?: number; // dq
  isAmo?: boolean; // am
  marketProtection?: number;
  tag?: string;
  scripToken?: string;
  squareOffType?: 'Absolute' | 'Ticks';
  stopLossType?: 'Absolute' | 'Ticks';
  stopLossValue?: number;
  squareOffValue?: number;
  lastTradedPrice?: number;
  trailingStopLoss?: 'Y' | 'N';
  trailingStopLossValue?: number;
}

export interface OrderModifyParams {
  orderNumber: string;
  tradingSymbol: string;
  exchangeSegment: string;
  transactionType?: 'BUY' | 'SELL';
  scripToken?: string;
  quantity: number;
  price?: number;
  triggerPrice?: number;
  product: string;
  orderType: string;
  validity?: string;
  disclosedQuantity?: number;
  marketProtection?: number;
  filledQuantity?: number;
  isAmo?: boolean;
}

export interface OrderCancelParams {
  orderNumber: string;
  tradingSymbol?: string;
  exchangeSegment?: string;
  amo?: boolean;
  verifyStatus?: boolean;
  orderClass?: 'REGULAR' | 'COVER' | 'BRACKET';
}

export interface MarginCheckParams {
  exchangeSegment: string;
  tradingSymbol: string;
  transactionType: 'BUY' | 'SELL';
  product: string;
  quantity: number;
  price: number;
  orderType?: string;
  instrumentToken?: string;
  triggerPrice?: number;
  brokerName?: string;
  branchId?: string;
  stopLossType?: 'Absolute' | 'Ticks';
  stopLossValue?: number;
  squareOffType?: 'Absolute' | 'Ticks';
  squareOffValue?: number;
  trailingStopLoss?: 'Y' | 'N';
  trailingStopLossValue?: number;
}

export interface MarginCheckResponse {
  availableCash: number;
  availableMargin: number;
  requiredMargin: number;
  orderMargin: number;
  sufficientFunds: boolean;
  statusMessage: string;
  totMrgnUsd?: number;
  mrgnUsd?: number;
  insufFund?: number;
  rmsVldtd?: string;
  stat?: string;
}

export interface HoldingItem {
  symbol: string;
  tradingSymbol: string;
  exchangeSegment: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  // Kotak v2 Rich Holdings response fields
  instrumentType?: string;
  sector?: string;
  instrumentToken?: number | string;
  commonScripCode?: string;
  instrumentName?: string;
  holdingCost?: number;
  closingPrice?: number;
  mktValue?: number;
  scripId?: string;
  isAlternateScrip?: string | boolean;
  unrealisedGainLoss?: number;
  sqGainLoss?: number;
  delGainLoss?: number;
  subTotal?: number;
  prevDayLtp?: number;
  subType?: string;
  instrumentStatus?: string;
  marketLot?: number;
  expiryDate?: string;
  optType?: string;
  strikePrice?: string;
  displaySymbol?: string;
  series?: string;
  exchangeIdentifier?: string;
  sellableQuantity?: number;
  securityType?: string;
  securitySubType?: string;
  logoUrl?: string;
  cmotCode?: string;
}

export interface PositionItem {
  symbol: string;
  tradingSymbol: string;
  exchangeSegment: string;
  product: string;
  netQuantity: number;
  buyQty: number;
  buyValue: number;
  sellQty: number;
  sellValue: number;
  averagePrice: number;
  realizedPnL: number;
  // Kotak v2 Position Book fields
  actId?: string;
  sym?: string;
  buyAmt?: string | number;
  sellAmt?: string | number;
  flBuyQty?: string | number;
  flSellQty?: string | number;
  brdLtQty?: number;
  posFlg?: string;
  sqrFlg?: string;
  lotSz?: string | number;
  stkPrc?: string;
  hsUpTm?: string;
  cfBuyAmt?: string;
  cfSellAmt?: string;
  cfBuyQty?: string;
  cfSellQty?: string;
}

export interface OrderItem {
  orderNumber: string;
  symbol: string;
  tradingSymbol: string;
  exchangeSegment: string;
  transactionType: string;
  orderType: string;
  product: string;
  quantity: number;
  price: number;
  averagePrice: number;
  status: string;
  validity: string;
  rejectionReason?: string;
  orderTime: string;
  isAmo: boolean;
}

export interface TradeItem {
  orderNumber: string;
  tradeId: string;
  symbol: string;
  tradingSymbol: string;
  exchangeSegment: string;
  transactionType: string;
  quantity: number;
  averagePrice: number;
  tradeTime: string;
}

export interface LimitsData {
  netFunds: number;
  marginUsed?: number;
  collateralValue?: number;
  notionalCash?: number;
  exposureMargin?: number;
  timestamp?: string;
  raw: Record<string, unknown>;
}

export interface ScripSearchParams {
  exchangeSegment: string;
  symbol?: string;
  expiry?: string;
  optionType?: string;
  strikePrice?: string;
}

export interface QuoteInstrument {
  exchangeSegment: string;
  instrumentToken: string;
}

export interface TechnicalIndicators {
  symbol: string;
  period: string;
  sma10: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema9: number;
  ema21: number;
  ema50: number;
  rsi14: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
    crossover: 'BULLISH' | 'BEARISH' | 'NONE';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  atr14: number;
  supportLevel: number;
  resistanceLevel: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
}

export interface SentimentAnalysis {
  symbol: string;
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  score: number; // -1.0 to +1.0
  confidence: number; // 0.0 to 1.0
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  trend: string;
  newsCount: number;
  topFactors: string[];
  method?: string;
}

export interface CombinedSignal {
  symbol: string;
  signal: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  combinedScore: number; // -100 to +100
  confidence: number; // 0 to 100%
  sentimentScore: number;
  technicalScore: number;
  momentumScore: number;
  weights: {
    sentiment: number;
    technical: number;
    momentum: number;
  };
  reasons: string[];
  warnings: string[];
  lastUpdated: string;
}
