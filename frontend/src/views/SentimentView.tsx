import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, Newspaper, RefreshCw, TrendingUp, TrendingDown,
  Sparkles, ExternalLink, AlertTriangle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { SentimentAnalysis, NewsArticle } from '../types';
import { SentimentGauge } from '../components/SentimentGauge';
import { classifyNewsCategory } from '../utils/categoryClassifier';

const POPULAR_SYMBOLS = ['TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS'];

export const SentimentView: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol, setActiveTab, setCustomNewsDraft } = useStore();

  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.getSentiment(selectedSymbol),
      api.getNews(selectedSymbol),
    ]).then(([sentRes, newsRes]) => {
      if (!active) return;
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value);
      if (newsRes.status === 'fulfilled') setNews(newsRes.value);

      const rejected = [sentRes, newsRes].find(r => r.status === 'rejected');
      if (rejected && rejected.status === 'rejected') {
        setError(rejected.reason?.response?.data?.error || rejected.reason?.message || 'Some sentiment data could not be fetched.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [selectedSymbol, refreshKey]);

  const handleOpenInCustomAnalyzer = (item: NewsArticle) => {
    setCustomNewsDraft({
      text: `${item.title}\n\n${item.description || ''}`.trim(),
      company: '',
      ticker: '',
      autoAnalyze: true,
    });
    setActiveTab('custom-news');
  };

  return (
    <div className="space-y-6 animate-fade-up font-sans">
      {/* ── TOP HERO HEADER ── */}
      <div className="glass-panel p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <BrainCircuit className="h-6 w-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-purple text-[9px]">FINBERT TRANSFORMER ENGINE</span>
              <span className="text-[10px] font-mono text-slate-400">PROSUSAI/FINBERT ARCHITECTURE</span>
            </div>
            <h2 className="dashboard-hero-title text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              Financial News Sentiment · <span className="gradient-text">{selectedSymbol}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Transformer deep learning classification of real-time financial headlines and probability distributions.
            </p>
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRefreshKey(key => key + 1)}
            disabled={loading}
            className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'ANALYZING…' : 'REFRESH NLP'}
          </button>
        </div>
      </div>

      {/* Hot Ticker Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scroll-x">
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider shrink-0 px-1">Selected Scrip:</span>
        {POPULAR_SYMBOLS.map(sym => (
          <button
            key={sym}
            onClick={() => setSelectedSymbol(sym)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200
              ${selectedSymbol === sym
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
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

      {/* ── NEWS CONTENT & SENTIMENT GAUGE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <SentimentGauge sentiment={sentiment} loading={loading} />

            {/* AI Market Insight Card */}
            {sentiment && (
              <div className="glass-panel p-5 space-y-3 border border-purple-500/20">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  FINBERT INTELLIGENCE BRIEF
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {(sentiment as any).insights ||
                    `FinBERT evaluated ${sentiment.newsCount} articles with ${sentiment.positivePct}% positive sentiment flow.`}
                </p>
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Model: {sentiment.method || 'ProsusAI/finbert'}</span>
                  <span className="text-cyan-400 font-bold">
                    Normalized Score: {sentiment.score >= 0 ? '+' : ''}{sentiment.score.toFixed(3)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel space-y-4 p-5 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">Latest Headlines · Scored with FinBERT</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-cyan font-mono">
                  {news.length} ARTICLES
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                Classifying headlines with FinBERT transformer weights…
              </div>
            ) : news.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 py-10 text-center text-xs text-slate-400 font-mono">
                No matching headlines found.
              </div>
            ) : (
              <div className="space-y-3">
                {news.map(item => {
                  const pos = item.positive_score;
                  const neu = item.neutral_score;
                  const neg = item.negative_score;
                  const categoryName = item.category || classifyNewsCategory(item.title, item.description || '', item.symbol || selectedSymbol);

                  return (
                    <article
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 transition-all hover:border-cyan-500/30 hover:bg-cyan-500/5 group"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-cyan-500/30 bg-cyan-950/30 text-cyan-300">
                            {categoryName}
                          </span>
                          <span className="text-cyan-400 font-bold uppercase">{item.source}</span>
                        </div>
                        <span className="text-slate-500">{new Date(item.publishedAt).toLocaleString('en-IN')}</span>
                      </div>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors block leading-snug"
                      >
                        {item.title}
                      </a>

                      {item.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                      )}

                      {/* FinBERT Probability Triad */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold ${
                          item.sentiment === 'POSITIVE'
                            ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                            : item.sentiment === 'NEGATIVE'
                              ? 'border-rose-500/30 bg-rose-950/30 text-rose-300'
                              : 'border-amber-500/30 bg-amber-950/30 text-amber-300'
                        }`}>
                          {item.sentiment === 'POSITIVE' && <TrendingUp className="w-3 h-3" />}
                          {item.sentiment === 'NEGATIVE' && <TrendingDown className="w-3 h-3" />}
                          {item.sentiment || 'NEUTRAL'}
                          {item.score !== undefined && ` · ${item.score > 0 ? '+' : ''}${item.score.toFixed(3)}`}
                        </span>

                        {pos !== undefined && neu !== undefined && neg !== undefined && (
                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                            <span>Pos: <strong className="text-emerald-400 font-normal">{(pos * 100).toFixed(1)}%</strong></span>
                            <span>Neu: <strong className="text-amber-400 font-normal">{(neu * 100).toFixed(1)}%</strong></span>
                            <span>Neg: <strong className="text-rose-400 font-normal">{(neg * 100).toFixed(1)}%</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <span className="text-[10px] font-mono text-slate-500">
                          Category: {categoryName}
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                            Go to News
                          </a>
                          <button
                            onClick={() => handleOpenInCustomAnalyzer(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 hover:text-white text-xs font-semibold shadow-sm transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            Custom Analyzer
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
    </div>
  );
};
