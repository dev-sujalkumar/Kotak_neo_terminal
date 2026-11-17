import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  Lock,
  CheckCircle2,
  Zap,
  Globe,
  Smartphone,
  RefreshCw,
  Layers,
  Calculator,
  Activity,
  Wifi,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

export const KotakSetupView: React.FC = () => {
  const { isKotakConnected, setKotakConnected, tradingMode } = useStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [ucc, setUcc] = useState('');
  const [totp, setTotp] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [mpin, setMpin] = useState('');

  // Session Tokens returned from Step 1
  const [viewToken, setViewToken] = useState('');
  const [viewSid, setViewSid] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Accordion guides
  const [showTotpGuide, setShowTotpGuide] = useState(false);
  const [showIpGuide, setShowIpGuide] = useState(false);

  // Diagnostics & Tools
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Test Margin Tool
  const [testMarginSymbol, setTestMarginSymbol] = useState('TCS-EQ');
  const [testMarginQty, setTestMarginQty] = useState(1);
  const [testMarginPrice, setTestMarginPrice] = useState(3800);
  const [testMarginProduct, setTestMarginProduct] = useState('CNC');
  const [testMarginResult, setTestMarginResult] = useState<any | null>(null);
  const [testMarginLoading, setTestMarginLoading] = useState(false);

  // Test Quote Tool
  const [testQuoteSymbol, setTestQuoteSymbol] = useState('TCS-EQ');
  const [testQuoteSegment, setTestQuoteSegment] = useState('nse_cm');
  const [testQuoteResult, setTestQuoteResult] = useState<any | null>(null);
  const [testQuoteLoading, setTestQuoteLoading] = useState(false);

  // WebSocket Diagnostics
  const [orderFeedState, setOrderFeedState] = useState<string>('Disconnected');
  const [marketFeedState, setMarketFeedState] = useState<string>('Disconnected');

  useEffect(() => {
    if (isKotakConnected) {
      setOrderFeedState('Available');
      setMarketFeedState('Available');
    } else {
      setOrderFeedState('Disconnected');
      setMarketFeedState('Disconnected');
    }
  }, [isKotakConnected]);

  const handleAutoConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.autoConnectKotak(totp);
      setKotakConnected(true);
      setTotp('');
      setSuccessMsg('Kotak Neo authenticated successfully! Portfolio auto-sync completed.');
    } catch (err: any) {
      setKotakConnected(false);
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTotpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.totpLogin({
        mobileNumber,
        ucc,
        totp,
        accessToken,
      });

      setViewToken(res.viewToken);
      setViewSid(res.viewSid);
      setStep(2);
      setSuccessMsg('Step 2: TOTP Validated! Now enter your 6-digit MPIN to complete Trade Token generation.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMpinValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.mpinValidate({
        mpin,
        viewToken,
        viewSid,
        accessToken,
      });

      setKotakConnected(true);
      setSuccessMsg('Kotak Neo connected! Base URL and session tokens initialized.');
    } catch (err: any) {
      setKotakConnected(false);
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.disconnectKotak();
      setKotakConnected(false);
      setStep(1);
      setSuccessMsg('Kotak Neo session disconnected.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Unable to disconnect.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await api.syncPortfolio();
      setSyncResult(`Synced ${res.data?.holdings ?? 0} holdings & ${res.data?.positions ?? 0} positions.`);
    } catch (err: any) {
      setSyncResult(err.response?.data?.error || 'Sync failed.');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleRunMarginCheck = async () => {
    setTestMarginLoading(true);
    setTestMarginResult(null);
    try {
      const res = await api.checkKotakMargin({
        exchangeSegment: testQuoteSegment,
        tradingSymbol: testMarginSymbol,
        transactionType: 'BUY',
        product: testMarginProduct,
        quantity: testMarginQty,
        price: testMarginPrice,
        orderType: 'L',
      });
      setTestMarginResult(res);
    } catch (err: any) {
      setTestMarginResult({ error: err.response?.data?.error || err.message });
    } finally {
      setTestMarginLoading(false);
    }
  };

  const handleRunQuoteCheck = async () => {
    setTestQuoteLoading(true);
    setTestQuoteResult(null);
    try {
      const res = await api.getKotakQuote(testQuoteSymbol, testQuoteSegment, 'all');
      setTestQuoteResult(res);
    } catch (err: any) {
      setTestQuoteResult({ error: err.response?.data?.error || err.message });
    } finally {
      setTestQuoteLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 font-mono text-xs">
      {/* Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-[#0f172a] border border-gray-800 p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            KOTAK NEO TRADE API V2 INTEGRATION
          </h2>
          <p className="text-xs text-gray-400">
            Secure TOTP + MPIN multi-factor authentication conforming to SEBI compliance standards.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {isKotakConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="bg-rose-950 border border-rose-600/50 text-rose-300 hover:bg-rose-900 px-4 py-2 rounded-lg text-xs font-bold transition-all"
            >
              {loading ? 'DISCONNECTING…' : 'DISCONNECT ACCOUNT'}
            </button>
          ) : (
            <span className="bg-rose-950 text-rose-400 border border-rose-600/50 px-3 py-1 rounded text-xs font-bold animate-pulse">
              NOT CONNECTED
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/50 border border-rose-500/50 text-rose-300 p-4 rounded-xl text-xs flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 p-4 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Accordions for Official Documentation Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: TOTP Registration Guide */}
        <div className="glass-panel p-4 border border-cyan-500/20 rounded-xl space-y-2">
          <button
            onClick={() => setShowTotpGuide(!showTotpGuide)}
            className="w-full flex items-center justify-between text-left font-bold text-cyan-300 hover:text-cyan-200"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Step 1: TOTP Registration Guide (NEO App)</span>
            </div>
            {showTotpGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showTotpGuide && (
            <div className="pt-2 text-gray-400 space-y-1.5 border-t border-gray-800 text-[11px] leading-relaxed">
              <p>1. Open Kotak Neo App or Web Portal.</p>
              <p>2. Navigate to: <strong className="text-white">Invest → Trade API → API Dashboard</strong>.</p>
              <p>3. Click <strong className="text-cyan-300">TOTP Registration</strong> in the menu.</p>
              <p>4. Verify your identity with Mobile Number, OTP, and Client Code (UCC).</p>
              <p>5. Scan the QR code with <strong className="text-white">Google Authenticator</strong> or <strong className="text-white">Microsoft Authenticator</strong>.</p>
              <p>6. Enter the 6-digit TOTP code to confirm registration.</p>
            </div>
          )}
        </div>

        {/* Static IP Whitelisting Guide */}
        <div className="glass-panel p-4 border border-amber-500/20 rounded-xl space-y-2">
          <button
            onClick={() => setShowIpGuide(!showIpGuide)}
            className="w-full flex items-center justify-between text-left font-bold text-amber-300 hover:text-amber-200"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-400" />
              <span>SEBI Static IP Whitelisting Guide</span>
            </div>
            {showIpGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showIpGuide && (
            <div className="pt-2 text-gray-400 space-y-1.5 border-t border-gray-800 text-[11px] leading-relaxed">
              <p>Kotak Neo requires server public IP whitelisting for LIVE Trade API access:</p>
              <p>• On Windows: Open Command Prompt, run <code className="text-cyan-300 bg-gray-900 px-1 py-0.5 rounded">ipconfig</code> to view your network IP, or check your public IP.</p>
              <p>• In Neo API Dashboard: Add primary and backup IP addresses under Whitelist IP tab.</p>
              <p>• You can link up to 10 family accounts to the same whitelisted IP.</p>
              <p className="text-amber-400">Note: In PAPER mode, IP whitelisting is not required.</p>
            </div>
          )}
        </div>
      </div>

      {/* One-Click Auto Connect */}
      {!isKotakConnected && (
        <form onSubmit={handleAutoConnect} className="glass-panel space-y-4 p-5 rounded-xl border border-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                <Zap className="h-4 w-4 text-cyan-400" />
                Quick Connect with Configured Server Credentials (.env)
              </div>
              <p className="text-xs text-gray-400">
                Backend reads <code className="text-cyan-400">KOTAK_ACCESS_TOKEN</code>, <code className="text-cyan-400">KOTAK_UCC</code>, <code className="text-cyan-400">KOTAK_MOBILE_NUMBER</code>, and <code className="text-cyan-400">KOTAK_MPIN</code> from your environment file.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="mb-1.5 block text-xs font-medium text-gray-300">6-Digit Authenticator Code (TOTP)</span>
              <input
                aria-label="Authentication code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                value={totp}
                onChange={event => {
                  setTotp(event.target.value.replace(/\D/g, '').slice(0, 6));
                  setErrorMsg(null);
                }}
                placeholder="Enter 6-digit code"
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-center font-mono text-base tracking-[0.35em] text-cyan-300 placeholder:text-gray-600 placeholder:tracking-normal"
              />
            </label>
            <button
              type="submit"
              disabled={loading || totp.length !== 6}
              className="self-end rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:from-cyan-500 hover:to-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-56"
            >
              {loading ? 'AUTHENTICATING…' : 'VERIFY TOTP & CONNECT'}
            </button>
          </div>
        </form>
      )}

      {/* Manual 2-Step Login */}
      {!isKotakConnected ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel space-y-3 p-5 text-xs text-gray-400">
            <h3 className="border-b border-gray-800 pb-2 text-sm font-bold text-white">Manual 2-Step Authentication</h3>
            <p>1. <strong>Step 1</strong> calls <code className="text-cyan-400">POST /login/1.0/tradeApiLogin</code> to receive your View Token and View SID.</p>
            <p>2. <strong>Step 2</strong> calls <code className="text-cyan-400">POST /login/1.0/tradeApiValidate</code> with your MPIN to obtain your session Trade Token and dynamic Base URL.</p>
            <p className="text-emerald-400">All successive trading operations use this session token in the Auth header.</p>
          </div>

          <div className="md:col-span-2 bg-gray-900/80 border border-gray-800 rounded-xl p-6 shadow-xl">
            {step === 1 ? (
              <form onSubmit={handleTotpLogin} className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  STEP 2 — TOTP Login (`/login/1.0/tradeApiLogin`)
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-400 mb-1">API Access Token (from Neo Dashboard)</label>
                    <input
                      type="password"
                      required
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Plain token (without Bearer)"
                      className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white font-mono focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1">Registered Mobile Number</label>
                      <input
                        type="text"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="+91XXXXXXXXXX"
                        className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white font-mono focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">Client Code / UCC</label>
                      <input
                        type="text"
                        required
                        value={ucc}
                        onChange={(e) => setUcc(e.target.value)}
                        placeholder="Client ID"
                        className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white font-mono focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">6-Digit TOTP Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      placeholder="Enter 6-digit TOTP"
                      value={totp}
                      onChange={(e) => setTotp(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-cyan-400 font-bold text-center text-base tracking-widest focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? 'AUTHENTICATING TOTP...' : 'PROCEED TO MPIN VALIDATION →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMpinValidate} className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  STEP 3 — MPIN Validation (`/login/1.0/tradeApiValidate`)
                </h3>

                <div>
                  <label className="block text-gray-400 mb-1">6-Digit Trading MPIN</label>
                  <input
                    type="password"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={mpin}
                    onChange={(e) => setMpin(e.target.value)}
                    placeholder="Enter MPIN"
                    className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2.5 text-emerald-400 font-bold text-center text-base tracking-widest focus:border-emerald-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 bg-gray-800 text-gray-300 font-bold py-2.5 rounded-lg"
                  >
                    ← BACK
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg shadow-lg transition-all"
                  >
                    {loading ? 'VALIDATING MPIN...' : 'CONNECT KOTAK BROKER'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* Connected Status Dashboard & Interactive Test Tools */
        <div className="space-y-6">
          <div className="bg-gray-900/80 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-3 text-emerald-400 text-sm font-bold">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <span>KOTAK NEO LIVE SESSION ACTIVE & AUTHENTICATED</span>
              </div>
              <button
                onClick={handleManualSync}
                disabled={syncLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                {syncLoading ? 'SYNCING...' : 'SYNC PORTFOLIO NOW'}
              </button>
            </div>

            {syncResult && (
              <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs">
                {syncResult}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <div className="text-gray-400 text-[10px]">Broker connection</div>
                <div className="text-emerald-400 font-bold mt-1">AUTHENTICATED</div>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <div className="text-gray-400 text-[10px]">Trading Mode</div>
                <div className={`font-bold mt-1 ${tradingMode === 'LIVE' ? 'text-rose-300' : 'text-cyan-300'}`}>
                  {tradingMode === 'LIVE' ? 'LIVE MODE ENABLED' : 'PAPER MODE (SAFE)'}
                </div>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <div className="text-gray-400 text-[10px]">HSI Order Feed</div>
                <div className="text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> {orderFeedState}
                </div>
              </div>

              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                <div className="text-gray-400 text-[10px]">HSM Market Feed</div>
                <div className="text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> {marketFeedState}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Kotak API Validation Console */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tool 1: Live Margin Check Tester */}
            <div className="glass-panel p-5 rounded-xl border border-gray-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-white border-b border-gray-800 pb-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span>Test Live Margin Check API (`/quick/user/check-margin`)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Trading Symbol</label>
                  <input
                    type="text"
                    value={testMarginSymbol}
                    onChange={(e) => setTestMarginSymbol(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Product</label>
                  <select
                    value={testMarginProduct}
                    onChange={(e) => setTestMarginProduct(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="CNC">CNC (Delivery)</option>
                    <option value="MIS">MIS (Intraday)</option>
                    <option value="NRML">NRML</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={testMarginQty}
                    onChange={(e) => setTestMarginQty(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={testMarginPrice}
                    onChange={(e) => setTestMarginPrice(Number(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
              <button
                onClick={handleRunMarginCheck}
                disabled={testMarginLoading}
                className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2 rounded transition-all"
              >
                {testMarginLoading ? 'CHECKING MARGIN...' : 'RUN LIVE MARGIN CHECK'}
              </button>

              {testMarginResult && (
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-[11px] space-y-1">
                  {testMarginResult.error ? (
                    <div className="text-rose-400">{testMarginResult.error}</div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Available Margin:</span>
                        <span className="text-emerald-400 font-bold">₹{Number(testMarginResult.availableMargin || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Required Margin:</span>
                        <span className="text-cyan-300 font-bold">₹{Number(testMarginResult.requiredMargin || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sufficient Funds:</span>
                        <span className={`font-bold ${testMarginResult.sufficientFunds ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {testMarginResult.sufficientFunds ? 'YES' : 'INSUFFICIENT'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Tool 2: Live Quotes & Depth Tester */}
            <div className="glass-panel p-5 rounded-xl border border-gray-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-white border-b border-gray-800 pb-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Test Live Quotes & Depth API (`/quotes/neosymbol`)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Symbol / Scrip</label>
                  <input
                    type="text"
                    value={testQuoteSymbol}
                    onChange={(e) => setTestQuoteSymbol(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Segment</label>
                  <select
                    value={testQuoteSegment}
                    onChange={(e) => setTestQuoteSegment(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="nse_cm">nse_cm (NSE Cash)</option>
                    <option value="bse_cm">bse_cm (BSE Cash)</option>
                    <option value="nse_fo">nse_fo (NSE F&O)</option>
                    <option value="bse_fo">bse_fo (BSE F&O)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleRunQuoteCheck}
                disabled={testQuoteLoading}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 rounded transition-all"
              >
                {testQuoteLoading ? 'FETCHING QUOTE...' : 'FETCH LIVE QUOTE & DEPTH'}
              </button>

              {testQuoteResult && (
                <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-[11px] space-y-1">
                  {testQuoteResult.error ? (
                    <div className="text-rose-400">{testQuoteResult.error}</div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">LTP:</span>
                        <span className="text-emerald-400 font-bold">₹{Number(testQuoteResult.ltp || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Bid / Ask:</span>
                        <span className="text-white">₹{Number(testQuoteResult.bidPrice || 0).toFixed(2)} / ₹{Number(testQuoteResult.askPrice || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Market Depth Levels:</span>
                        <span className="text-cyan-300 font-bold">
                          {testQuoteResult.depth?.buy?.length ? `${testQuoteResult.depth.buy.length} Bids, ${testQuoteResult.depth.sell.length} Asks` : 'Standard 5-level available'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
