# Complete System Architecture & Technical Specification
## Stock Market Sentiment Analysis, Market Intelligence, Portfolio Management, and Kotak Neo Trading Platform

---

### 1. COMPLETE ARCHITECTURE

```
                                ┌──────────────────────────────────────────────┐
                                │        React / Vite Financial Terminal       │
                                │   (Tailwind CSS, Recharts, Zustand, WS)      │
                                └──────────────────────┬───────────────────────┘
                                                       │ REST API / WebSockets
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │          Express / TypeScript Backend        │
                                │    (Auth, Signal Engine, Portfolio, Risk)    │
                                └──────┬───────────────────┬───────────────┬───┘
                                       │                   │               │
            ┌──────────────────────────┘                   │               └──────────────────────────┐
            ▼                                              ▼                                          ▼
┌──────────────────────┐                       ┌──────────────────────┐                   ┌──────────────────────┐
│  Python NLP Service  │                       │  Kotak Neo Client    │                   │   SQLite / Prisma    │
│ (FastAPI + FinBERT)  │                       │  (Service Layer)     │                   │  (Database & Cache)  │
└──────────────────────┘                       └──────────┬───────────┘                   └──────────────────────┘
                                                          │ REST / WebSockets
                                                          ▼
                                               ┌──────────────────────┐
                                               │ Kotak Securities API │
                                               └──────────────────────┘
```

---

### 2. TECHNOLOGY STACK JUSTIFICATION

1. **Frontend: Vite + React 18 + TypeScript + Tailwind CSS + Recharts + Lucide Icons + Zustand + TanStack Query**
   - *Vite & React*: Ultra-fast HMR and low latency rendering required for real-time market depth and chart updates.
   - *Tailwind CSS*: Dark mode terminal styling (`#0f172a`, `#1e293b`, `#06b6d4`, `#10b981`, `#ef4444`) with high-density grid layouts.
   - *Recharts & Custom Technical Canvas*: Dynamic candlestick charts, volume histograms, indicator overlays (RSI, MACD, Bollinger Bands).
   - *Zustand*: Lightweight state management for active trading mode (PAPER vs LIVE), selected symbol, real-time tick store, and order book states.

2. **Backend: Node.js + Express + TypeScript + Prisma ORM + WebSockets (`ws`)**
   - *Express + TypeScript*: Strong typing across all API DTOs and Broker Service interfaces, ensuring zero untyped API leaks.
   - *Prisma ORM*: Schema safety, migrations, and database abstraction over SQLite/PostgreSQL.
   - *WebSocket Server*: Streams live ticks and order updates directly to connected frontend clients without exposing Kotak session tokens.
   - *Rate Limiter / Queue*: Built-in token-bucket rate limiter enforcing Kotak's ~10 req/sec limit.

3. **NLP Engine: Python 3.11 + FastAPI + Transformers / FinBERT / TextBlob / VADER + pandas + NumPy**
   - *FastAPI*: High-performance asynchronous REST microservice.
   - *FinBERT / Financial NLP*: Contextual sentiment score classification (`positive`, `neutral`, `negative`) with confidence metrics, coupled with keyword and entity extraction for Indian stock tickers.

4. **Database: SQLite / PostgreSQL via Prisma ORM**
   - Zero-dependency local persistence for development and college demos, easily swapped to PostgreSQL in production via `.env` provider config.

---

### 3. DATABASE SCHEMA & ENTITIES

- **User**: Authentication, settings, trading mode preference (`PAPER` | `LIVE`).
- **BrokerAccount**: Kotak UCC, registered mobile number, encrypted access token, environment config.
- **BrokerSession**: Active Kotak session token, session SID, baseUrl, dataCenter, viewToken, viewSid, expiration timestamp.
- **Instrument**: Master scrip database (pSymbol, pExchSeg, pTrdSymbol, lLotSize, lExpiryDate, tickSize, instrumentToken).
- **NewsArticle**: News headline, content, source, url, publishedAt, company, symbol, content hash.
- **SentimentResult**: Article sentiment score (-1.0 to +1.0), confidence (0.0 to 1.0), positive/neutral/negative probabilities.
- **Watchlist & WatchlistItem**: Custom symbol lists per user.
- **Holding & Position**: Local mirror for portfolio tracking & paper trading.
- **Order & Trade**: Live and paper order histories with lifecycle events (`PENDING`, `OPEN`, `FILLED`, `CANCELLED`, `REJECTED`).
- **Alert**: Price, indicator, and sentiment alert triggers.
- **BacktestResult & TradeLog**: Saved backtesting runs with strategy metrics (Sharpe ratio, max drawdown, win rate).
- **AuditLog**: Cryptographically tracked log of all trade actions, mode switches, and authentication events.

---

### 4. FOLDER STRUCTURE

```
stock-sentiment-platform/
├── frontend/
│   ├── src/
│   │   ├── components/       # UI Components (Charts, Terminal, OrderForm, Watchlist)
│   │   ├── pages/            # Page Views (Dashboard, Sentiment, Technical, Portfolio, Orders, Backtest, Settings)
│   │   ├── services/         # API Client Services
│   │   ├── store/            # Zustand Stores
│   │   ├── types/            # TypeScript Interface definitions
│   │   └── utils/            # Helper functions & formatters
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── controllers/      # Express Route Handlers
│   │   ├── middleware/       # Auth, Rate Limit, Error Handling
│   │   ├── routes/           # REST API Routes
│   │   ├── services/         # Business Logic & Broker Layer
│   │   │   ├── kotak/        # Kotak Neo Client & Service Implementation
│   │   │   ├── market/       # Quotes & Master Scrip Service
│   │   │   ├── news/         # Ingestion & Scraping Engine
│   │   │   ├── sentiment/    # Sentiment Scoring Integration
│   │   │   ├── technical/    # Indicator Calculation Engine
│   │   │   ├── signal/       # Combined Signal Aggregator
│   │   │   ├── portfolio/    # Portfolio & PnL Engine
│   │   │   ├── orders/       # Order Execution & Validation Engine
│   │   │   ├── paper/        # Paper Trading Simulator Engine
│   │   │   └── backtest/     # Strategy Backtester
│   │   ├── utils/            # Rate Limiter, Crypto, Logger
│   │   └── websocket/        # Real-time WS Server
│   ├── prisma/               # Schema & Migrations
│   └── package.json
├── ml-service/
│   ├── app/
│   │   ├── api/              # FastAPI Routes
│   │   ├── models/           # FinBERT / NLP Pipelines
│   │   └── main.py           # Entrypoint
│   └── requirements.txt
├── docs/                     # Architecture & API References
├── KOTAK_API_REFERENCE.md   # Endpoint Reference Mapping
├── .env.example              # Template Environment File
├── docker-compose.yml
└── README.md
```

---

### 5. KOTAK API INTEGRATION ARCHITECTURE

All Kotak API interactions are strictly isolated behind the `BrokerService` interface.

```typescript
export interface BrokerService {
  loginWithTotp(mobileNumber: string, ucc: string, totp: string): Promise<KotakLoginResponse>;
  validateMpin(mpin: string, viewToken: string, viewSid: string): Promise<KotakValidateResponse>;
  getScripMasterPaths(): Promise<ScripMasterPathsResponse>;
  getQuotes(exchangeSegment: string, symbol: string): Promise<QuoteData>;
  getHoldings(): Promise<HoldingItem[]>;
  getPositions(): Promise<PositionItem[]>;
  getLimits(segment?: string): Promise<LimitsData>;
  checkMargin(orderParams: MarginCheckParams): Promise<MarginCheckResponse>;
  placeOrder(orderParams: OrderPlacementParams): Promise<OrderResponse>;
  modifyOrder(modifyParams: OrderModifyParams): Promise<OrderResponse>;
  cancelOrder(cancelParams: OrderCancelParams): Promise<OrderResponse>;
  getOrderBook(): Promise<OrderItem[]>;
  getOrderHistory(orderId: string): Promise<OrderHistoryItem[]>;
  getTradeBook(): Promise<TradeItem[]>;
}
```

---

### 6. EXACT AUTHENTICATION FLOW

1. **Step 1: TOTP Login (`POST /login/1.0/tradeApiLogin`)**
   - Request Body: `{ "mobileNumber": "...", "ucc": "...", "totp": "..." }`
   - Headers: `Authorization: <access_token>`, `neo-fin-key: neotradeapi`
   - Returns: `viewToken`, `viewSid`, `requestId`
2. **Step 2: MPIN Validation (`POST /login/1.0/tradeApiValidate`)**
   - Request Body: `{ "mpin": "..." }`
   - Headers: `Authorization: <access_token>`, `neo-fin-key: neotradeapi`, `sid: <viewSid>`, `Auth: <viewToken>`
   - Returns: `baseUrl`, `token` (sessionToken), `sid` (sessionSid), `dataCenter`
3. **Step 3: Session Persistence & Dynamic Routing**
   - Store `baseUrl`, `sessionToken`, and `sessionSid` securely in server-side session store.
   - Use `sessionToken` as `Auth` header and `sessionSid` as `sid` header for post-login endpoints targeting the dynamic `baseUrl`.

---

### 7. SENTIMENT ANALYSIS ARCHITECTURE

- **Pipeline**: Ingest News -> Clean & Tokenize -> Python FinBERT NLP Service -> Score Positive, Neutral, Negative (Range [-1.0, +1.0]) -> Confidence Score.
- **Time Decay Weighting**: Recent news receives exponentially higher weight using decay factor $\lambda$:
  $$W(t) = e^{-\lambda \cdot \Delta t}$$
- **Aggregated Ticker Sentiment**: Weighted score derived across news articles over the last 24-72 hours.

---

### 8. TECHNICAL ANALYSIS & COMBINED SIGNAL ENGINE

- **Technical Indicators Computed**:
  - SMA (10, 20, 50, 200) & EMA (9, 21, 50)
  - RSI (14 period) with overbought (>70) and oversold (<30) detection
  - MACD (12, 26, 9) with histogram & signal crossovers
  - Bollinger Bands (20 period, 2 std dev)
  - ATR (14 period) & Support/Resistance level pivot calculations
- **Combined Signal Aggregator**:
  $$\text{Combined Score} = w_s \cdot S + w_t \cdot T + w_m \cdot M$$
  - Default Weights: Sentiment ($w_s = 40\%$), Technical ($w_t = 40\%$), Momentum ($w_m = 20\%$).
  - Produces an **Explainable Signal**: Strong Bullish, Bullish, Neutral, Bearish, or Strong Bearish, alongside human-readable justification points.

---

### 9. TRADING WORKFLOW & PAPER TRADING SIMULATION

- **Mode Isolation**: Default mode is **PAPER TRADING**.
- **Live Trading Protections**:
  1. User toggles `LIVE TRADING MODE` switch.
  2. Multi-step modal warning pops up.
  3. Pre-order Margin Check API (`/quick/user/check-margin`) is executed.
  4. Instrument, exchange segment (`es`), trading symbol (`ts`), lot size (`qt`), and price step are validated against local Scrip Master.
  5. User explicitly reviews order summary and clicks **Confirm Live Order**.
  6. Backend invokes Kotak Neo API (`POST /quick/order/rule/ms/place`) with URL-encoded `jData`.
  7. Detailed audit log recorded.

---

### 10. BACKTESTING ENGINE

- Historical candle simulation supporting custom strategy rules (e.g., *BUY when Sentiment > +0.3 AND RSI < 45 AND Price > 50 EMA*).
- Outputs comprehensive performance analytics:
  - Cumulative Return %
  - CAGR
  - Win Rate % & Loss Rate %
  - Profit Factor
  - Max Drawdown %
  - Sharpe Ratio

---

### 11. DEVELOPMENT ROADMAP

- **Phase 1-3**: Architecture, DB Setup (Prisma SQLite), Server Infrastructure & Security.
- **Phase 4-10**: Kotak Neo Broker Service, Authentication, Scrip Master Ingestion, Quotes API, Orders, Holdings, Positions, Limits, WebSockets.
- **Phase 11-14**: Python NLP Microservice (FastAPI + FinBERT), News Ingestion Engine, Technical Indicators Engine, Combined Signal Aggregator.
- **Phase 15-20**: React Trading Terminal UI, Watchlists, Alerts, Paper Trading Engine, Backtesting System, Audit Logging.
- **Phase 21-23**: Unit & Integration Tests (with Mock Broker mode), Docker configuration, Documentation.
