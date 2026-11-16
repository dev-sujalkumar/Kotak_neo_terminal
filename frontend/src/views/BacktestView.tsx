import React, { useState, useMemo } from 'react';
import {
  History, Play, Award, TrendingUp, TrendingDown, Percent,
  ShieldCheck, BarChart2, CheckCircle2, AlertTriangle, RefreshCw,
  Sliders, ArrowUpRight, DollarSign, Target, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import { BacktestResult } from '../types';
import { useStore } from '../store/useStore';

const POPULAR_SYMBOLS = ['TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS'];

interface StrategyPreset {
  id: string;
  name: string;
  desc: string;
  rsiBuy: number;
  rsiSell: number;
  stopLoss: number;
  takeProfit: number;
}

const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: 'dip-reversal',
    name: 'Oversold Dip Hunter',
    desc: 'Enter aggressively on RSI oversold dips, exit on mean reversion',
    rsiBuy: 35,
    rsiSell: 65,
    stopLoss: 2.0,
    takeProfit: 5.0,
  },
  {
    id: 'trend-momentum',
    name: 'Trend Following Momentum',
    desc: 'Ride breakout waves with wide profit targets',
    rsiBuy: 48,
    rsiSell: 75,
    stopLoss: 2.5,
    takeProfit: 7.5,
  },
  {
    id: 'conservative-swing',
    name: 'Conservative Swing',
    desc: 'Balanced risk profile with tight 1:2.5 risk-to-reward ratio',
    rsiBuy: 42,
    rsiSell: 68,
    stopLoss: 1.8,
    takeProfit: 4.5,
  },
  {
    id: 'scalper',
    name: 'Mean Reversion Scalp',
    desc: 'Quick in-and-out trades with strict trailing stop',
    rsiBuy: 30,
    rsiSell: 60,
    stopLoss: 1.5,
    takeProfit: 3.0,
  },
];

export const BacktestView: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol, openOrderModal } = useStore();
  const [symbol, setSymbol] = useState(selectedSymbol || 'TCS');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [rsiBuy, setRsiBuy] = useState(42);
  const [rsiSell, setRsiSell] = useState(68);
  const [stopLoss, setStopLoss] = useState(2.0);
  const [takeProfit, setTakeProfit] = useState(5.0);
  const [activePreset, setActivePreset] = useState<string>('conservative-swing');

  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const applyPreset = (preset: StrategyPreset) => {
    setActivePreset(preset.id);
    setRsiBuy(preset.rsiBuy);
    setRsiSell(preset.rsiSell);
    setStopLoss(preset.stopLoss);
    setTakeProfit(preset.takeProfit);
  };

  const handleRunBacktest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.runBacktest({
        symbol: symbol.trim().toUpperCase(),
        initialCapital,
        rsiBuyThreshold: rsiBuy,
        rsiSellThreshold: rsiSell,
        stopLossPct: stopLoss,
        takeProfitPct: takeProfit,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Backtest simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for Equity Curve
  const equityChartData = useMemo(() => {
    if (!result?.equityCurve || result.equityCurve.length === 0) return [];
    return result.equityCurve.map((value, idx) => ({
      step: idx === 0 ? 'Start' : `T${idx}`,
      equity: value,
      pnl: value - result.initialCapital,
    }));
  }, [result]);

  // Filter trade logs
  const filteredTrades = useMemo(() => {
    if (!result?.tradeLogs) return [];
    if (tradeFilter === 'WIN') return result.tradeLogs.filter(t => (t.pnlPct ?? 0) > 0);
    if (tradeFilter === 'LOSS') return result.tradeLogs.filter(t => (t.pnlPct ?? 0) <= 0);
    return result.tradeLogs;
  }, [result, tradeFilter]);

  const riskRewardRatio = useMemo(() => {
    if (stopLoss <= 0) return '—';
    return `1 : ${(takeProfit / stopLoss).toFixed(1)}`;
  }, [stopLoss, takeProfit]);

  return (
    <div className="space-y-6 animate-fade-up font-sans">
      {/* ── HERO BANNER ── */}
      <div className="glass-panel p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <History className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-purple text-[9px]">QUANT ALGO BACKTESTER</span>
              <span className="text-[10px] font-mono text-slate-400">HISTORICAL DAILY CANDLE SIMULATION</span>
            </div>
            <h2 className="dashboard-hero-title text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              RSI + EMA Strategy Backtest · <span className="gradient-text">{symbol}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Simulate quantitative buy/sell thresholds on real daily candles with equity curve projection, risk/reward metrics, and full trade log.
            </p>
          </div>
        </div>

        {/* Quick Tickers */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {POPULAR_SYMBOLS.map(sym => (
            <button
              key={sym}
              onClick={() => {
                setSymbol(sym);
                setSelectedSymbol(sym);
              }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                symbol === sym
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── STRATEGY PRESETS PILLS ── */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
          Algorithmic Strategy Templates:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {STRATEGY_PRESETS.map(preset => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-3 rounded-xl text-left transition-all relative overflow-hidden border ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/30'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold font-mono ${isSelected ? 'text-purple-300' : 'text-slate-200'}`}>
                    {preset.name}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{preset.desc}</p>
                <div className="mt-2 flex items-center gap-2 text-[9px] font-mono text-slate-400 border-t border-white/5 pt-1.5">
                  <span>RSI: {preset.rsiBuy}/{preset.rsiSell}</span>
                  <span>·</span>
                  <span>SL: {preset.stopLoss}%</span>
                  <span>·</span>
                  <span className="text-emerald-400">TP: {preset.takeProfit}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONFIG & DASHBOARD GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Strategy Parameter Inputs */}
        <form onSubmit={handleRunBacktest} className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white font-mono uppercase">Simulation Parameters</h3>
            </div>
            <span className="text-[9px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-500/30">
              R:R {riskRewardRatio}
            </span>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Scrip Symbol</label>
              <input
                type="text"
                required
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. TCS, RELIANCE"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">Initial Capital (₹)</label>
                <span className="text-[10px] text-slate-400">₹{initialCapital.toLocaleString()}</span>
              </div>
              <input
                type="number"
                min={10000}
                step={10000}
                required
                value={initialCapital}
                onChange={e => setInitialCapital(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-purple-400 focus:outline-none"
              />
            </div>

            {/* Dual RSI Thresholds */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">RSI Buy Level (&lt;)</label>
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={rsiBuy}
                  onChange={e => {
                    setRsiBuy(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-cyan-400 font-bold focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">RSI Sell Level (&gt;)</label>
                <input
                  type="number"
                  min={50}
                  max={90}
                  value={rsiSell}
                  onChange={e => {
                    setRsiSell(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-purple-400 font-bold focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">Stop Loss (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="15"
                  value={stopLoss}
                  onChange={e => {
                    setStopLoss(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-rose-400 font-bold focus:border-rose-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 text-[11px]">Take Profit (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="30"
                  value={takeProfit}
                  onChange={e => {
                    setTakeProfit(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-bold focus:border-emerald-400 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-4 h-4 fill-white ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'SIMULATING ALGO BACKTEST…' : 'RUN HISTORICAL BACKTEST'}</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-300 block">Backtester Assumptions:</span>
            <p>Simulates daily candle execution. Sells on next-day open upon Stop Loss, Take Profit, or RSI exhaustion.</p>
          </div>
        </form>

        {/* Right 2 Columns: Backtest Results Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Executive Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                {/* 1. Final Capital & Net P&L */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Final Portfolio</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    ₹{result.finalCapital.toLocaleString()}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${result.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.totalReturn >= 0 ? '+' : ''}₹{(result.finalCapital - result.initialCapital).toLocaleString()} ({result.totalReturn >= 0 ? '+' : ''}{result.totalReturn}%)
                  </div>
                </div>

                {/* 2. Win Rate */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Win Rate</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {result.winRate}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {result.tradeLogs.filter(t => (t.pnlPct ?? 0) > 0).length} Wins · {result.tradeLogs.filter(t => (t.pnlPct ?? 0) <= 0).length} Losses
                  </div>
                </div>

                {/* 3. Max Drawdown */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Max Drawdown</div>
                  <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                    -{result.maxDrawdown}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Peak-to-trough drop
                  </div>
                </div>

                {/* 4. Profit Factor & Sharpe */}
                <div className="glass-panel p-4 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Sharpe / Factor</div>
                  <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                    {result.sharpeRatio}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Profit Factor: {result.profitFactor}
                  </div>
                </div>
              </div>

              {/* ── EQUITY CURVE RECHARTS VISUALIZATION ── */}
              {equityChartData.length > 0 && (
                <div className="glass-panel p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-white font-mono uppercase">Cumulative Equity Progression</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Total Executed Trades: <strong className="text-white font-bold">{result.totalTrades}</strong>
                    </span>
                  </div>

                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityChartData}>
                        <defs>
                          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={result.totalReturn >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.4} />
                            <stop offset="95%" stopColor={result.totalReturn >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          dataKey="step"
                          stroke="#4a6285"
                          tick={{ fontSize: 9, fontFamily: 'monospace' }}
                        />
                        <YAxis
                          stroke="#4a6285"
                          domain={['auto', 'auto']}
                          tick={{ fontSize: 9, fontFamily: 'monospace' }}
                          tickFormatter={val => `₹${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(2,4,8,0.95)',
                            borderColor: 'rgba(168,85,247,0.3)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                          }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Portfolio Equity']}
                        />
                        <ReferenceLine
                          y={result.initialCapital}
                          stroke="rgba(255,255,255,0.2)"
                          strokeDasharray="4 4"
                          label={{ value: 'Initial Capital', fill: '#8ba5c8', fontSize: 9 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="equity"
                          stroke={result.totalReturn >= 0 ? '#10b981' : '#f43f5e'}
                          strokeWidth={2}
                          fill="url(#equityGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ── SIMULATED TRADE HISTORY LOGS ── */}
              <div className="glass-panel p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white font-mono uppercase">
                      Simulated Trade Journal ({result.tradeLogs.length})
                    </h3>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
                    <button
                      onClick={() => setTradeFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${tradeFilter === 'ALL' ? 'bg-purple-600/30 text-purple-300 font-bold' : 'text-slate-400'}`}
                    >
                      ALL ({result.tradeLogs.length})
                    </button>
                    <button
                      onClick={() => setTradeFilter('WIN')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${tradeFilter === 'WIN' ? 'bg-emerald-600/30 text-emerald-300 font-bold' : 'text-slate-400'}`}
                    >
                      WINS ({result.tradeLogs.filter(t => (t.pnlPct ?? 0) > 0).length})
                    </button>
                    <button
                      onClick={() => setTradeFilter('LOSS')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${tradeFilter === 'LOSS' ? 'bg-rose-600/30 text-rose-300 font-bold' : 'text-slate-400'}`}
                    >
                      LOSSES ({result.tradeLogs.filter(t => (t.pnlPct ?? 0) <= 0).length})
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-72 scroll-y">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-semibold uppercase text-[9px] tracking-wider">
                        <th className="py-2 px-2.5">#</th>
                        <th className="py-2 px-2.5">Type</th>
                        <th className="py-2 px-2.5">Date</th>
                        <th className="py-2 px-2.5">Entry</th>
                        <th className="py-2 px-2.5">Exit</th>
                        <th className="py-2 px-2.5">Qty</th>
                        <th className="py-2 px-2.5">PnL</th>
                        <th className="py-2 px-2.5">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-[11px]">
                      {filteredTrades.map((t, idx) => {
                        const isWin = (t.pnlPct ?? 0) > 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-2.5 text-slate-500">{t.tradeNumber || idx + 1}</td>
                            <td className="py-2.5 px-2.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                t.type === 'ENTRY' ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/30' : 'bg-purple-950/40 text-purple-300 border border-purple-500/30'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-400">{new Date(t.date).toLocaleDateString()}</td>
                            <td className="py-2.5 px-2.5 text-slate-300 font-medium">₹{(t.entryPrice || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-2.5 text-white font-bold">₹{(t.exitPrice || t.price || 0).toFixed(2)}</td>
                            <td className="py-2.5 px-2.5 text-slate-400">{t.quantity}</td>
                            <td className={`py-2.5 px-2.5 font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.pnlPct !== undefined ? `${isWin ? '+' : ''}${t.pnlPct}%` : '—'}
                              {t.pnl !== undefined && (
                                <span className="text-[9px] font-normal block opacity-80">
                                  {isWin ? '+' : ''}₹{t.pnl.toFixed(0)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 text-slate-400">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                t.reason?.includes('Take Profit')
                                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                                  : t.reason?.includes('Stop Loss')
                                    ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                                    : 'bg-slate-900 text-slate-400'
                              }`}>
                                {t.reason || 'Strategy Exit'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-panel p-12 text-center text-slate-400 font-mono space-y-3">
              <Award className="w-12 h-12 text-purple-400/40 mx-auto" />
              <div className="text-base font-bold text-white">No Backtest Simulated Yet</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Choose a strategy preset or adjust the parameters on the left, then click "RUN HISTORICAL BACKTEST" to simulate algorithmic execution.
              </p>
              <button
                onClick={() => handleRunBacktest()}
                className="btn-primary mt-2 px-5 py-2.5 text-xs font-mono"
              >
                TEST DEFAULT STRATEGY (TCS)
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
