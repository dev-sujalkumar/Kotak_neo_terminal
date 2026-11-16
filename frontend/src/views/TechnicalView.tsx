import React, { useState, useEffect, useMemo } from 'react';
import {
  Sliders, Activity, TrendingUp, TrendingDown, ArrowUpRight,
  RefreshCw, ShoppingCart, Zap, Target, Layers, Cpu,
  CheckCircle2, AlertTriangle, ShieldCheck, BarChart2,
  Clock, Gauge, Compass
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { TechnicalIndicators, QuoteData, CombinedSignal } from '../types';
import { CandlestickChart } from '../components/CandlestickChart';
import { resolveStock } from '../data/stockRegistry';

const POPULAR_SYMBOLS = [
  'TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'TATAMOTORS', 'ITC', 'ZOMATO', 'WMT', 'AAPL'
];

export const TechnicalView: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol, openOrderModal } = useStore();
  const [technical, setTechnical] = useState<TechnicalIndicators | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [signal, setSignal] = useState<CombinedSignal | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [period, setPeriod] = useState<string>('1D');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const stockInfo = useMemo(() => resolveStock(selectedSymbol), [selectedSymbol]);
  const currency = quote?.currency === 'USD' || stockInfo?.currency === '$' ? '$' : '₹';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.getTechnical(selectedSymbol, period),
      api.getQuote(selectedSymbol),
      api.getCandles(selectedSymbol),
      api.getSignal(selectedSymbol),
    ]).then(([tRes, qRes, cRes, sRes]) => {
      if (!active) return;
      if (tRes.status === 'fulfilled') setTechnical(tRes.value);
      if (qRes.status === 'fulfilled') setQuote(qRes.value);
      if (cRes.status === 'fulfilled') setCandles(cRes.value);
      if (sRes.status === 'fulfilled') setSignal(sRes.value);

      const rejected = [tRes, qRes, cRes].find(r => r.status === 'rejected');
      if (rejected && rejected.status === 'rejected') {
        setError(rejected.reason?.response?.data?.error || rejected.reason?.message || 'Technical analysis data unavailable.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [selectedSymbol, period, refreshKey]);

  // Compute composite technical summary
  const techScore = useMemo(() => {
    if (!technical || !quote) return 0;
    let score = 0;
    const ltp = quote.ltp;

    // RSI analysis (-30 to +30)
    if (technical.rsi14 < 30) score += 25; // Oversold bounce
    else if (technical.rsi14 > 70) score -= 25; // Overbought pullback
    else if (technical.rsi14 >= 50) score += 15;
    else score -= 15;

    // EMA Crossovers & Trend (-35 to +35)
    if (ltp > technical.ema50) score += 20; else score -= 20;
    if (technical.ema9 > technical.ema21) score += 15; else score -= 15;

    // MACD Analysis (-20 to +20)
    if (technical.macd.crossover === 'BULLISH') score += 20;
    else if (technical.macd.crossover === 'BEARISH') score -= 20;
    else if (technical.macd.histogram > 0) score += 10;
    else score -= 10;

    // Bollinger Band position (-15 to +15)
    if (ltp < technical.bollingerBands.lower) score += 15; // Mean reversion long
    else if (ltp > technical.bollingerBands.upper) score -= 15; // Mean reversion short

    return Math.max(-100, Math.min(100, score));
  }, [technical, quote]);

  const verdict = useMemo(() => {
    if (techScore >= 40) return { label: 'STRONG BUY', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/40' };
    if (techScore >= 15) return { label: 'BUY / ACCUMULATE', color: 'text-emerald-300', bg: 'bg-emerald-950/30 border-emerald-500/30' };
    if (techScore <= -40) return { label: 'STRONG SELL', color: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/40' };
    if (techScore <= -15) return { label: 'SELL / REDUCE', color: 'text-rose-300', bg: 'bg-rose-950/30 border-rose-500/30' };
    return { label: 'NEUTRAL / HOLD', color: 'text-amber-300', bg: 'bg-amber-950/30 border-amber-500/30' };
  }, [techScore]);

  // Pivot Points calculation
  const pivots = useMemo(() => {
    if (!technical || !quote) return null;
    const ltp = quote.ltp;
    const p = (technical.supportLevel + technical.resistanceLevel + ltp) / 3;
    const r1 = technical.resistanceLevel;
    const s1 = technical.supportLevel;
    const r2 = p + (r1 - s1);
    const s2 = p - (r1 - s1);
    return {
      r2: parseFloat(r2.toFixed(2)),
      r1: parseFloat(r1.toFixed(2)),
      pivot: parseFloat(p.toFixed(2)),
      s1: parseFloat(s1.toFixed(2)),
      s2: parseFloat(s2.toFixed(2)),
    };
  }, [technical, quote]);

  const isPositive = (quote?.change ?? 0) >= 0;

  return (
    <div className="space-y-6 animate-fade-up font-sans">
      {/* ── TOP HERO HEADER ── */}
      <div className="glass-panel p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_20px_rgba(0,212,255,0.15)]">
            <Sliders className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-cyan text-[9px]">QUANT TECHNICAL ENGINE</span>
              <span className="text-[10px] font-mono text-slate-400">SMA · EMA · RSI · MACD · BOLLINGER · ATR</span>
            </div>
            <h2 className="dashboard-hero-title text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              Technical Analysis · <span className="gradient-text">{selectedSymbol}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Multi-timeframe mathematical indicators, moving averages matrix, volatility bands, and automated pivot support/resistance levels.
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            disabled={loading}
            className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'CALCULATING…' : 'REFRESH'}
          </button>
          <button
            onClick={() => openOrderModal(selectedSymbol, 'BUY')}
            className="btn-buy flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            BUY
          </button>
          <button
            onClick={() => openOrderModal(selectedSymbol, 'SELL')}
            className="btn-sell flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-bold"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            SELL
          </button>
        </div>
      </div>

      {/* Hot Ticker Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-x">
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider shrink-0 px-1">Active Scrips:</span>
        {POPULAR_SYMBOLS.map(sym => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200
              ${selectedSymbol === sym
                ? 'bg-gradient-to-r from-blue-600/30 to-cyan-500/20 text-white border border-cyan-400/40 shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'}`}
          >
            {sym}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* ── LIVE QUOTE + EXECUTIVE QUANT STRIP ── */}
      {quote && (
        <div className="glass-panel p-5 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold font-mono text-white">{quote.symbol}</h3>
                {stockInfo && <span className="text-sm font-medium text-slate-300">{stockInfo.name}</span>}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${verdict.bg} ${verdict.color}`}>
                  {verdict.label}
                </span>
                {technical && (
                  <span className={`badge ${technical.trend === 'UPTREND' ? 'badge-positive' : technical.trend === 'DOWNTREND' ? 'badge-negative' : 'badge-neutral'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${technical.trend === 'UPTREND' ? 'bg-emerald-400' : technical.trend === 'DOWNTREND' ? 'bg-rose-400' : 'bg-slate-400'}`} />
                    {technical.trend}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-400 mt-1">
                {quote.dataSource || 'Market Feed'} · {quote.exchangeSegment.toUpperCase()} · Updated {new Date(quote.lastUpdated).toLocaleTimeString('en-IN')}
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold font-mono" style={{ color: isPositive ? '#00ff88' : '#ff3366' }}>
                {currency}{quote.ltp.toFixed(2)}
              </div>
              <div className={`flex items-center justify-end gap-1.5 text-xs font-mono font-bold mt-0.5 ${isPositive ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 border-t border-white/5 pt-4 mt-4 text-xs font-mono">
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">DAY RANGE</span>
              <span className="text-white font-bold">{currency}{quote.low.toFixed(0)} - {currency}{quote.high.toFixed(0)}</span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">52W HIGH</span>
              <span className="text-emerald-400 font-bold">{quote.fiftyTwoWeekHigh ? `${currency}${quote.fiftyTwoWeekHigh.toFixed(0)}` : '—'}</span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">52W LOW</span>
              <span className="text-rose-400 font-bold">{quote.fiftyTwoWeekLow ? `${currency}${quote.fiftyTwoWeekLow.toFixed(0)}` : '—'}</span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">QUANT SCORE</span>
              <span className={`font-bold ${techScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {techScore > 0 ? '+' : ''}{techScore} / 100
              </span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">VOLUME</span>
              <span className="text-slate-300 font-bold">{quote.volume ? quote.volume.toLocaleString() : '—'}</span>
            </div>
            <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">ATR VOLATILITY</span>
              <span className="text-amber-400 font-bold">{technical?.atr14 ? `${currency}${technical.atr14}` : '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE CANDLESTICK / TECHNICAL CHART ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white font-mono">TECHNICAL PRICE CHART & OVERLAYS</h3>
          </div>
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {['1D', '1W', '1M'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  period === p
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <CandlestickChart
          candles={candles}
          symbol={selectedSymbol}
          ltp={quote?.ltp || 0}
          change={quote?.change}
          changePercent={quote?.changePercent}
        />
      </div>

      {/* ── TECHNICAL INDICATORS DEEP DIVE GRID ── */}
      {technical && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 1. Oscillators & Momentum Matrix */}
          <div className="glass-panel p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Activity className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase">Oscillators & Momentum</h3>
                <span className="text-[10px] text-slate-400">RSI · MACD · Bollinger Bands</span>
              </div>
            </div>

            {/* RSI Gauge Card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">RSI (14 Period)</span>
                <span className={`text-base font-bold font-mono ${
                  technical.rsi14 < 30 ? 'text-emerald-400' :
                  technical.rsi14 > 70 ? 'text-rose-400' : 'text-cyan-400'
                }`}>
                  {technical.rsi14}
                </span>
              </div>

              {/* Graphical RSI Bar */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, technical.rsi14))}%`,
                      background: technical.rsi14 < 30
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : technical.rsi14 > 70
                          ? 'linear-gradient(90deg, #f43f5e, #fb7185)'
                          : 'linear-gradient(90deg, #00d4ff, #0066ff)'
                    }}
                  />
                  {/* Threshold markers */}
                  <div className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-emerald-500/40" />
                  <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-rose-500/40" />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>0 Oversold</span>
                  <span className="text-emerald-400">30</span>
                  <span>50</span>
                  <span className="text-rose-400">70</span>
                  <span>100 Overbought</span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-400">
                Status: {technical.rsi14 < 30 ? (
                  <strong className="text-emerald-400 font-semibold">Oversold (Bullish Reversal Opportunity)</strong>
                ) : technical.rsi14 > 70 ? (
                  <strong className="text-rose-400 font-semibold">Overbought (Pullback Risk / Exhaustion)</strong>
                ) : (
                  <strong className="text-cyan-400 font-semibold">Balanced / Neutral Momentum</strong>
                )}
              </div>
            </div>

            {/* MACD Card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">MACD (12, 26, 9)</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                  technical.macd.crossover === 'BULLISH'
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                    : technical.macd.crossover === 'BEARISH'
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}>
                  {technical.macd.crossover} CROSSOVER
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[9px] text-slate-500">MACD LINE</div>
                  <div className="font-bold text-cyan-400 mt-0.5">{technical.macd.macdLine}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[9px] text-slate-500">SIGNAL LINE</div>
                  <div className="font-bold text-purple-400 mt-0.5">{technical.macd.signalLine}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[9px] text-slate-500">HISTOGRAM</div>
                  <div className={`font-bold mt-0.5 ${technical.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {technical.macd.histogram >= 0 ? '+' : ''}{technical.macd.histogram}
                  </div>
                </div>
              </div>
            </div>

            {/* Bollinger Bands Card */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">Bollinger Bands (20, 2)</span>
                <span className="text-[10px] font-mono text-slate-400">Bandwidth: {technical.bollingerBands.bandwidth}%</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[9px] text-slate-500">LOWER (SUP)</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{currency}{technical.bollingerBands.lower}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[9px] text-slate-500">MID (SMA 20)</div>
                  <div className="font-bold text-cyan-400 mt-0.5">{currency}{technical.bollingerBands.middle}</div>
                </div>
                <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[9px] text-slate-500">UPPER (RES)</div>
                  <div className="font-bold text-rose-400 mt-0.5">{currency}{technical.bollingerBands.upper}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Moving Averages Trend Matrix */}
          <div className="glass-panel p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Compass className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase">Moving Averages Matrix</h3>
                <span className="text-[10px] text-slate-400">Short & Long-term trend alignments</span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {[
                { name: 'EMA 9 (Fast Momentum)', val: technical.ema9, type: 'EMA' },
                { name: 'EMA 21 (Swing Trend)', val: technical.ema21, type: 'EMA' },
                { name: 'SMA 20 (Mean Baseline)', val: technical.sma20, type: 'SMA' },
                { name: 'EMA 50 (Intermediate Trend)', val: technical.ema50, type: 'EMA' },
                { name: 'SMA 50 (Institutional Pivot)', val: technical.sma50, type: 'SMA' },
                { name: 'SMA 200 (Long-term Bull/Bear)', val: technical.sma200, type: 'SMA' },
              ].map(ma => {
                const ltp = quote?.ltp || 0;
                const isAbove = ltp >= ma.val;
                const diffPct = (((ltp - ma.val) / ma.val) * 100).toFixed(2);
                return (
                  <div key={ma.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${isAbove ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      <span className="text-slate-300 font-medium">{ma.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold">{currency}{ma.val}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isAbove ? 'bg-emerald-950/40 text-emerald-300' : 'bg-rose-950/40 text-rose-300'
                      }`}>
                        {isAbove ? `+${diffPct}%` : `${diffPct}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trend Summary Note */}
            <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-[11px] font-mono text-cyan-200 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <strong>Crossover Dynamics:</strong> {technical.ema9 > technical.ema21
                  ? 'Fast EMA(9) is above EMA(21) indicating immediate bullish momentum.'
                  : 'Fast EMA(9) is below EMA(21) indicating short-term bearish pressure.'}
              </div>
            </div>
          </div>

          {/* 3. Pivots, Support & Resistance Levels */}
          <div className="glass-panel p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-white/5 pb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono uppercase">Key Support & Resistance</h3>
                <span className="text-[10px] text-slate-400">Classical Floor Pivot Levels</span>
              </div>
            </div>

            {pivots && (
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
                  <span className="text-rose-300 font-bold">Resistance 2 (R2)</span>
                  <span className="text-white font-bold">{currency}{pivots.r2}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-500/20 flex items-center justify-between">
                  <span className="text-rose-400 font-bold">Resistance 1 (R1)</span>
                  <span className="text-white font-bold">{currency}{pivots.r1}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,212,255,0.1)] flex items-center justify-between">
                  <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    Central Pivot (P)
                  </span>
                  <span className="text-cyan-300 font-bold text-sm">{currency}{pivots.pivot}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-emerald-400 font-bold">Support 1 (S1)</span>
                  <span className="text-white font-bold">{currency}{pivots.s1}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-emerald-300 font-bold">Support 2 (S2)</span>
                  <span className="text-white font-bold">{currency}{pivots.s2}</span>
                </div>
              </div>
            )}

            {/* Quick Trade CTA Card */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <div className="text-xs font-mono font-bold text-slate-300">Execute Order From Technicals</div>
              <p className="text-[10px] font-mono text-slate-400">
                Setup entry or target orders directly with Kotak Neo Trade API integration.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => openOrderModal(selectedSymbol, 'BUY')}
                  className="btn-buy flex-1 py-2 text-xs font-mono font-bold flex items-center justify-center gap-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  BUY NOW
                </button>
                <button
                  onClick={() => openOrderModal(selectedSymbol, 'SELL')}
                  className="btn-sell flex-1 py-2 text-xs font-mono font-bold flex items-center justify-center gap-1"
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  SELL NOW
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
