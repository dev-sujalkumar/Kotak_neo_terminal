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

export interface SentimentAnalysis {
  symbol: string;
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  score: number;
  confidence: number;
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  trend: string;
  newsCount: number;
  topFactors: string[];
  method?: string;
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

export interface CombinedSignal {
  symbol: string;
  signal: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  combinedScore: number;
  confidence: number;
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

export interface HoldingItem {
  id?: string;
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
  id?: string;
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

export interface AccountFunds {
  netFunds: number;
  marginUsed?: number;
  collateralValue?: number;
  notionalCash?: number;
  exposureMargin?: number;
  timestamp?: string;
  raw: Record<string, unknown>;
  paperBalance?: number;
  tradingMode?: 'PAPER' | 'LIVE';
}

export interface KotakScripSearchParams {
  exchangeSegment: 'nse_cm' | 'bse_cm' | 'nse_fo' | 'bse_fo' | 'cde_fo' | 'mcx_fo' | 'bcs-fo';
  symbol?: string;
  expiry?: string;
  optionType?: string;
  strikePrice?: string;
}

export interface KotakQuoteInstrument {
  exchangeSegment: string;
  instrumentToken: string;
}

export interface OrderItem {
  id?: string;
  orderNumber: string;
  symbol: string;
  tradingSymbol: string;
  exchangeSegment: string;
  transactionType: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M' | 'SP' | '2L' | '3L' | 'UNKNOWN';
  product: 'CNC' | 'MIS' | 'NRML' | 'CO' | 'BO' | 'MTF';
  quantity: number;
  price: number;
  averagePrice?: number;
  status: string;
  validity: string;
  rejectionReason?: string;
  orderTime: string;
  isAmo?: boolean;
}

export interface TradeItem {
  id?: string;
  orderNumber: string;
  tradeId?: string;
  symbol: string;
  tradingSymbol: string;
  exchangeSegment: string;
  transactionType: string;
  quantity: number;
  price?: number;
  averagePrice?: number;
  tradeTime: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  description?: string;
  source: string;
  url: string;
  publishedAt: string;
  symbol?: string;
  sentiment?: string;
  score?: number;
  positive_score?: number;
  negative_score?: number;
  neutral_score?: number;
  confidence?: number;
  category?: string;
}

export interface BacktestResult {
  id: string;
  symbol: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  cagr: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  totalTrades: number;
  tradeLogs: any[];
  equityCurve?: number[];
}

export interface CustomNewsAnalysisRequest {
  text: string;
  selectedCompany?: string;
  selectedTicker?: string;
}

export interface ExtractedPdfDocument {
  text: string;
  pageCount: number;
  wordCount: number;
  charCount: number;
  fileName?: string;
  fileSizeBytes?: number;
}

export interface CustomSentenceSentiment {
  sentence: string;
  sentiment: string;
  positive_probability: number;
  negative_probability: number;
  neutral_probability: number;
  score: number;
  confidence: number;
}

export interface CustomEntityMention {
  name: string;
  ticker?: string;
  type: string;
  sentiment: string;
  score: number;
  confidence: number;
  reasons: string[];
}

export interface CustomFinancialImpact {
  category: string;
  classification: string;
  explanation: string;
}

export interface CustomDetectedEvent {
  eventType: string;
  significance: string;
  explanation: string;
}

export interface CustomNewsAnalysisResult {
  sentiment: string;
  positive_probability: number;
  negative_probability: number;
  neutral_probability: number;
  confidence: number;
  normalized_score: number;
  wordCount: number;
  characterCount: number;
  paragraphCount: number;
  detectedEntities: CustomEntityMention[];
  primaryEntity?: CustomEntityMention;
  sentenceAnalysis: CustomSentenceSentiment[];
  sentimentTrajectory: number[];
  strongestPositiveStatements: string[];
  strongestNegativeStatements: string[];
  neutralStatements: string[];
  detectedEvents: CustomDetectedEvent[];
  financialImpacts: CustomFinancialImpact[];
  marketDirection: string;
  marketDirectionProbability: number;
  supportingEvidence: string[];
  negativeSignals: string[];
  positiveSignals: string[];
  importantUncertainties: string[];
  executiveSummary: string;
}
