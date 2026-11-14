     import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Newspaper,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Cpu,
  Target,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
  Activity,
  CheckCircle2,
  Calendar,
  Zap,
  ExternalLink,
  Filter,
  Search,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import {
  SentimentAnalysis,
  NewsArticle,
  CorrelationAnalytics,
  DirectionalPredictionResult,
} from '../types';
import { SentimentGauge } from '../components/SentimentGauge';
import { SectorSentimentHeatmap } from '../components/SectorSentimentHeatmap';
import { classifyNewsCategory, TOP_10_CATEGORIES } from '../utils/categoryClassifier';

export const SentimentView: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol, setActiveTab, setCustomNewsDraft } = useStore();
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [correlation, setCorrelation] = useState<CorrelationAnalytics | null>(null);
  const [prediction, setPrediction] = useState<DirectionalPredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTabState] = useState<'OVERVIEW' | 'CORRELATION' | 'PREDICTION'>('OVERVIEW');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.getSentiment(selectedSymbol),
      api.getNews(selectedSymbol),
      api.getCorrelation(selectedSymbol),
      api.getPrediction(selectedSymbol),
    ]).then(([sentRes, newsRes, corrRes, predRes]) => {
      if (!active) return;
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value);
      if (newsRes.status === 'fulfilled') setNews(newsRes.value);
      if (corrRes.status === 'fulfilled') setCorrelation(corrRes.value);
      if (predRes.status === 'fulfilled') setPrediction(predRes.value);

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
      company: item.symbol || selectedSymbol,
      ticker: `${item.symbol || selectedSymbol}.NS`,
      autoAnalyze: true,
    });
    setActiveTab('custom-news');
  };

  const filteredNews = selectedCategory === 'ALL'
    ? news
    : news.filter(item => {
        const cat = item.category || classifyNewsCategory(item.title, item.description || '', item.symbol || selectedSymbol);
        return cat === selectedCategory;
      });

  return (
    <div className="space-y-6 animate-fade-up font-sans">
      {/* Hero Header */}
      <div className="glass-panel dashboard-hero p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <BrainCircuit className="h-6 w-6 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-purple text-[9px]">FINBERT NLP ENGINE v2.0</span>
              <span className="text-[10px] font-mono text-slate-400">PROSUSAI/FINBERT ARCHITECTURE</span>
            </div>
            <h2 className="dashboard-hero-title text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              Financial News Sentiment · <span className="gradient-text">{selectedSymbol}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Transformer deep learning classification of real-time financial headlines with sentiment-price correlation and directional ML forecasts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRefreshKey(key => key + 1)}
            disabled={loading}
            className="btn-ghost flex items-center gap-2 px-4 py-2.5 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'ANALYZING…' : 'REFRESH NLP'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-200">
          {error}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTabState('OVERVIEW')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${activeTab === 'OVERVIEW'
            ? 'bg-[rgba(84,214,207,0.15)] text-[#54d6cf] border border-[rgba(84,214,207,0.3)] shadow-[0_0_12px_rgba(84,214,207,0.1)]'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
        >
          <BrainCircuit className="w-4 h-4" />
          FINBERT OVERVIEW & HEADLINES
        </button>
        <button
          onClick={() => setActiveTabState('CORRELATION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${activeTab === 'CORRELATION'
            ? 'bg-[rgba(168,85,247,0.15)] text-purple-300 border border-[rgba(168,85,247,0.3)] shadow-[0_0_12px_rgba(168,85,247,0.1)]'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          SENTIMENT VS PRICE CORRELATION
        </button>
        <button
          onClick={() => setActiveTabState('PREDICTION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${activeTab === 'PREDICTION'
            ? 'bg-[rgba(46,179,131,0.15)] text-emerald-300 border border-[rgba(46,179,131,0.3)] shadow-[0_0_12px_rgba(46,179,131,0.1)]'
            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
        >
          <Cpu className="w-4 h-4" />
          ML DIRECTIONAL FORECAST
        </button>
      </div>

      {/* TAB 1: OVERVIEW & HEADLINES */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Sector & Industry Sentiment Heatmap (Top 10 Categories) */}
          <SectorSentimentHeatmap
            articles={news}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <SentimentGauge sentiment={sentiment} loading={loading} />

              {/* AI Market Insight Card */}
              {sentiment && (
                <div className="glass-panel p-5 space-y-3 border border-[rgba(168,85,247,0.2)]">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    AI MARKET INSIGHT
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {(sentiment as any).insights ||
                      `FinBERT evaluated ${sentiment.newsCount} articles with ${sentiment.positivePct}% positive sentiment flow.`}
                  </p>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Method: {sentiment.method || 'ProsusAI/finbert'}</span>
                    <span className="text-[#54d6cf]">Normalized Score: {(sentiment.score).toFixed(3)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel space-y-4 p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Newspaper className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Latest Headlines · Scored with FinBERT</h3>
                    {selectedCategory !== 'ALL' && (
                      <span className="text-[11px] text-purple-300 font-mono">
                        Filtered by sector: <strong>{selectedCategory}</strong>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCategory !== 'ALL' && (
                    <button
                      onClick={() => setSelectedCategory('ALL')}
                      className="text-xs px-2.5 py-1 rounded-lg border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:text-white transition-colors"
                    >
                      Show All
                    </button>
                  )}
                  <span className="badge badge-cyan">
                    {filteredNews.length} / {news.length} ARTICLES
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400 font-mono">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                  Analyzing up to 2,000 headlines with FinBERT transformer weights…
                </div>
              ) : filteredNews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-700 py-10 text-center text-xs text-gray-400">
                  {selectedCategory !== 'ALL' ? (
                    <div>
                      <p>No headlines found matching sector "{selectedCategory}".</p>
                      <button
                        onClick={() => setSelectedCategory('ALL')}
                        className="mt-2 text-cyan-400 hover:underline font-mono text-xs"
                      >
                        Reset filter to view all articles
                      </button>
                    </div>
                  ) : (
                    `No matching recent news found for ${selectedSymbol}.`
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNews.map((item) => {
                    const pos = (item as any).positive_score;
                    const neg = (item as any).negative_score;
                    const neu = (item as any).neutral_score;
                    const categoryName = item.category || classifyNewsCategory(item.title, item.description || '', item.symbol || selectedSymbol);
                    const catMeta = TOP_10_CATEGORIES.find(c => c.name === categoryName);

                    return (
                      <article
                        key={item.id}
                        className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 space-y-3 transition-all hover:border-[rgba(84,214,207,0.3)] hover:bg-[rgba(84,214,207,0.02)]"
                      >
                        {/* Sector Classification Badge + Source + Timestamp */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${catMeta?.badgeClass || 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300'}`}>
                              {catMeta?.shortName || categoryName}
                            </span>
                            <span className="text-cyan-400 font-bold tracking-wider uppercase">{item.source}</span>
                          </div>
                          <span className="text-gray-500">{new Date(item.publishedAt).toLocaleString('en-IN')}</span>
                        </div>
                        
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs sm:text-sm font-semibold text-gray-100 hover:text-cyan-300 transition-colors block leading-snug"
                        >
                          {item.title}
                        </a>
                        
                        {item.description && (
                          <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
                        )}

                        {/* FinBERT Probability Triad */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2">
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
                          </div>

                          {pos !== undefined && (
                            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                              <span>Pos: <strong className="text-emerald-400 font-normal">{(pos * 100).toFixed(1)}%</strong></span>
                              <span>Neu: <strong className="text-amber-400 font-normal">{(neu * 100).toFixed(1)}%</strong></span>
                              <span>Neg: <strong className="text-rose-400 font-normal">{(neg * 100).toFixed(1)}%</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Two User-Requested Action Buttons: Go to News & Custom Analyzer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/5">
                          <span className="text-[10px] font-mono text-slate-500">
                            Category: {catMeta?.name || categoryName}
                          </span>
                          <div className="flex items-center gap-2">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                              Go to News
                            </a>
                            <button
                              onClick={() => handleOpenInCustomAnalyzer(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 hover:text-white text-xs font-semibold shadow-sm transition-all"
                              title="Send complete text into Custom News Analyzer with FinBERT"
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
      )}

      {/* TAB 2: SENTIMENT VS PRICE CORRELATION */}
      {activeTab === 'CORRELATION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="metric-card">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Pearson Correlation (r)</div>
              <div className="text-2xl font-bold font-mono text-purple-300">
                {correlation ? (correlation.pearsonCorrelation > 0 ? '+' : '') + correlation.pearsonCorrelation.toFixed(3) : '—'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Sentiment vs 1-Day Price Return</div>
            </div>

            <div className="metric-card">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Directional Match Rate</div>
              <div className="text-2xl font-bold font-mono text-[#54d6cf]">
                {correlation ? `${correlation.sentimentPriceDirectionMatchPct.toFixed(1)}%` : '—'}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">Coincident Bull/Bear Alignment</div>
            </div>

            <div className="metric-card">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">Lead/Lag Predictive Status</div>
              <div className="text-sm font-bold font-mono text-amber-300 mt-1">
                {correlation?.leadLagAnalysis.leadStatus || 'Coincident'}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                Next-Day Lead Correlation: {correlation?.leadLagAnalysis.nextDayLeadCorrelation?.toFixed(3) ?? '0.00'}
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Sentiment vs Subsequent Price Return History</h3>
              </div>
              <span className="badge badge-purple text-[10px]">TIME-ALIGNED OBSERVATIONS</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {correlation?.interpretation || 'Analyzing correlation between FinBERT sentiment scores and daily closing price returns.'}
            </p>

            {correlation?.sentimentVsReturns && correlation.sentimentVsReturns.length > 0 && (
              <div className="overflow-x-auto scroll-x">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>FinBERT Sentiment Score</th>
                      <th>Session Return (%)</th>
                      <th>Directional Alignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correlation.sentimentVsReturns.map((row, idx) => (
                      <tr key={idx}>
                        <td className="text-white font-mono">{row.date}</td>
                        <td className={`font-mono font-bold ${row.sentimentScore >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.sentimentScore >= 0 ? '+' : ''}{row.sentimentScore.toFixed(3)}
                        </td>
                        <td className={`font-mono font-bold ${row.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {row.returnPct >= 0 ? '+' : ''}{row.returnPct.toFixed(2)}%
                        </td>
                        <td>
                          <span className={`badge ${row.aligned ? 'badge-positive' : 'badge-neutral'} text-[9px]`}>
                            {row.aligned ? 'ALIGNED' : 'DIVERGENT'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MACHINE LEARNING DIRECTIONAL PREDICTION */}
      {activeTab === 'PREDICTION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Primary Consensus Card */}
            <div className="glass-panel p-6 space-y-4 border border-[rgba(84,214,207,0.3)] relative overflow-hidden">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#54d6cf]" />
                Primary Directional Forecast
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${prediction?.predictedDirection === 'UP'
                  ? 'bg-emerald-950/40 border-emerald-400/40 text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                  : 'bg-rose-950/40 border-rose-400/40 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                  }`}>
                  {prediction?.predictedDirection === 'UP' ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                </div>
                <div>
                  <div className={`text-2xl font-bold font-mono ${prediction?.predictedDirection === 'UP' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    NEXT MOVE: {prediction?.predictedDirection || 'CALCULATING'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Probability: <strong className="text-white">{prediction?.predictionProbability ?? 50}%</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Primary Architecture</div>
                <div className="text-xs text-slate-200 font-semibold">{prediction?.primaryModel || 'Ensemble Model'}</div>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">{prediction?.aiInsight}</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-[10px] text-amber-200/80 leading-relaxed">
                {prediction?.disclaimer}
              </div>
            </div>

            {/* Model Benchmarking Matrix */}
            <div className="glass-panel p-6 space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Model Comparison & Benchmark Performance</h3>
                </div>
                <span className="badge badge-cyan text-[10px]">TIME-SERIES SPLIT</span>
              </div>

              <p className="text-xs text-slate-400">
                Cross-validated on chronological historical observations without lookahead data leakage.
              </p>

              <div className="overflow-x-auto scroll-x">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Model Architecture</th>
                      <th>Accuracy</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1-Score</th>
                      <th>Forecast Direction</th>
                      <th>Up Probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prediction?.models.map((m, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-white font-mono">{m.modelName}</td>
                        <td className="font-mono text-slate-300">{(m.accuracy * 100).toFixed(1)}%</td>
                        <td className="font-mono text-slate-300">{(m.precision * 100).toFixed(1)}%</td>
                        <td className="font-mono text-slate-300">{(m.recall * 100).toFixed(1)}%</td>
                        <td className="font-mono text-purple-300 font-bold">{(m.f1Score * 100).toFixed(1)}%</td>
                        <td>
                          <span className={`badge ${m.predictedDirection === 'UP' ? 'badge-positive' : 'badge-negative'} text-[9px]`}>
                            {m.predictedDirection}
                          </span>
                        </td>
                        <td className="font-mono text-white font-bold">{m.upProbability}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Feature Importance Weights */}
              {prediction?.featureImportance && (
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    Feature Importance Contribution
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(prediction.featureImportance).map(([feat, val]) => (
                      <div key={feat} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="text-[10px] text-slate-400 font-mono truncate">{feat}</div>
                        <div className="text-xs font-bold font-mono text-[#54d6cf]">{(val * 100).toFixed(1)}%</div>
                        <div className="progress-track h-1">
                          <div className="progress-fill progress-fill-cyan" style={{ width: `${val * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
