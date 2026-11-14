import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Key, Lock, CheckCircle2, Zap } from 'lucide-react';
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

  // Broker secrets stay on the server; only the short-lived authentication code is submitted.
  const handleAutoConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.autoConnectKotak(totp);
      setKotakConnected(true);
      setTotp('');
      setSuccessMsg('Kotak Neo connected. Trading remains in paper mode until you explicitly switch to live.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Submit TOTP Login
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
      setSuccessMsg('TOTP Authentication Successful! Enter MPIN to complete validation.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit MPIN Validation
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
      setSuccessMsg('Kotak Neo connected. Trading remains in paper mode until you explicitly switch to live.');
    } catch (err: any) {
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
      setSuccessMsg('Kotak session disconnected.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Unable to disconnect the broker.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-mono">
      {/* Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-[#0f172a] border border-gray-800 p-6 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            KOTAK NEO BROKER CONNECTION WIZARD
          </h2>
          <p className="text-xs text-gray-400">Authenticate securely with your broker. Keep account secrets out of the browser and never share your TOTP or MPIN.</p>
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

      {/* One Click Fast Auto Connect */}
      {!isKotakConnected && (
        <form onSubmit={handleAutoConnect} className="glass-panel space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
                <Zap className="h-4 w-4 text-cyan-400" />
                Connect with configured credentials
              </div>
              <p className="text-xs text-gray-400">
                Broker credentials are read securely by the backend from your `.env` file. Enter the current six-digit code from your authenticator app.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex-1">
              <span className="mb-1.5 block text-xs font-medium text-gray-300">Authentication code (TOTP)</span>
              <input
                aria-label="Authentication code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
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
              {loading ? 'AUTHENTICATING…' : 'VERIFY CODE & CONNECT'}
            </button>
          </div>
        </form>
      )}

      {/* Connection Steps */}
      {!isKotakConnected ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step Guidance List */}
          <div className="glass-panel space-y-3 p-5 text-xs text-gray-400">
            <h3 className="border-b border-gray-800 pb-2 text-sm font-bold text-white">Before you connect</h3>
            <p>For manual authentication, enter the broker details and one-time code in the form.</p>
            <p>For server-side auto-connect, configure broker credentials in the backend environment file. Do not paste secrets into source code.</p>
            <p className="text-amber-300">Connecting does not enable live trading. Live mode requires a separate confirmation.</p>
          </div>

          {/* Authentication Form */}
          <div className="md:col-span-2 bg-gray-900/80 border border-gray-800 rounded-xl p-6 shadow-xl">
            {step === 1 ? (
              <form onSubmit={handleTotpLogin} className="space-y-4 text-xs">
                <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  STEP 1 — TOTP Authentication (`/tradeApiLogin`)
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-400 mb-1">API Access Token</label>
                    <input
                      type="password"
                      required
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white font-mono focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1">Mobile Number</label>
                      <input
                        type="text"
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
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
                      placeholder="Auto-generated if empty"
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
                  STEP 2 — MPIN Validation (`/tradeApiValidate`)
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
        /* Connected Status Dashboard */
        <div className="bg-gray-900/80 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-xl text-xs font-mono">
          <div className="flex items-center space-x-3 text-emerald-400 text-sm font-bold border-b border-gray-800 pb-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>KOTAK NEO LIVE SESSION ACTIVE & AUTHENTICATED</span>
          </div>

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
              <div className="text-gray-400 text-[10px]">Live Orders</div>
              <div className={`font-bold mt-1 ${tradingMode === 'LIVE' ? 'text-emerald-400' : 'text-amber-300'}`}>
                {tradingMode === 'LIVE' ? 'AVAILABLE AFTER CONFIRMATION' : 'DISABLED IN PAPER MODE'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
