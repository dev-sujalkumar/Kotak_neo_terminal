import axios from 'axios';
import {
  QuoteData,
  SentimentAnalysis,
  TechnicalIndicators,
  CombinedSignal,
  HoldingItem,
  PositionItem,
  OrderItem,
  TradeItem,
  NewsArticle,
  BacktestResult,
  AccountFunds,
  KotakQuoteInstrument,
  KotakScripSearchParams,
  CustomNewsAnalysisRequest,
  CustomNewsAnalysisResult,
} from '../types';

const API_BASE = '/api';

export const api = {
  // Auth
  getMe: async () => (await axios.get(`${API_BASE}/auth/me`)).data,
  switchTradingMode: async (mode: 'PAPER' | 'LIVE') => (await axios.post(`${API_BASE}/user/mode`, { mode })).data,

  // Kotak Connection
  autoConnectKotak: async (totp: string) =>
    (await axios.post(`${API_BASE}/broker/kotak/auto-connect`, { totp })).data,
  totpLogin: async (data: { mobileNumber: string; ucc: string; totp: string; accessToken?: string }) =>
    (await axios.post(`${API_BASE}/broker/kotak/login/totp`, data)).data,
  mpinValidate: async (data: { mpin: string; viewToken: string; viewSid: string; accessToken?: string }) =>
    (await axios.post(`${API_BASE}/broker/kotak/login/mpin`, data)).data,
  disconnectKotak: async () => (await axios.post(`${API_BASE}/broker/kotak/disconnect`)).data,
  getKotakStatus: async () => (await axios.get(`${API_BASE}/broker/kotak/status`)).data,
  searchKotakScrips: async (params: KotakScripSearchParams): Promise<Record<string, unknown>[]> =>
    (await axios.get(`${API_BASE}/broker/kotak/scrip-search`, { params })).data,
  getKotakQuotes: async (instruments: KotakQuoteInstrument[], quoteType: string = 'all') =>
    (await axios.post(`${API_BASE}/broker/kotak/quotes`, { instruments, quoteType })).data,

  // Market Data
  getInstruments: async () => (await axios.get(`${API_BASE}/market/instruments`)).data,
  getQuote: async (symbol: string, exchange: string = 'nse_cm'): Promise<QuoteData> =>
    (await axios.get(`${API_BASE}/market/quote/${symbol}?exchange=${exchange}`)).data,
  getCandles: async (symbol: string): Promise<any[]> => (await axios.get(`${API_BASE}/market/candles/${symbol}`)).data,
  getIndices: async () => (await axios.get(`${API_BASE}/market/indices`)).data,

  // Sentiment & News
  getSentiment: async (symbol: string): Promise<SentimentAnalysis> =>
    (await axios.get(`${API_BASE}/sentiment/${symbol}`)).data,
  getNews: async (symbol: string): Promise<NewsArticle[]> => (await axios.get(`${API_BASE}/news/${symbol}`)).data,
  analyzeCustomNews: async (payload: CustomNewsAnalysisRequest): Promise<CustomNewsAnalysisResult> =>
    (await axios.post(`${API_BASE}/sentiment/custom-analyze`, payload)).data,

  // Technical & Signals
  getTechnical: async (symbol: string, period: string = '1D'): Promise<TechnicalIndicators> =>
    (await axios.get(`${API_BASE}/technical/${symbol}?period=${period}`)).data,
  getSignal: async (symbol: string): Promise<CombinedSignal> => (await axios.get(`${API_BASE}/signal/${symbol}`)).data,

  // Portfolio
  getHoldings: async (): Promise<HoldingItem[]> => (await axios.get(`${API_BASE}/portfolio/holdings`)).data,
  getPositions: async (): Promise<PositionItem[]> => (await axios.get(`${API_BASE}/portfolio/positions`)).data,
  getLimits: async (filters?: { segment?: string; exchange?: string; product?: string }): Promise<AccountFunds> =>
    (await axios.get(`${API_BASE}/portfolio/limits`, { params: filters })).data,

  // Orders
  validateOrder: async (orderParams: any) => (await axios.post(`${API_BASE}/orders/validate`, orderParams)).data,
  placeOrder: async (orderParams: any, userConfirmed: boolean = true) =>
    (await axios.post(`${API_BASE}/orders`, { orderParams, userConfirmed })).data,
  getOrders: async (): Promise<OrderItem[]> => (await axios.get(`${API_BASE}/orders`)).data,
  getOrderHistory: async (orderNumber: string): Promise<OrderItem[]> =>
    (await axios.get(`${API_BASE}/orders/${encodeURIComponent(orderNumber)}/history`)).data,
  modifyLiveOrder: async (orderNumber: string, orderParams: Record<string, unknown>, userConfirmed: boolean) =>
    (await axios.patch(`${API_BASE}/orders/${encodeURIComponent(orderNumber)}`, { orderParams, userConfirmed })).data,
  cancelLiveOrder: async (orderNumber: string, orderParams: Record<string, unknown>, userConfirmed: boolean) =>
    (await axios.post(`${API_BASE}/orders/${encodeURIComponent(orderNumber)}/cancel`, { orderParams, userConfirmed })).data,
  connectKotakOrderFeed: (onMessage: (message: MessageEvent<string>) => void, onError: (event: Event) => void) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/broker/kotak/order-feed`);
    socket.addEventListener('message', onMessage);
    socket.addEventListener('error', onError);
    return socket;
  },
  getTrades: async (): Promise<TradeItem[]> => (await axios.get(`${API_BASE}/trades`)).data,

  // Watchlists
  getWatchlists: async () => (await axios.get(`${API_BASE}/watchlists`)).data,
  createWatchlist: async (name: string) => (await axios.post(`${API_BASE}/watchlists`, { name })).data,
  addToWatchlist: async (watchlistId: string, symbol: string) =>
    (await axios.post(`${API_BASE}/watchlists/${watchlistId}/items`, { symbol })).data,
  deleteWatchlistItem: async (watchlistId: string, itemId: string) =>
    (await axios.delete(`${API_BASE}/watchlists/${watchlistId}/items/${itemId}`)).data,
  deleteWatchlist: async (watchlistId: string) =>
    (await axios.delete(`${API_BASE}/watchlists/${watchlistId}`)).data,

  // Alerts
  getAlerts: async () => (await axios.get(`${API_BASE}/alerts`)).data,
  createAlert: async (data: { symbol: string; alertType: string; targetValue: number; condition: string }) =>
    (await axios.post(`${API_BASE}/alerts`, data)).data,
  deleteAlert: async (alertId: string) =>
    (await axios.delete(`${API_BASE}/alerts/${alertId}`)).data,
  toggleAlert: async (alertId: string) =>
    (await axios.patch(`${API_BASE}/alerts/${alertId}/toggle`)).data,

  // Backtesting
  runBacktest: async (params: any): Promise<BacktestResult> => (await axios.post(`${API_BASE}/backtest`, params)).data,
  getBacktestHistory: async () => (await axios.get(`${API_BASE}/backtest/history`)).data,
};
