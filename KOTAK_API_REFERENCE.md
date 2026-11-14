# Kotak Neo Trade API Reference Specification

This document serves as the authoritative mapping for all Kotak Neo API endpoints implemented within the application.

---

### 1. TOTP Trade API Login

- **Name**: Trade API Login
- **Method**: `POST`
- **URL**: `https://mis.kotaksecurities.com/login/1.0/tradeApiLogin`
- **Authentication**: Access Token (`Authorization: <access_token>`, plain without `Bearer`)
- **Headers**:
  - `Authorization`: `<access_token>`
  - `neo-fin-key`: `neotradeapi`
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "mobileNumber": "<registered_mobile_number>",
    "ucc": "<client_code>",
    "totp": "<6_digit_totp>"
  }
  ```
- **Response**:
  ```json
  {
    "result": {
      "token": "<viewToken>",
      "sid": "<viewSid>",
      "requestId": "<requestId>"
    },
    "status": "success"
  }
  ```
- **Errors**: `401 Unauthorized`, `1003 Invalid TOTP / Session`, `429 Rate Exceeded`
- **Used By**: `KotakAuthService.loginWithTotp()`

---

### 2. MPIN Trade API Validation

- **Name**: Trade API MPIN Validate
- **Method**: `POST`
- **URL**: `https://mis.kotaksecurities.com/login/1.0/tradeApiValidate`
- **Authentication**: Access Token & View Token
- **Headers**:
  - `Authorization`: `<access_token>`
  - `neo-fin-key`: `neotradeapi`
  - `sid`: `<viewSid>`
  - `Auth`: `<viewToken>`
  - `Content-Type`: `application/json`
- **Request Body**:
  ```json
  {
    "mpin": "<6_digit_mpin>"
  }
  ```
- **Response**:
  ```json
  {
    "result": {
      "baseUrl": "https://api.kotaksecurities.com",
      "token": "<sessionToken>",
      "sid": "<sessionSid>",
      "dataCenter": "DC1"
    },
    "status": "success"
  }
  ```
- **Errors**: `401 Invalid MPIN`, `1003 Session Expired`
- **Used By**: `KotakAuthService.validateMpin()`

---

### 3. Master Scrip File Paths

- **Name**: Master Scrip File Paths
- **Method**: `GET`
- **URL**: `<baseUrl>/script-details/1.0/masterscrip/file-paths`
- **Authentication**: Session Token & Session SID
- **Headers**:
  - `Auth`: `<sessionToken>`
  - `sid`: `<sessionSid>`
- **Response**: Returns CSV file URLs for exchange segments (`nse_cm`, `bse_cm`, `nse_fo`, `bse_fo`).
- **Used By**: `KotakMarketDataService.getScripMasterPaths()`

---

### 4. Quotes Endpoint

- **Name**: Neo Symbol Quote API
- **Method**: `GET`
- **URL**: `<baseUrl>/script-details/1.0/quotes/neosymbol/<query>/<filter>`
- **Authentication**: Access Token (`Authorization: <access_token>`)
- **Headers**:
  - `Authorization`: `<access_token>`
- **Query Format**: `<exchange_segment>|<instrument>` (e.g. `nse_cm|TCS-EQ`, `nse_cm|Nifty 50`)
- **Response**: LTP, OHLC, volume, bid/ask depth, 52-week high/low, circuit limits.
- **Used By**: `KotakMarketDataService.getQuotes()`

---

### 5. Order Placement

- **Name**: Quick Order Placement
- **Method**: `POST`
- **URL**: `<baseUrl>/quick/order/rule/ms/place`
- **Authentication**: Session Token & Session SID
- **Headers**:
  - `Auth`: `<sessionToken>`
  - `sid`: `<sessionSid>`
  - `Content-Type`: `application/x-www-form-urlencoded`
- **Request Parameters (`jData`)**:
  - `am`: AMO (`YES`/`NO`)
  - `dq`: Disclosed Quantity
  - `es`: Exchange Segment (e.g. `nse_cm`, `nse_fo`)
  - `mp`: Market Price flag (`0` or `1`)
  - `pc`: Product Code (`CNC`, `MIS`, `NRML`)
  - `pf`: Product Flag
  - `pr`: Price
  - `pt`: Order Type (`L` for Limit, `M` for Market, `SL`, `SL-M`)
  - `qt`: Quantity
  - `rt`: Retention/Validity (`DAY`, `IOC`)
  - `tp`: Trigger Price
  - `ts`: Trading Symbol (e.g. `TCS-EQ`)
  - `tt`: Transaction Type (`B` for Buy, `S` for Sell)
- **Response**: `{ "nMsgId": "20261004-12345", "status": "success" }`
- **Used By**: `KotakOrderService.placeOrder()`

---

### 6. Pre-Order Margin Check

- **Name**: User Check Margin
- **Method**: `POST`
- **URL**: `<baseUrl>/quick/user/check-margin`
- **Authentication**: Session Token & Session SID
- **Headers**:
  - `Auth`: `<sessionToken>`
  - `sid`: `<sessionSid>`
  - `Content-Type`: `application/json`
- **Used By**: `KotakRiskService.checkMargin()`

---

### 7. Modify Order

- **Name**: Quick Order Modify
- **Method**: `POST`
- **URL**: `<baseUrl>/quick/order/vr/modify`
- **Headers**:
  - `Auth`: `<sessionToken>`
  - `sid`: `<sessionSid>`
- **Used By**: `KotakOrderService.modifyOrder()`

---

### 8. Cancel Order

- **Name**: Quick Order Cancel
- **Method**: `POST`
- **URL**: `<baseUrl>/quick/order/cancel`
- **Headers**:
  - `Auth`: `<sessionToken>`
  - `sid`: `<sessionSid>`
- **Used By**: `KotakOrderService.cancelOrder()`

---

### 9. Order Book & Order History

- **Name**: Quick User Order Book
- **Method**: `GET`
- **URL**: `<baseUrl>/quick/user/orders`
- **Order History**: `/quick/order/history`
- **Used By**: `KotakReportsService.getOrderBook()`

---

### 10. Trade Book

- **Name**: Quick User Trade Book
- **Method**: `GET`
- **URL**: `<baseUrl>/quick/user/trades`
- **Used By**: `KotakReportsService.getTradeBook()`

---

### 11. Positions

- **Name**: Quick User Positions
- **Method**: `GET`
- **URL**: `<baseUrl>/quick/user/positions`
- **Used By**: `KotakPortfolioService.getPositions()`

---

### 12. Holdings

- **Name**: Portfolio Holdings
- **Method**: `GET`
- **URL**: `<baseUrl>/portfolio/v1/holdings`
- **Used By**: `KotakPortfolioService.getHoldings()`

---

### 13. Limits / Funds

- **Name**: User Limits / Funds
- **Method**: `POST`
- **URL**: `<baseUrl>/quick/user/limits`
- **Form body**: `jData` containing JSON with `seg`, `exch`, and `prod` (for example, `jData={"seg":"ALL","exch":"ALL","prod":"ALL"}`)
- **Used By**: `KotakRiskService.getLimits()`

---

## Application integration notes

- Authenticated REST requests include the Kotak session `Auth` and `sid` headers and, when supplied by the login response, the `sId` query parameter.
- The Portfolio holdings adapter maps Kotak's documented `data` array (`displaySymbol`, `quantity`, `averagePrice`, `holdingCost`, `mktValue`, and `closingPrice`) directly; LIVE holdings are never replaced with cached PAPER rows after a broker request fails.
- The Portfolio funds panel displays Kotak RMS fields (`Net`, `MarginUsed`, `CollateralValue`, `NotionalCash`, and `ExposureMarginPrsnt`) and supports the documented segment, exchange, and product filters. Missing values are shown as unavailable; they are not replaced with fabricated balances.
- `GET /api/broker/kotak/scrip-master` returns the broker's scrip-master file paths. `GET /api/broker/kotak/scrip-search` searches those CSV files by segment, symbol, expiry, option type, and strike.
- `POST /api/broker/kotak/quotes` supports batches of up to 50 instruments and the documented quote types (`all`, `depth`, `ohlc`, `ltp`, `oi`, `52w`, `circuit_limits`, and `scrip_details`).
- Live orders include the documented AMO, disclosed quantity, market-protection, tag, scrip-token, cover/bracket, and trailing-stop fields. Order history, regular/cover/bracket cancellation, and modification are available through the authenticated order routes.
- A read-only Kotak order-feed WebSocket is available at `/api/broker/kotak/order-feed`. Market quote variants and batches are REST-backed; the SDK's native binary market WebSocket protocol is not currently exposed in the UI.
- Real order placement, modification, and cancellation require LIVE mode, an active Kotak session, and explicit per-action confirmation. PAPER mode remains the default and uses a clearly labeled local margin estimate. Development tests mock broker responses and do not submit live transactions.
