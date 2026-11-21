import React, { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Newspaper, ArrowUpRight, Zap,
  RefreshCw, BrainCircuit, Activity, BarChart2, Eye, Cpu,
  Sparkles, Globe
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { QuoteData, SentimentAnalysis, NewsArticle } from '../types';
import { SentimentGauge } from '../components/SentimentGauge';
import { SignalExplanationCard } from '../components/SignalExplanationCard';

const SkeletonCard = () => (
  <div className="glass-panel p-4 space-y-3">
    <div className="skeleton h-4 w-24 rounded" />
    <div className="skeleton h-7 w-32 rounded" />
    <div className="skeleton h-3 w-16 rounded" />
  </div>
);

export const DashboardView: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol, setActiveTab, openOrderModal, isKotakConnected, setCustomNewsDraft } = useStore();
  const activeSym = selectedSymbol || 'TCS';

  const [topStocks, setTopStocks] = useState<any[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [signal, setSignal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const SYMBOLS = ['TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'SBIN'];

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const quoteResults = await Promise.allSettled(SYMBOLS.map(symbol => api.getQuote(symbol)));
    const quotes = quoteResults
      .filter((result): result is PromiseFulfilledResult<QuoteData> => result.status === 'fulfilled')
      .map(result => result.value);
    setTopStocks(quotes);

    const [sentimentResult, signalResult, newsResult] = await Promise.allSettled([
      api.getSentiment(activeSym),
      api.getSignal(activeSym),
      api.getNews(activeSym),
    ]);
    if (sentimentResult.status === 'fulfilled') setSentiment(sentimentResult.value);
    if (signalResult.status === 'fulfilled') setSignal(signalResult.value);
    if (newsResult.status === 'fulfilled') setNews(newsResult.value);

    const failures = [
      ...quoteResults.flatMap((result, index) => result.status === 'rejected' ? [`${SYMBOLS[index]} quote`] : []),
      ...(sentimentResult.status === 'rejected' ? ['news sentiment'] : []),
      ...(signalResult.status === 'rejected' ? ['market signal'] : []),
      ...(newsResult.status === 'rejected' ? ['headlines'] : []),
    ];
    setLoadError(failures.length
      ? `Some market data is unavailable (${failures.join(', ')}). Refresh to retry.`
      : null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeSym, refreshKey]);

  const quickActions = [
    {
      id: 'kotak-setup',
      label: isKotakConnected ? 'Kotak Neo Connected' : 'Connect Kotak Neo',
      desc: isKotakConnected ? 'Manage broker connection and trading mode' : 'Authenticate securely to enable broker access',
      icon: Zap,
      color: 'text-[#54d6cf]',
      iconBg: 'bg-[rgba(84,214,207,0.1)] border-[rgba(84,214,207,0.2)]',
      border: 'hover:border-[rgba(84,214,207,0.3)]',
      bg: 'hover:bg-[rgba(84,214,207,0.04)]',
    },
    {
      id: 'backtest',
      label: 'Strategy Backtest',
      desc: 'Test RSI and EMA rules on real daily price history',
      icon: BarChart2,
      color: 'text-purple-300',
      iconBg: 'bg-[rgba(168,85,247,0.1)] border-[rgba(168,85,247,0.2)]',
      border: 'hover:border-[rgba(168,85,247,0.3)]',
      bg: 'hover:bg-[rgba(168,85,247,0.04)]',
    },
    {
      id: 'sentiment',
      label: 'NLP Sentiment Engine',
      desc: 'Score recent company headlines with financial NLP',
      icon: BrainCircuit,
      color: 'text-pink-300',
      iconBg: 'bg-[rgba(236,72,153,0.1)] border-[rgba(236,72,153,0.2)]',
      border: 'hover:border-[rgba(236,72,153,0.3)]',
      bg: 'hover:bg-[rgba(236,72,153,0.04)]',
    },
    {
      id: 'watchlists',
      label: 'Manage Watchlists',
      desc: 'Track favourite NSE instruments',
      icon: Eye,
      color: 'text-[#f59e0b]',
      iconBg: 'bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]',
      border: 'hover:border-[rgba(245,158,11,0.3)]',
      bg: 'hover:bg-[rgba(245,158,11,0.04)]',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── HERO BANNER ── */}
      <section className="glass-panel dashboard-hero p-5 sm:p-7 flex flex-wrap items-center justify-between gap-5 relative overflow-hidden">
        {/* Decorative corner circles */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full border border-[rgba(84,214,207,0.08)] pointer-events-none" />
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border border-[rgba(84,214,207,0.05)] pointer-events-none" />
        <div className="absolute top-4 right-4 w-1 h-1 rounded-full bg-[rgba(84,214,207,0.6)] animate-dot-blink pointer-events-none" />
        <div className="absolute top-8 right-12 w-1 h-1 rounded-full bg-[rgba(84,214,207,0.4)] animate-dot-blink pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[rgba(84,214,207,0.2)] bg-[rgba(84,214,207,0.08)] shadow-[0_0_20px_rgba(84,214,207,0.1)]">
            <Activity className="h-6 w-6 text-[#54d6cf]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#54d6cf] flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                NSE · Market Intelligence
              </span>
              <span className={`badge ${loading ? 'badge-neutral' : loadError ? 'badge-neutral' : 'badge-live'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-400' : loadError ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                {loading ? 'UPDATING' : loadError ? 'PARTIAL DATA' : 'DATA READY'}
              </span>
            </div>
            <h2 className="dashboard-hero-title text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Market <span className="gradient-text">Overview</span>
            </h2>
            <p className="mt-1.5 max-w-xl text-xs sm:text-sm leading-relaxed text-slate-400">
              Real-time quotes, NLP news sentiment, and AI technical signals — unified in one intelligent terminal.
            </p>
          </div>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="btn-ghost relative flex items-center gap-2 px-5 py-2.5 font-mono text-[11px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'UPDATING…' : 'REFRESH DATA'}
        </button>
      </section>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 text-xs text-rose-200 backdrop-blur-sm">
          <span>{loadError}</span>
          <button type="button" onClick={() => setRefreshKey(key => key + 1)} className="btn-ghost px-3 py-1.5 text-xs">
            TRY AGAIN
          </button>
        </div>
      )}

      {/* ── MAJOR MARKET INDICES STRIP ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: 'NIFTY 50', level: '24,316.65', change: '+102.40', pct: '+0.42%', up: true, low: '24,180', high: '24,385', pctDay: 72 },
          { name: 'SENSEX', level: '79,802.79', change: '+301.15', pct: '+0.38%', up: true, low: '79,420', high: '79,980', pctDay: 68 },
          { name: 'BANK NIFTY', level: '52,418.90', change: '-110.35', pct: '-0.21%', up: false, low: '52,150', high: '52,650', pctDay: 48 },
          { name: 'NIFTY IT', level: '38,940.15', change: '+442.80', pct: '+1.15%', up: true, low: '38,450', high: '39,120', pctDay: 84 },
        ].map(idx => (
          <div
            key={idx.name}
            className="glass-panel p-3.5 space-y-2 relative overflow-hidden group hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">{idx.name}</span>
              <span className={`inline-flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                idx.up ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {idx.up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                {idx.pct}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-bold font-mono text-white tracking-tight">
                {idx.level}
              </div>
              <span className={`text-[10px] font-mono font-semibold ${idx.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                {idx.change}
              </span>
            </div>
            {/* Day Range mini meter */}
            <div className="space-y-1">
              <div className="h-1 rounded-full bg-white/5 overflow-hidden flex">
                <div
                  className={`h-full rounded-full ${idx.up ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-rose-500 to-amber-500'}`}
                  style={{ width: `${idx.pctDay}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] font-mono text-slate-500">
                <span>L: {idx.low}</span>
                <span>H: {idx.high}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MARKET TICKER CARDS ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-[rgba(173,190,208,0.07)]" />
          <span className="text-[9px] font-mono font-bold text-[#637286] uppercase tracking-widest px-3">TOP NSE INSTRUMENTS</span>
          <div className="h-px flex-1 bg-[rgba(173,190,208,0.07)]" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {loading
            ? SYMBOLS.map(s => <SkeletonCard key={s} />)
            : topStocks.length > 0
              ? topStocks.map((stk, idx) => (
              <div
                key={stk.symbol}
                className="metric-card text-left group hover-lift relative overflow-hidden flex flex-col justify-between"
                style={{ animationDelay: `${idx * 0.07}s` }}
              >
                <button
                  type="button"
                  onClick={() => { setSelectedSymbol(stk.symbol); setActiveTab('detail'); }}
                  className="w-full text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[8px] font-mono font-bold text-[#637286] uppercase tracking-widest">NSE</span>
                      <div className="text-xs font-bold font-mono text-white group-hover:text-[#54d6cf] transition-colors mt-0.5">
                        {stk.symbol}
                      </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#2a3f5f] group-hover:text-[#54d6cf]
                                              transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 mt-1" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white group-hover:text-[#54d6cf] transition-colors mb-1.5">
                    ₹{stk.ltp?.toFixed(2)}
                  </div>
                  <div className={`flex items-center gap-1 text-[11px] font-mono font-bold mb-3
                                  ${stk.change >= 0 ? 'text-[#65d5a8]' : 'text-[#d87885]'}`}>
                    {stk.change >= 0
                      ? <TrendingUp className="w-3.5 h-3.5" />
                      : <TrendingDown className="w-3.5 h-3.5" />}
                    {stk.change >= 0 ? '+' : ''}{stk.changePercent?.toFixed(2)}%
                  </div>
                  {/* Mini sparkline bar */}
                  <div className="h-1 rounded-full overflow-hidden bg-[rgba(255,255,255,0.04)] mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, Math.abs(stk.changePercent || 0) * 20 + 30)}%`,
                        background: stk.change >= 0
                          ? 'linear-gradient(90deg, rgba(46,179,131,0.6), rgba(84,214,207,0.8))'
                          : 'linear-gradient(90deg, rgba(198,76,90,0.6), rgba(255,100,120,0.8))',
                        boxShadow: stk.change >= 0 ? '0 0 8px rgba(84,214,207,0.4)' : '0 0 8px rgba(198,76,90,0.4)'
                      }}
                    />
                  </div>
                </button>

                {/* 1-Click Quick Trade Bar */}
                <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openOrderModal(stk.symbol, 'BUY');
                    }}
                    className="flex-1 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold tracking-wider text-center transition-all"
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openOrderModal(stk.symbol, 'SELL');
                    }}
                    className="flex-1 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-[9px] font-mono font-bold tracking-wider text-center transition-all"
                  >
                    SELL
                  </button>
                </div>
              </div>
              ))
              : (
                <div className="col-span-full glass-panel flex min-h-28 items-center gap-3 px-5 py-4 text-sm text-slate-400">
                  <Activity className="h-5 w-5 shrink-0 text-slate-500" />
                  <div>
                    <p className="font-medium text-slate-200">Market quotes unavailable</p>
                    <p className="mt-1 text-xs">The quote service did not respond. Use Refresh Data to try again.</p>
                  </div>
                </div>
              )}
        </div>
      </div>

      {/* ── AI SIGNALS GRID ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-[rgba(173,190,208,0.07)]" />
          <span className="text-[9px] font-mono font-bold text-[#637286] uppercase tracking-widest px-3 flex items-center gap-1.5">
            <Cpu className="w-3 h-3" />
            AI ANALYSIS ENGINE
          </span>
          <div className="h-px flex-1 bg-[rgba(173,190,208,0.07)]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div style={{ animationDelay: '0.15s' }}><SentimentGauge sentiment={sentiment} loading={loading} /></div>
          <div style={{ animationDelay: '0.25s' }}>
            <SignalExplanationCard signal={signal} loading={loading} onTradeClick={() => openOrderModal(activeSym, 'BUY')} />
          </div>
        </div>
      </div>

      {/* ── NEWS + QUICK LAUNCHER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* News Feed */}
        <div className="lg:col-span-2 glass-panel p-5 sm:p-6 space-y-4">
          <div className="section-header">
            <div className="w-8 h-8 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center border border-[rgba(0,212,255,0.2)]">
              <Newspaper className="w-4 h-4 text-[#00d4ff]" />
            </div>
            <div className="flex-1">
              <h3 className="dashboard-section-title text-sm font-semibold text-white">Recent Headlines</h3>
              <p className="text-[11px] text-slate-400">Company news with NLP sentiment analysis</p>
            </div>
            <span className="badge badge-cyan">GOOGLE NEWS</span>
          </div>

          <div className="space-y-2">
            {loading
              ? [1, 2, 3].map(i => (
                <div key={i} className="p-3 rounded-xl bg-[rgba(4,8,16,0.5)] border border-[rgba(255,255,255,0.04)] space-y-2">
                  <div className="skeleton h-2.5 w-full rounded" />
                  <div className="skeleton h-2 w-4/5 rounded" />
                </div>
              ))
              : news.length === 0
                ? (
                  <div className="text-center py-8 text-[#2a3f5f] font-mono text-xs">
                    <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No articles loaded. Backend news API may be unavailable.
                  </div>
                )
                : news.map((item, idx) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block p-3 rounded-xl bg-[rgba(4,8,16,0.5)] border border-[rgba(255,255,255,0.04)]
                               hover:border-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.03)]
                               transition-all duration-200 group"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[9px] font-mono font-bold text-[#00d4ff] uppercase tracking-wider">{item.source}</span>
                      <span className="text-[9px] font-mono text-[#2a3f5f]">
                        {new Date(item.publishedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                      {item.title}
                    </div>
                    {item.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{item.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {item.sentiment && (
                        <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-md
                          ${item.sentiment === 'POSITIVE' ? 'badge badge-positive' :
                            item.sentiment === 'NEGATIVE' ? 'badge badge-negative' : 'badge badge-neutral'}`}>
                          {item.sentiment}
                          {item.score != null ? ` · ${item.score > 0 ? '+' : ''}${item.score.toFixed(2)}` : ''}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCustomNewsDraft({
                            text: `${item.title}\n\n${item.description || ''}`.trim(),
                            company: '',
                            ticker: activeSym,
                            autoAnalyze: true,
                          });
                          setActiveTab('custom-news');
                        }}
                        className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:text-white transition-colors"
                      >
                        ⚡ Analyse NLP
                      </button>
                    </div>
                  </a>
                ))}
          </div>
        </div>

        {/* Quick Launcher */}
        <div className="glass-panel p-5 sm:p-6 space-y-3">
          <div className="section-header">
            <div className="w-8 h-8 rounded-xl bg-[rgba(245,158,11,0.1)] flex items-center justify-center border border-[rgba(245,158,11,0.2)]">
              <Sparkles className="w-4 h-4 text-[#f59e0b]" />
            </div>
            <div>
              <h3 className="dashboard-section-title text-sm font-semibold text-white">Explore Platform</h3>
              <p className="text-[11px] text-slate-400">Tools and analysis modules</p>
            </div>
          </div>

          <div className="space-y-2">
            {quickActions.map(qa => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.id}
                  onClick={() => setActiveTab(qa.id)}
                  className={`w-full text-left p-3.5 rounded-xl bg-[rgba(4,8,16,0.5)]
                              border border-[rgba(255,255,255,0.04)] ${qa.border} ${qa.bg}
                              transition-all duration-200 group relative overflow-hidden`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${qa.iconBg} shrink-0 transition-transform group-hover:scale-110`}>
                      <Icon className={`w-4 h-4 ${qa.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white transition-colors">
                        {qa.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{qa.desc}</div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-[#2a3f5f] group-hover:text-[#8ba5c8]
                                             transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Market coverage summary */}
          <div className="mt-4 rounded-xl border border-[rgba(0,102,255,0.15)] bg-[rgba(0,102,255,0.06)] p-3.5">
            <div className="mb-2 text-[9px] font-mono font-bold uppercase tracking-wider text-[#4a6285]">Market Coverage</div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#4a6285]">Symbols monitored</span>
              <span className="text-[10px] font-mono font-bold text-[#00d4ff]">{topStocks.length || SYMBOLS.length}</span>
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-[#4a6285]">
              Quotes refresh on demand. Explore any symbol for full technical and sentiment analysis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
