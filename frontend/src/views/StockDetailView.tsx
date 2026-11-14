import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, ShoppingCart, Sliders, Newspaper } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { QuoteData, SentimentAnalysis, TechnicalIndicators, CombinedSignal, NewsArticle } from '../types';
import { CandlestickChart } from '../components/CandlestickChart';
import { SentimentGauge } from '../components/SentimentGauge';
import { SignalExplanationCard } from '../components/SignalExplanationCard';

const POPULAR = ['TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'SUNPHARMA'];

const StatBox = ({ label, value, sub, color = '#8ba5c8' }: { label: string; value: string; sub?: string; color?: string }) => (
  <div className="bg-[rgba(4,8,16,0.7)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3
                  hover:border-[rgba(0,212,255,0.15)] transition-colors">
    <div className="text-[9px] font-mono text-[#4a6285] uppercase tracking-wider mb-1">{label}</div>
    <div className="text-sm font-bold font-mono" style={{ color }}>{value}</div>
    {sub && <div className="text-[9px] font-mono text-[#4a6285] mt-0.5">{sub}</div>}
  </div>
);

export const StockDetailView: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol, openOrderModal } = useStore();
  const [quote, setQuote]       = useState<QuoteData | null>(null);
  const [candles, setCandles]   = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [technical, setTechnical] = useState<TechnicalIndicators | null>(null);
  const [signal, setSignal]     = useState<CombinedSignal | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setQuote(null);
    setCandles([]);
    setSentiment(null);
    setTechnical(null);
    setSignal(null);
    setNews([]);

    Promise.allSettled([
      api.getQuote(selectedSymbol),
      api.getCandles(selectedSymbol),
      api.getSentiment(selectedSymbol),
      api.getTechnical(selectedSymbol),
      api.getSignal(selectedSymbol),
      api.getNews(selectedSymbol),
    ]).then(results => {
      if (!active) return;
      if (results[0].status === 'fulfilled') setQuote(results[0].value);
      if (results[1].status === 'fulfilled') setCandles(results[1].value);
      if (results[2].status === 'fulfilled') setSentiment(results[2].value);
      if (results[3].status === 'fulfilled') setTechnical(results[3].value);
      if (results[4].status === 'fulfilled') setSignal(results[4].value);
      if (results[5].status === 'fulfilled') setNews(results[5].value);

      const rejected = results.find(result => result.status === 'rejected');
      if (rejected?.status === 'rejected') {
        const message = rejected.reason?.response?.data?.error || rejected.reason?.message;
        setLoadError(message || `Some data could not be loaded for ${selectedSymbol}.`);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [selectedSymbol, refreshKey]);

  const isPositive = (quote?.change ?? 0) >= 0;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Ticker Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-x">
        <span className="text-[9px] font-mono text-[#2a3f5f] uppercase tracking-wider shrink-0">Hot Tickers</span>
        {POPULAR.map(sym => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200
              ${selectedSymbol === sym
                ? 'bg-gradient-to-r from-[rgba(0,102,255,0.3)] to-[rgba(0,212,255,0.15)] text-white border border-[rgba(0,212,255,0.4)] shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                : 'bg-[rgba(4,8,16,0.7)] border border-[rgba(255,255,255,0.05)] text-[#4a6285] hover:text-[#8ba5c8] hover:border-[rgba(0,212,255,0.2)]'}`}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Quote Header Card */}
      {quote && (
        <div className="glass-panel p-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: `radial-gradient(ellipse at 0% 50%, ${isPositive ? 'rgba(0,255,136,0.05)' : 'rgba(255,51,102,0.05)'} 0%, transparent 60%)` }} />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            {/* Left: Name + Exchange */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold font-mono text-white">{quote.symbol}</h1>
                <span className="badge badge-cyan text-[9px]">{quote.tradingSymbol}</span>
                <span className="badge badge-neutral text-[9px]">{quote.exchangeSegment.toUpperCase()}</span>
              </div>
              <p className="text-[10px] font-mono text-[#4a6285]">
                {quote.dataSource || 'Market data'} · {quote.marketState || 'Market status unavailable'} · Updated {new Date(quote.lastUpdated).toLocaleString('en-IN')}
              </p>
            </div>

            {/* Right: Price + Actions */}
            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="text-3xl font-bold font-mono" style={{ color: isPositive ? '#00ff88' : '#ff3366' }}>
                  ₹{quote.ltp.toFixed(2)}
                </div>
                <div className={`flex items-center justify-end gap-1.5 text-sm font-mono font-bold mt-0.5
                                ${isPositive ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                  {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {isPositive ? '+' : ''}{quote.change.toFixed(2)} ({isPositive ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openOrderModal(selectedSymbol, 'BUY')} className="btn-buy flex items-center gap-1.5 px-5 py-2.5">
                  <ShoppingCart className="w-4 h-4" />
                  BUY
                </button>
                <button onClick={() => openOrderModal(selectedSymbol, 'SELL')} className="btn-sell flex items-center gap-1.5 px-5 py-2.5">
                  <TrendingDown className="w-4 h-4" />
                  SELL
                </button>
              </div>
            </div>
          </div>

          {/* OHLCV Strip */}
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2 border-t border-[rgba(255,255,255,0.05)] pt-3">
            {[
              { label: 'OPEN',    value: `₹${quote.open.toFixed(2)}` },
              { label: 'HIGH',    value: `₹${quote.high.toFixed(2)}`,  color: '#00ff88' },
              { label: 'LOW',     value: `₹${quote.low.toFixed(2)}`,   color: '#ff3366' },
              { label: 'CLOSE',   value: `₹${quote.close.toFixed(2)}` },
              { label: '52W HI',  value: quote.fiftyTwoWeekHigh ? `₹${quote.fiftyTwoWeekHigh.toFixed(0)}` : '—', color: '#00ff88' },
              { label: '52W LO',  value: quote.fiftyTwoWeekLow  ? `₹${quote.fiftyTwoWeekLow.toFixed(0)}`  : '—', color: '#ff3366' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-[8px] font-mono text-[#2a3f5f] uppercase tracking-wider">{s.label}</div>
                <div className="text-[11px] font-mono font-bold mt-0.5" style={{ color: s.color ?? '#8ba5c8' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Chart + Technical */}
        <div className="lg:col-span-2 space-y-5">
          <CandlestickChart
            candles={candles}
            symbol={selectedSymbol}
            ltp={quote?.ltp ?? 0}
            change={quote?.change}
            changePercent={quote?.changePercent}
          />

          {technical && (
            <div className="glass-panel p-5 space-y-4">
              <div className="section-header">
                <div className="w-7 h-7 rounded-lg bg-[rgba(0,212,255,0.1)] flex items-center justify-center border border-[rgba(0,212,255,0.2)]">
                  <Sliders className="w-3.5 h-3.5 text-[#00d4ff]" />
                </div>
                <h3 className="text-xs font-bold font-mono text-white">Technical Indicators</h3>
                <span className={`ml-auto badge ${technical.trend === 'UPTREND' ? 'badge-positive' : technical.trend === 'DOWNTREND' ? 'badge-negative' : 'badge-neutral'}`}>
                  {technical.trend}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="RSI (14)" value={technical.rsi14.toFixed(1)}
                         sub={technical.rsi14 > 70 ? 'Overbought' : technical.rsi14 < 30 ? 'Oversold' : 'Neutral'}
                         color={technical.rsi14 > 70 ? '#ff3366' : technical.rsi14 < 30 ? '#00ff88' : '#f59e0b'} />
                <StatBox label="EMA 9 / 21"
                         value={`₹${technical.ema9.toFixed(0)}`}
                         sub={`₹${technical.ema21.toFixed(0)}`}
                         color="#00d4ff" />
                <StatBox label="MACD Line"
                         value={technical.macd.macdLine.toFixed(2)}
                         sub={technical.macd.crossover}
                         color={technical.macd.crossover === 'BULLISH' ? '#00ff88' : technical.macd.crossover === 'BEARISH' ? '#ff3366' : '#f59e0b'} />
                <StatBox label="ATR (14)"
                         value={`₹${technical.atr14.toFixed(2)}`}
                         sub="Volatility"
                         color="#f59e0b" />
                <StatBox label="SMA 50"    value={`₹${technical.sma50.toFixed(0)}`}  color="#a855f7" />
                <StatBox label="SMA 200"   value={`₹${technical.sma200.toFixed(0)}`} color="#6366f1" />
                <StatBox label="Support"   value={`₹${technical.supportLevel.toFixed(0)}`}   color="#00ff88" sub="Key Level" />
                <StatBox label="Resistance" value={`₹${technical.resistanceLevel.toFixed(0)}`} color="#ff3366" sub="Key Level" />
              </div>

              {/* Bollinger Bands mini-bar */}
              {technical.bollingerBands && (
                <div className="pt-3 border-t border-[rgba(255,255,255,0.04)]">
                  <div className="flex justify-between text-[9px] font-mono text-[#4a6285] mb-2">
                    <span>Bollinger Bands · BW: {technical.bollingerBands.bandwidth.toFixed(2)}</span>
                    <span>Lower: ₹{technical.bollingerBands.lower.toFixed(0)} · Mid: ₹{technical.bollingerBands.middle.toFixed(0)} · Upper: ₹{technical.bollingerBands.upper.toFixed(0)}</span>
                  </div>
                  <div className="h-2 bg-[rgba(4,8,16,0.8)] rounded-full overflow-hidden border border-[rgba(168,85,247,0.15)] relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[rgba(168,85,247,0.2)] via-[rgba(168,85,247,0.5)] to-[rgba(168,85,247,0.2)]" />
                    {/* Current price marker */}
                    {quote && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#a855f7] -translate-x-1/2 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                        style={{
                          left: `${Math.min(98, Math.max(2, ((quote.ltp - technical.bollingerBands.lower) / (technical.bollingerBands.upper - technical.bollingerBands.lower)) * 100))}%`
                        }}
                      />
                    )}
                  </div>

                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Sentiment + Signal */}
        <div className="space-y-5">
          <SentimentGauge sentiment={sentiment} />
          <SignalExplanationCard signal={signal} onTradeClick={() => openOrderModal(selectedSymbol, 'BUY')} />
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/25 p-4 text-xs text-amber-100">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setRefreshKey(key => key + 1)}
            disabled={loading}
            className="btn-ghost flex items-center gap-2 px-3 py-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            RETRY
          </button>
        </div>
      )}

      <section className="glass-panel space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.05)] pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.1)]">
              <Newspaper className="h-4 w-4 text-[#00d4ff]" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-mono text-white">{selectedSymbol} news and sentiment</h3>
              <p className="text-[9px] font-mono text-[#4a6285]">Latest related headlines · Google News RSS</p>
            </div>
          </div>
          <span className="badge badge-cyan">{news.length} HEADLINES</span>
        </div>

        {loading && news.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">Searching recent headlines for {selectedSymbol}…</div>
        ) : news.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 py-8 text-center text-xs text-gray-400">
            No matching recent headlines were returned for {selectedSymbol}. No sample news is shown.
          </div>
        ) : (
          <div className="space-y-2">
            {news.map(article => (
              <article key={article.id} className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 transition-colors hover:border-cyan-500/20">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                  <span className="font-semibold text-cyan-300">{article.source}</span>
                  <span className="text-gray-500">{new Date(article.publishedAt).toLocaleString('en-IN')}</span>
                </div>
                <a href={article.url} target="_blank" rel="noreferrer" className="mt-2 block text-sm font-semibold leading-relaxed text-gray-100 hover:text-cyan-300">
                  {article.title}
                </a>
                {article.description && <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{article.description}</p>}
                {article.sentiment && (
                  <span className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[9px] font-bold ${
                    article.sentiment === 'POSITIVE'
                      ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                      : article.sentiment === 'NEGATIVE'
                        ? 'border-rose-500/30 bg-rose-950/30 text-rose-300'
                        : 'border-amber-500/30 bg-amber-950/30 text-amber-300'
                  }`}>
                    {article.sentiment} · {article.score !== undefined ? article.score.toFixed(2) : '—'}
                  </span>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
