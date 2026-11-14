import express from 'express';
import cors from 'cors';
import http from 'http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import WebSocket, { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { authMiddleware, AuthRequest } from './middleware/auth.js';
import { kotakNeoBrokerService } from './services/kotak/KotakNeoClient.js';
import { TechnicalAnalysisService } from './services/technical/TechnicalAnalysisService.js';
import { sentimentService } from './services/sentiment/SentimentService.js';
import { CombinedSignalEngine } from './services/signal/CombinedSignalEngine.js';
import { orderService } from './services/orders/OrderService.js';
import { backtestService } from './services/backtest/BacktestService.js';
import { portfolioSyncService } from './services/portfolio/PortfolioSyncService.js';
import { yahooFinanceService } from './services/market/YahooFinanceService.js';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const orderFeedWebSocketServer = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (requestUrl.pathname !== '/api/broker/kotak/order-feed') {
    socket.destroy();
    return;
  }
  if (!kotakNeoBrokerService.isConnected()) {
    socket.write('HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }

  orderFeedWebSocketServer.handleUpgrade(request, socket, head, clientSocket => {
    let upstream: WebSocket;
    try {
      upstream = kotakNeoBrokerService.connectOrderFeed();
    } catch (err) {
      logger.warn('Unable to open Kotak order feed', {
        message: err instanceof Error ? err.message : 'Unknown order feed error',
      });
      clientSocket.close(1011, 'Unable to open Kotak order feed');
      return;
    }

    const heartbeat = setInterval(() => {
      if (upstream.readyState === WebSocket.OPEN) upstream.send(JSON.stringify({ type: 'HB' }));
    }, 25_000);
    upstream.on('message', (data, isBinary) => {
      if (clientSocket.readyState === WebSocket.OPEN) clientSocket.send(data, { binary: isBinary });
    });
    upstream.on('error', () => {
      logger.warn('Kotak order feed socket reported an error.');
      if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close(1011, 'Kotak order feed error');
    });
    upstream.on('close', () => {
      if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close(1012, 'Kotak order feed disconnected');
    });
    clientSocket.on('close', () => {
      clearInterval(heartbeat);
      upstream.close();
    });
    clientSocket.on('error', () => {
      clearInterval(heartbeat);
      upstream.close();
    });
  });
});

function marketDataHttpStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : '';
  if (message.startsWith('Enter a valid stock symbol')) return 400;
  if (message.startsWith('No market data was found')) return 404;
  return 502;
}

app.use(cors({ origin: '*' }));
app.use(express.json());

// --- 1. AUTH & USER ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, tradingMode: user.tradingMode },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tradingMode: user.tradingMode,
        paperBalance: user.paperBalance,
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      tradingMode: user.tradingMode,
      paperBalance: user.paperBalance,
      isKotakConnected: kotakNeoBrokerService.isConnected(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/mode', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { mode } = req.body;
    if (!['PAPER', 'LIVE'].includes(mode)) {
      return res.status(400).json({ error: 'Mode must be PAPER or LIVE' });
    }

    if (mode === 'LIVE' && !kotakNeoBrokerService.isConnected()) {
      return res.status(400).json({
        error: 'Cannot switch to LIVE mode without active Kotak Neo connection. Please connect your Kotak account.'
      });
    }

    const updated = await prisma.user.update({
      where: { id: req.user?.id },
      data: { tradingMode: mode },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'TRADING_MODE_CHANGED',
        mode,
        details: `Trading mode switched to ${mode}`,
      }
    });

    res.json({ success: true, mode: updated.tradingMode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. KOTAK NEO BROKER INTEGRATION ROUTES ---
app.post('/api/broker/kotak/auto-connect', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { totp } = req.body || {};
    if (typeof totp !== 'string' || !/^\d{6}$/.test(totp)) {
      return res.status(400).json({ error: 'Enter the current six-digit authentication code.' });
    }

    const { accessToken, mobileNumber, ucc, mpin } = config.kotak;
    if (!accessToken || !mobileNumber || !ucc || !mpin) {
      logger.error('Kotak auto-connect requested without complete server-side credentials');
      return res.status(503).json({
        error: 'Broker credentials are not fully configured on the server. Check KOTAK_ACCESS_TOKEN, KOTAK_MOBILE_NUMBER, KOTAK_UCC, and KOTAK_MPIN in the backend .env file.',
      });
    }

    // Step 1: TOTP Login
    const loginRes = await kotakNeoBrokerService.loginWithTotp(
      mobileNumber,
      ucc,
      totp,
      accessToken
    );

    // Step 2: MPIN Validation
    const validateRes = await kotakNeoBrokerService.validateMpin(
      mpin,
      loginRes.viewToken,
      loginRes.viewSid,
      accessToken
    );

    await prisma.brokerSession.create({
      data: {
        userId: req.user!.id,
        sessionToken: validateRes.sessionToken,
        sessionSid: validateRes.sessionSid,
        baseUrl: validateRes.baseUrl,
        dataCenter: validateRes.dataCenter,
        isValid: true,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'BROKER_AUTO_CONNECTED',
        mode: req.user!.tradingMode,
        details: 'Kotak Neo session authenticated successfully',
      }
    });

    res.json({
      success: true,
      baseUrl: validateRes.baseUrl,
      dataCenter: validateRes.dataCenter,
      status: validateRes.status,
      message: 'Kotak Neo Trading account connected automatically using configured credentials!'
    });
  } catch (err: any) {
    logger.error('Kotak auto-connect failed');
    res.status(502).json({
      error: err.message || 'Kotak authentication failed. Verify the configured broker credentials and current TOTP code.',
    });
  }
});

app.post('/api/broker/kotak/login/totp', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { mobileNumber, ucc, totp, accessToken } = req.body;
    if (!mobileNumber || !ucc || !totp) {
      return res.status(400).json({ error: 'mobileNumber, ucc, and totp are required' });
    }

    const result = await kotakNeoBrokerService.loginWithTotp(mobileNumber, ucc, totp, accessToken);

    // Save temporary viewToken & viewSid in DB
    await prisma.brokerSession.create({
      data: {
        userId: req.user!.id,
        viewToken: result.viewToken,
        viewSid: result.viewSid,
        isValid: false,
      }
    });

    res.json({
      success: true,
      viewToken: result.viewToken,
      viewSid: result.viewSid,
      requestId: result.requestId,
      status: result.status,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/broker/kotak/login/mpin', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { mpin, viewToken, viewSid, accessToken } = req.body;
    if (!mpin || !viewToken || !viewSid) {
      return res.status(400).json({ error: 'mpin, viewToken, and viewSid are required' });
    }

    const result = await kotakNeoBrokerService.validateMpin(mpin, viewToken, viewSid, accessToken);

    await prisma.brokerSession.create({
      data: {
        userId: req.user!.id,
        sessionToken: result.sessionToken,
        sessionSid: result.sessionSid,
        baseUrl: result.baseUrl,
        dataCenter: result.dataCenter,
        isValid: true,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'BROKER_CONNECTED',
        mode: 'LIVE',
        details: 'Kotak Neo session authenticated successfully',
      }
    });

    // AUTO-SYNC PORTFOLIO AFTER SUCCESSFUL CONNECTION
    logger.info(`🔄 Auto-syncing portfolio for user ${req.user!.id}...`);
    const syncResult = await portfolioSyncService.syncFullPortfolio(req.user!.id);
    logger.info(`✅ Portfolio auto-synced: ${syncResult.holdings} holdings, ${syncResult.positions} positions`);

    res.json({
      success: true,
      baseUrl: result.baseUrl,
      dataCenter: result.dataCenter,
      status: result.status,
      message: 'Kotak Neo Trading account connected successfully!',
      sync: syncResult
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
})

app.post('/api/broker/kotak/disconnect', authMiddleware, async (req: AuthRequest, res) => {
  let logoutError: Error | null = null;
  try {
    await kotakNeoBrokerService.logout();
  } catch (err) {
    logoutError = err instanceof Error ? err : new Error('Kotak Neo logout failed.');
    logger.warn('Kotak logout request failed; local session will still be cleared.');
  }

  try {
    await prisma.brokerSession.updateMany({
      where: { userId: req.user?.id },
      data: { isValid: false }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'BROKER_DISCONNECTED',
        mode: 'PAPER',
        details: 'Kotak Neo session disconnected',
      }
    });

    if (logoutError) {
      return res.status(502).json({
        error: logoutError.message,
        connected: kotakNeoBrokerService.isConnected(),
      });
    }
    res.json({ success: true, message: 'Kotak Neo account disconnected.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/broker/kotak/status', authMiddleware, (req, res) => {
  res.json({
    connected: kotakNeoBrokerService.isConnected(),
    mode: config.brokerMode,
  });
});

app.get('/api/broker/kotak/scrip-search', authMiddleware, async (req, res) => {
  try {
    const exchangeSegment = typeof req.query.exchangeSegment === 'string' ? req.query.exchangeSegment : '';
    if (!exchangeSegment) return res.status(400).json({ error: 'exchangeSegment is required.' });
    const results = await kotakNeoBrokerService.searchScrip({
      exchangeSegment,
      symbol: typeof req.query.symbol === 'string' ? req.query.symbol : undefined,
      expiry: typeof req.query.expiry === 'string' ? req.query.expiry : undefined,
      optionType: typeof req.query.optionType === 'string' ? req.query.optionType : undefined,
      strikePrice: typeof req.query.strikePrice === 'string' ? req.query.strikePrice : undefined,
    });
    res.json(results);
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Kotak scrip search failed.' });
  }
});

app.get('/api/broker/kotak/scrip-master', authMiddleware, async (_req, res) => {
  try {
    res.json(await kotakNeoBrokerService.getScripMasterPaths());
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Kotak scrip master lookup failed.' });
  }
});

app.post('/api/broker/kotak/quotes', authMiddleware, async (req, res) => {
  try {
    const { instruments, quoteType } = req.body || {};
    if (!Array.isArray(instruments) || instruments.some((instrument: any) =>
      typeof instrument?.exchangeSegment !== 'string' || typeof instrument?.instrumentToken !== 'string')) {
      return res.status(400).json({ error: 'instruments must be an array of exchangeSegment/instrumentToken pairs.' });
    }
    const quotes = await kotakNeoBrokerService.getQuotesBatch(instruments, quoteType);
    res.json(quotes);
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Kotak quote request failed.' });
  }
});

// --- 3. MARKET DATA ROUTES ---
app.get('/api/market/instruments', authMiddleware, async (req, res) => {
  try {
    const instruments = await prisma.instrument.findMany({
      take: 50,
      orderBy: { symbol: 'asc' }
    });
    res.json(instruments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/market/quote/:symbol', authMiddleware, async (req, res) => {
  try {
    const { quote } = await yahooFinanceService.getSnapshot(req.params.symbol);
    res.json(quote);
  } catch (err: any) {
    logger.warn('Stock quote lookup failed', {
      symbol: req.params.symbol,
      message: err instanceof Error ? err.message : 'Unknown market data error',
    });
    res.status(marketDataHttpStatus(err)).json({ error: err.message || 'Unable to load market data for this symbol.' });
  }
});

app.get('/api/market/candles/:symbol', authMiddleware, async (req, res) => {
  try {
    const { candles } = await yahooFinanceService.getSnapshot(req.params.symbol);
    res.json(candles);
  } catch (err: any) {
    logger.warn('Historical market data lookup failed', {
      symbol: req.params.symbol,
      message: err instanceof Error ? err.message : 'Unknown market data error',
    });
    res.status(marketDataHttpStatus(err)).json({ error: err.message || 'Unable to load historical market data for this symbol.' });
  }
});

app.get('/api/market/indices', authMiddleware, async (req, res) => {
  try {
    const indexSymbols = [
      { name: 'NIFTY 50', symbol: '^NSEI' },
      { name: 'NIFTY BANK', symbol: '^NSEBANK' },
      { name: 'SENSEX', symbol: '^BSESN' },
    ];
    const indices = await Promise.all(indexSymbols.map(async ({ name, symbol }) => {
      const { quote } = await yahooFinanceService.getSnapshot(symbol);
      return {
        name,
        symbol: quote.symbol,
        ltp: quote.ltp,
        change: quote.change,
        changePercent: quote.changePercent,
        status: quote.marketState,
        lastUpdated: quote.lastUpdated,
        dataSource: quote.dataSource,
      };
    }));
    res.json(indices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. SENTIMENT & NEWS ROUTES ---
app.get('/api/sentiment/:symbol', authMiddleware, async (req, res) => {
  try {
    const sentiment = await sentimentService.getSentimentForSymbol(req.params.symbol);
    res.json(sentiment);
  } catch (err: any) {
    logger.warn('News sentiment lookup failed', {
      symbol: req.params.symbol,
      message: err instanceof Error ? err.message : 'Unknown sentiment error',
    });
    res.status(502).json({ error: err.message || 'Unable to load news sentiment for this symbol.' });
  }
});

app.get('/api/news/:symbol', authMiddleware, async (req, res) => {
  try {
    const articles = await sentimentService.getNewsForSymbol(req.params.symbol);
    res.json(articles);
  } catch (err: any) {
    logger.warn('Stock news lookup failed', {
      symbol: req.params.symbol,
      message: err instanceof Error ? err.message : 'Unknown news error',
    });
    const status = err.message?.startsWith('Enter a valid stock symbol') ? 400 : 502;
    res.status(status).json({ error: err.message || 'Unable to load news for this symbol.' });
  }
});

app.get('/api/sentiment/:symbol/correlation', authMiddleware, async (req, res) => {
  try {
    const correlation = await sentimentService.getSentimentCorrelation(req.params.symbol);
    res.json(correlation);
  } catch (err: any) {
    logger.warn('Sentiment correlation calculation failed', {
      symbol: req.params.symbol,
      message: err instanceof Error ? err.message : 'Unknown correlation error',
    });
    res.status(502).json({ error: err.message || 'Unable to calculate sentiment correlation.' });
  }
});

app.get('/api/sentiment/:symbol/prediction', authMiddleware, async (req, res) => {
  try {
    const prediction = await sentimentService.getMarketPrediction(req.params.symbol);
    res.json(prediction);
  } catch (err: any) {
    logger.warn('ML market prediction failed', {
      symbol: req.params.symbol,
      message: err instanceof Error ? err.message : 'Unknown prediction error',
    });
    res.status(502).json({ error: err.message || 'Unable to generate market prediction.' });
  }
});

app.post('/api/sentiment/custom-analyze', authMiddleware, async (req, res) => {
  try {
    const { text, selectedCompany, selectedTicker } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Please enter financial news or article text to analyze.' });
    }
    const result = await sentimentService.analyzeCustomNews({
      text: text.trim(),
      selectedCompany: selectedCompany ? String(selectedCompany).trim() : undefined,
      selectedTicker: selectedTicker ? String(selectedTicker).trim() : undefined,
    });
    res.json(result);
  } catch (err: any) {
    logger.warn('Custom news analysis route failed', {
      message: err instanceof Error ? err.message : 'Unknown custom news error',
    });
    res.status(502).json({ error: err.message || 'Failed to analyze custom news text.' });
  }
});

// --- 5. TECHNICAL ANALYSIS & SIGNAL ROUTES ---
app.get('/api/technical/:symbol', authMiddleware, async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const period = (req.query.period as string) || '1D';
    const { candles } = await yahooFinanceService.getSnapshot(symbol);
    const technical = TechnicalAnalysisService.calculateIndicators(symbol, period, candles);
    res.json(technical);
  } catch (err: any) {
    logger.warn('Technical analysis lookup failed', {
      symbol: req.params.symbol,
      message: err instanceof Error ? err.message : 'Unknown technical analysis error',
    });
    res.status(marketDataHttpStatus(err)).json({ error: err.message || 'Unable to calculate technical indicators for this symbol.' });
  }
});

app.get('/api/signal/:symbol', authMiddleware, async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const { quote, candles } = await yahooFinanceService.getSnapshot(symbol);
    const technical = TechnicalAnalysisService.calculateIndicators(symbol, '1D', candles);
    const sentiment = await sentimentService.getSentimentForSymbol(symbol);

    const signal = CombinedSignalEngine.generateSignal(symbol, quote, sentiment, technical);
    res.json(signal);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 6. PORTFOLIO ROUTES ---
app.get('/api/portfolio/holdings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (user?.tradingMode === 'LIVE') {
      if (!kotakNeoBrokerService.isConnected()) {
        return res.status(503).json({ error: 'Connect Kotak Neo to retrieve live Demat holdings.' });
      }
      return res.json(await kotakNeoBrokerService.getHoldings());
    }

    const holdings = await prisma.holding.findMany({
      where: { userId: req.user?.id },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(holdings);
  } catch (err: any) {
    logger.error(`Holdings fetch error: ${err.message}`);
    const upstreamStatus = err.response?.status;
    if (upstreamStatus === 401 || upstreamStatus === 403) {
      kotakNeoBrokerService.clearSession();
      return res.status(503).json({ error: 'Kotak Neo rejected the holdings request. Reconnect your broker account and try again.' });
    }
    res.status(typeof upstreamStatus === 'number' ? 502 : 500).json({
      error: typeof upstreamStatus === 'number'
        ? `Kotak Neo holdings service returned HTTP ${upstreamStatus}.`
        : err.message,
    });
  }
});

app.get('/api/portfolio/positions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (user?.tradingMode === 'LIVE') {
      if (!kotakNeoBrokerService.isConnected()) {
        return res.status(503).json({ error: 'Connect Kotak Neo to retrieve live positions.' });
      }
      return res.json(await kotakNeoBrokerService.getPositions());
    }

    const positions = await prisma.position.findMany({
      where: { userId: req.user?.id },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(positions);
  } catch (err: any) {
    logger.error(`Positions fetch error: ${err.message}`);
    const upstreamStatus = err.response?.status;
    if (upstreamStatus === 401 || upstreamStatus === 403) {
      kotakNeoBrokerService.clearSession();
      return res.status(503).json({ error: 'Kotak Neo rejected the positions request. Reconnect your broker account and try again.' });
    }
    res.status(typeof upstreamStatus === 'number' ? 502 : 500).json({
      error: typeof upstreamStatus === 'number'
        ? `Kotak Neo positions service returned HTTP ${upstreamStatus}.`
        : err.message,
    });
  }
});

// NEW ENDPOINT: Manual portfolio sync
app.post('/api/portfolio/sync', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (!kotakNeoBrokerService.isConnected()) {
      return res.status(400).json({ error: 'Kotak broker not connected' });
    }

    const result = await portfolioSyncService.syncFullPortfolio(req.user!.id);
    res.json({
      success: true,
      message: `Portfolio synced: ${result.holdings} holdings, ${result.positions} positions`,
      data: result
    });
  } catch (err: any) {
    logger.error(`Portfolio sync error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// NEW ENDPOINT: Get sync status
app.get('/api/portfolio/sync-status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const holdings = await prisma.holding.findMany({
      where: { userId: req.user?.id },
      select: { symbol: true, updatedAt: true }
    });

    const positions = await prisma.position.findMany({
      where: { userId: req.user?.id },
      select: { symbol: true, product: true, updatedAt: true }
    });

    res.json({
      holdingsCount: holdings.length,
      positionsCount: positions.length,
      lastHoldingsUpdate: holdings[0]?.updatedAt || null,
      lastPositionsUpdate: positions[0]?.updatedAt || null,
      isKotakConnected: kotakNeoBrokerService.isConnected(),
      message: 'Sync status retrieved'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/portfolio/limits', authMiddleware, async (req: AuthRequest, res) => {
  if (!kotakNeoBrokerService.isConnected()) {
    return res.status(503).json({ error: 'Connect Kotak Neo to retrieve live account funds.' });
  }

  const segment = typeof req.query.segment === 'string' ? req.query.segment.toUpperCase() : 'ALL';
  const exchange = typeof req.query.exchange === 'string' ? req.query.exchange.toUpperCase() : 'ALL';
  const product = typeof req.query.product === 'string' ? req.query.product.toUpperCase() : 'ALL';
  if (!['CASH', 'CUR', 'FO', 'ALL'].includes(segment)
    || !['NSE', 'BSE', 'ALL'].includes(exchange)
    || !['CNC', 'MIS', 'NRML', 'ALL'].includes(product)) {
    return res.status(400).json({ error: 'Invalid funds filter. Check segment, exchange, and product values.' });
  }

  try {
    const limits = await kotakNeoBrokerService.getLimits(segment, exchange, product);
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    res.json({
      ...limits,
      tradingMode: user?.tradingMode || 'PAPER',
    });
  } catch (err: any) {
    const upstreamStatus = err.response?.status;
    logger.error('Kotak Neo funds request failed', {
      upstreamStatus,
      code: err.code,
    });

    if (upstreamStatus === 401 || upstreamStatus === 403) {
      kotakNeoBrokerService.clearSession();
      return res.status(503).json({
        error: 'Kotak Neo rejected the funds request. Reconnect your broker account and try again.',
      });
    }

    if (typeof upstreamStatus === 'number') {
      return res.status(502).json({
        error: upstreamStatus >= 500
          ? `Kotak Neo funds service returned HTTP ${upstreamStatus}. Please retry shortly; no live balance was returned.`
          : `Kotak Neo rejected the funds request (HTTP ${upstreamStatus}).`,
      });
    }

    res.status(500).json({ error: err.message });
  }
});

// --- 7. ORDER MANAGEMENT ROUTES ---
app.post('/api/orders/validate', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const validation = await orderService.validateOrder(req.user!.id, req.body);
    res.json(validation);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { orderParams, userConfirmed } = req.body;
    if (!userConfirmed) {
      return res.status(400).json({ error: 'Order placement requires explicit user confirmation.' });
    }

    const result = await orderService.executeOrder(req.user!.id, orderParams, true);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (user?.tradingMode === 'LIVE' && kotakNeoBrokerService.isConnected()) {
      const liveOrders = await kotakNeoBrokerService.getOrderBook();
      return res.json(liveOrders);
    }

    const paperOrders = await prisma.paperOrder.findMany({
      where: { userId: req.user?.id },
      orderBy: { orderTime: 'desc' }
    });
    res.json(paperOrders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:orderNumber/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (user?.tradingMode !== 'LIVE' || !kotakNeoBrokerService.isConnected()) {
      return res.status(409).json({ error: 'Live order history requires LIVE mode and an active Kotak Neo connection.' });
    }
    res.json(await kotakNeoBrokerService.getOrderHistory(req.params.orderNumber));
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Kotak order history request failed.' });
  }
});

app.patch('/api/orders/:orderNumber', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.body?.userConfirmed !== true) {
      return res.status(400).json({ error: 'Order modification requires explicit user confirmation.' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (user?.tradingMode !== 'LIVE' || !kotakNeoBrokerService.isConnected()) {
      return res.status(409).json({ error: 'Modifying live orders requires LIVE mode and an active Kotak Neo connection.' });
    }
    if (!req.body.orderParams || typeof req.body.orderParams !== 'object') {
      return res.status(400).json({ error: 'orderParams are required.' });
    }
    const result = await kotakNeoBrokerService.modifyOrder({
      ...req.body.orderParams,
      orderNumber: req.params.orderNumber,
    });
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Kotak order modification failed.' });
  }
});

app.post('/api/orders/:orderNumber/cancel', authMiddleware, async (req: AuthRequest, res) => {
  try {
    if (req.body?.userConfirmed !== true) {
      return res.status(400).json({ error: 'Order cancellation requires explicit user confirmation.' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (user?.tradingMode !== 'LIVE' || !kotakNeoBrokerService.isConnected()) {
      return res.status(409).json({ error: 'Cancelling live orders requires LIVE mode and an active Kotak Neo connection.' });
    }
    if (!req.body.orderParams || typeof req.body.orderParams !== 'object') {
      return res.status(400).json({ error: 'orderParams are required.' });
    }
    const result = await kotakNeoBrokerService.cancelOrder({
      ...req.body.orderParams,
      orderNumber: req.params.orderNumber,
    });
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: err.message || 'Kotak order cancellation failed.' });
  }
});

app.get('/api/trades', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (user?.tradingMode === 'LIVE' && kotakNeoBrokerService.isConnected()) {
      const liveTrades = await kotakNeoBrokerService.getTradeBook();
      return res.json(liveTrades);
    }

    const paperTrades = await prisma.paperTrade.findMany({
      where: { userId: req.user?.id },
      orderBy: { tradeTime: 'desc' }
    });
    res.json(paperTrades);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 8. WATCHLIST ROUTES ---
app.get('/api/watchlists', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId: req.user?.id },
      include: {
        items: {
          include: { instrument: true }
        }
      }
    });
    res.json(watchlists);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/watchlists', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    const watchlist = await prisma.watchlist.create({
      data: { userId: req.user!.id, name }
    });
    res.json(watchlist);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/watchlists/:id/items', authMiddleware, async (req, res) => {
  try {
    const { symbol } = req.body;
    const instrument = await prisma.instrument.findFirst({
      where: { symbol: symbol.toUpperCase() }
    });
    if (!instrument) {
      return res.status(404).json({ error: `Instrument for symbol ${symbol} not found.` });
    }

    const item = await prisma.watchlistItem.create({
      data: {
        watchlistId: req.params.id,
        instrumentId: instrument.id,
      },
      include: { instrument: true }
    });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 9. ALERTS ROUTES ---
app.get('/api/alerts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { userId: req.user?.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(alerts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alerts', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { symbol, alertType, targetValue, condition } = req.body;
    const alert = await prisma.alert.create({
      data: {
        userId: req.user!.id,
        symbol: symbol.toUpperCase(),
        alertType,
        targetValue: parseFloat(targetValue),
        condition,
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'ALERT_CREATED',
        symbol: symbol.toUpperCase(),
        mode: 'SYSTEM',
        details: `Alert set for ${symbol} when ${alertType} ${condition} ${targetValue}`,
      }
    });

    res.json(alert);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- 10. BACKTESTING ROUTES ---
app.post('/api/backtest', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await backtestService.runBacktest(req.user!.id, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/backtest/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const history = await prisma.backtest.findMany({
      where: { userId: req.user?.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
const PORT = config.port;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Kotak Neo Trading & Sentiment Backend Server running on http://localhost:${PORT}`);
  logger.info(`Mode: ${config.nodeEnv} | Broker Mode: ${config.brokerMode}`);
});
