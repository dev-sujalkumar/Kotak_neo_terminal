# Kotak Neo Stock Market Sentiment Analysis, Portfolio Management & Trading Terminal

Full-stack Indian stock market terminal combining sourced market quotes and history, stock-related news and NLP sentiment, technical indicators, portfolio management, and **Kotak Neo Trade API Integration**.

---

## 1. PROJECT OVERVIEW
This platform unifies four major systems into a single high-performance terminal:
1. **Stock Market Intelligence**: NSE/BSE quotes and daily price history from Yahoo Finance chart data.
2. **Financial News Sentiment Engine**: Recent company headlines from Google News RSS, evaluated by a high-performance **FinBERT (`ProsusAI/finbert`)** transformer deep learning pipeline with sentence chunking, probability distribution calibration, and database persistence.
3. **Sentiment vs. Price Correlation & Predictive ML Engine**: Pearson correlation coefficients, rolling alignment matrices, lead/lag relationships, and time-series multi-model forecasts (Random Forest, Logistic Regression, Gradient Boosting).
4. **Technical Analysis & Signal Engine**: SMA, EMA, RSI, MACD, Bollinger Bands, ATR, and Support/Resistance calculations yielding explainable signals.
5. **Kotak Neo Trading Platform**: Isolated broker service implementing Kotak TOTP & MPIN authentication, order placement, margin checks, holdings, positions, and limits.

### Market data and news sources

Stock search uses the Yahoo Finance chart endpoint (NSE symbols are looked up with the `.NS` suffix; BSE symbols can use `.BO`). It displays the provider's quote timestamp and source. Yahoo Finance data can be delayed; it is not an exchange-certified real-time feed. Historical chart data and technical indicators are based on returned daily candles, not generated sample prices.

Stock headlines are fetched per searched symbol from Google News RSS. Up to 10 available recent headlines are displayed with publisher links; if the provider returns fewer relevant headlines, the UI shows the actual count rather than filling the list with samples. Sentiment is computed from those retrieved headlines. No matching headlines result in an explicit no-data state, not an invented neutral score.

The RSI + EMA backtester uses the same Yahoo Finance daily candles. Historical news sentiment and transaction costs are not modeled, so backtest results are simulations and should not be treated as trading advice.

---

## 2. SYSTEM ARCHITECTURE

```
                                ┌──────────────────────────────────────────────┐
                                │        React / Vite Financial Terminal       │
                                │       (Tailwind CSS, Recharts, Zustand)      │
                                └──────────────────────┬───────────────────────┘
                                                       │ REST API
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
│ (FastAPI NLP Service)│                       │  (Service Layer)     │                   │   (SQLite / Prisma)  │
└──────────────────────┘                       └──────────┬───────────┘                   └──────────────────────┘
                                                          │ REST / WebSockets
                                                          ▼
                                               ┌──────────────────────┐
                                               │ Kotak Securities API │
                                               └──────────────────────┘
```

---

## 3. TECHNOLOGY STACK

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Zustand, TanStack Query.
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, Axios, Token-Bucket Rate Limiter.
- **Market/news data**: Yahoo Finance chart data, Google News RSS.
- **Machine Learning / NLP**: Python 3.11, FastAPI, Uvicorn, **PyTorch**, **HuggingFace Transformers (ProsusAI/finbert)**, **Scikit-Learn (Random Forest, Gradient Boosting, Logistic Regression)**.
- **Database**: SQLite (local) / PostgreSQL (production) managed via Prisma ORM with NewsArticle & SentimentResult persistence.

---

## 4. INSTALLATION & SETUP

### Step 1: Install Backend Dependencies & Database
```bash
cd backend
npm install
npx prisma db push
npx tsx prisma/seed.ts
```

### Step 2: Install Python NLP Service Dependencies
```bash
cd ml-service
pip install -r requirements.txt
```

### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
```

---

## 5. RUNNING THE PLATFORM LOCALLY

### Start Backend Server (Port 5000)
```bash
cd backend
npm run dev
```

### Start Python NLP Microservice (Port 8000)
```bash
cd ml-service
python app/main.py
```

### Start Frontend Vite Dev Server (Port 3000)
```bash
cd frontend
npm run dev
```

Open browser at `http://localhost:3000`.

---

## 6. ENVIRONMENT CONFIGURATION (`.env`)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=super_secret_jwt_key_2026
ENCRYPTION_KEY=32_byte_hex_encryption_key_for_kotak_credentials

BROKER_MODE=MOCK # MOCK, PAPER, LIVE
KOTAK_ACCESS_TOKEN=your_access_token_here
KOTAK_UCC=your_client_code_here
KOTAK_MOBILE_NUMBER=your_mobile_number_here
KOTAK_API_BASE_LOGIN=https://mis.kotaksecurities.com

DATABASE_URL="file:./dev.db"
NLP_SERVICE_URL=http://localhost:8000
NEWS_API_KEY=
```

---

## 7. KOTAK NEO API AUTHENTICATION FLOW

The Kotak Neo connection uses TOTP and MPIN multi-factor authentication:

1. **Step 1: TOTP Login (`POST /login/1.0/tradeApiLogin`)**
   - Headers: `Authorization: <access_token>`, `neo-fin-key: neotradeapi`
   - Body: `{ "mobileNumber": "...", "ucc": "...", "totp": "..." }`
   - Returns: `viewToken`, `viewSid`, `requestId`.
2. **Step 2: MPIN Validation (`POST /login/1.0/tradeApiValidate`)**
   - Headers: `Authorization: <access_token>`, `neo-fin-key: neotradeapi`, `sid: <viewSid>`, `Auth: <viewToken>`
   - Body: `{ "mpin": "..." }`
   - Returns: dynamic `baseUrl`, `sessionToken` (Auth header), `sessionSid` (sid header), `dataCenter`.

All post-login APIs use the dynamic `baseUrl` returned from MPIN validation.

---

## 8. KOTAK API NETWORK / STATIC IP REQUIREMENTS

Kotak API dashboards require public IP whitelisting for production trade API access. Ensure your server's static IP is whitelisted in the Kotak Neo API dashboard before enabling `LIVE` mode.

---

## 9. LIVE TRADING SAFETY PROTECTIONS

Live trading includes 9 mandatory safety protections:
1. System defaults to **PAPER TRADING MODE**.
2. Switching to LIVE mode requires explicit user confirmation and active Kotak Neo connection.
3. Pre-order Margin Check (`POST /quick/user/check-margin`) is executed before order submission.
4. Lot size, exchange segment (`es`), trading symbol (`ts`), price step, and order type are pre-validated.
5. User must review the order summary preview and click **CONFIRM LIVE ORDER**.
6. All trading actions generate permanent audit logs.
7. Automated NLP or AI signal models can NEVER place live orders directly without explicit user action.

---

## 10. TESTING & VERIFICATION

Run backend unit tests:
```bash
cd backend
npx vitest run
```

---

## 11. DOCKER DEPLOYMENT

```bash
docker-compose up --build
```

---

## 12. LICENSE & DISCLAIMER
This software is provided for analytical and paper trading purposes. Financial trading involves significant market risk. Signals generated by the NLP and technical models represent quantitative analysis only and do not guarantee future profits.
