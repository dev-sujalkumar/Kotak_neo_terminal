import React, { useState, useEffect, useMemo } from 'react';
import {
  BrainCircuit, Newspaper, RefreshCw, TrendingUp, TrendingDown,
  Sparkles, ExternalLink, BarChart2, Cpu, Activity,
  CheckCircle2, AlertTriangle, ArrowRight, Layers, Target, Compass
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, LineChart, Line, ReferenceLine
} from 'recharts';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import {
  SentimentAnalysis, NewsArticle, DirectionalPredictionResult,
  CorrelationAnalytics
} from '../types';
import { SentimentGauge } from '../components/SentimentGauge';
import { SectorSentimentHeatmap } from '../components/SectorSentimentHeatmap';
import { classifyNewsCategory } from '../utils/categoryClassifier';

const POPULAR_SYMBOLS = ['TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TATAMOTORS'];

export const SentimentView: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol, setActiveTab, setCustomNewsDraft } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'NEWS' | 'PREDICTION' | 'CORRELATION'>('NEWS');
  const [sentiment, setSentiment] = useState<SentimentAnalysis | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [prediction, setPrediction] = useState<DirectionalPredictionResult | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.getSentiment(selectedSymbol),
      api.getNews(selectedSymbol),
      api.getPrediction(selectedSymbol),
      api.getCorrelation(selectedSymbol),
    ]).then(([sentRes, newsRes, predRes, corrRes]) => {
      if (!active) return;
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value);
      if (newsRes.status === 'fulfilled') setNews(newsRes.value);
      if (predRes.status === 'fulfilled') setPrediction(predRes.value);
      if (corrRes.status === 'fulfilled') setCorrelation(corrRes.value);

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

  const filteredNews = selectedCategory === 'ALL'
    ? news
    : news.filter(item => {
        const cat = item.category || classifyNewsCategory(item.title, item.description || '', item.symbol || selectedSymbol);
        return cat === selectedCategory;
      });

  // Feature Importance data formatted for charts
  const featureChartData = useMemo(() => {
    if (!prediction?.featureImportance) return [];
    return Object.entries(prediction.featureImportance).map(([feature, weight]) => ({
      feature,
      weight: Math.round(weight * 100),
    }));
  }, [prediction]);

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
              Financial News Sentiment & Quant ML · <span className="gradient-text">{selectedSymbol}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Transformer deep learning classification of real-time financial headlines, directional multi-model forecasting, and sentiment vs price correlation.
            </p>
          </div>
        </div>

        {/* Ticker pills + refresh */}
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

      {/* ── SUB-TABS NAVIGATION ── */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveSubTab('NEWS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeSubTab === 'NEWS'
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>Headlines & Sector Heatmap</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full">{news.length}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PREDICTION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeSubTab === 'PREDICTION'
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-400/40 shadow-[0_0_12px_rgba(0,212,255,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>AI Directional Forecasting</span>
          {prediction && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              prediction.predictedDirection === 'UP' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
            }`}>
              {prediction.predictedDirection} {prediction.predictionProbability}%
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('CORRELATION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
            activeSubTab === 'CORRELATION'
              ? 'bg-blue-600/30 text-blue-300 border border-blue-400/40 shadow-[0_0_12px_rgba(0,102,255,0.2)]'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Sentiment vs Price Correlation</span>
          {correlation && (
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded-full text-slate-300">
              r = {correlation.pearsonCorrelation.toFixed(2)}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: NEWS & HEATMAP ── */}
      {activeSubTab === 'NEWS' && (
        <div className="space-y-6">
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
                  <span className="badge badge-cyan font-mono">
                    {filteredNews.length} / {news.length} ARTICLES
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 font-mono">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-400" />
                  Classifying headlines with FinBERT transformer weights…
                </div>
              ) : filteredNews.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 py-10 text-center text-xs text-slate-400 font-mono">
                  No matching headlines found.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNews.map(item => {
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
      )}

      {/* ── TAB 2: AI DIRECTIONAL FORECASTING ── */}
      {activeSubTab === 'PREDICTION' && (
        <div className="space-y-6">
          {prediction ? (
            <>
              {/* Executive Forecast Banner */}
              <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                      Ensemble Multi-Model Consensus
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold font-mono text-white flex items-center gap-3">
                      Predicted Direction:
                      <span className={`px-4 py-1 rounded-xl text-xl font-bold border ${
                        prediction.predictedDirection === 'UP'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                          : 'bg-rose-950/60 text-rose-400 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
                      }`}>
                        {prediction.predictedDirection === 'UP' ? '↗ BULLISH EXPANSION (UP)' : '↘ BEARISH CORRECTION (DOWN)'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Ensemble probability: <strong className="text-white">{prediction.predictionProbability}%</strong> · Confidence score: <strong className="text-cyan-400">{(prediction.confidence * 100).toFixed(0)}%</strong>
                    </p>
                  </div>

                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-right font-mono">
                    <span className="text-[10px] text-slate-500 block">PRIMARY MODEL</span>
                    <span className="text-sm font-bold text-cyan-300">{prediction.primaryModel}</span>
                  </div>
                </div>

                {/* AI Algorithmic Insight */}
                <div className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    QUANTITATIVE MODEL REASONING
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{prediction.aiInsight}</p>
                </div>
              </div>

              {/* Models Breakdown + Feature Importance Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Multi-Model Comparison Table */}
                <div className="glass-panel p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold text-white font-mono uppercase">Multi-Model Performance Matrix</h3>
                  </div>

                  <div className="space-y-3">
                    {prediction.models?.map(model => (
                      <div key={model.modelName} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{model.modelName}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            model.predictedDirection === 'UP' ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                          }`}>
                            {model.predictedDirection} ({model.upProbability}%)
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-1 border-t border-white/5">
                          <div>
                            <span className="text-slate-500 block">Accuracy</span>
                            <span className="font-bold text-slate-300">{(model.accuracy * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Precision</span>
                            <span className="font-bold text-slate-300">{(model.precision * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Recall</span>
                            <span className="font-bold text-slate-300">{(model.recall * 100).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">F1 Score</span>
                            <span className="font-bold text-cyan-400">{(model.f1Score * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Feature Importance Distribution Chart */}
                <div className="glass-panel p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                    <BarChart2 className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-white font-mono uppercase">Predictor Feature Weights</h3>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={featureChartData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" stroke="#4a6285" tick={{ fontSize: 9, fontFamily: 'monospace' }} unit="%" />
                        <YAxis type="category" dataKey="feature" stroke="#8ba5c8" tick={{ fontSize: 10, fontFamily: 'monospace' }} width={110} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(2,4,8,0.95)',
                            borderColor: 'rgba(0,212,255,0.3)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                          }}
                          formatter={(value: any) => [`${value}%`, 'Importance Weight']}
                        />
                        <Bar dataKey="weight" fill="#a855f7" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 text-center">
                    Feature importances computed using Gini impurity reduction from the ensemble trees.
                  </p>
                </div>

              </div>
            </>
          ) : (
            <div className="glass-panel p-12 text-center text-slate-400 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              Generating directional machine learning prediction…
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SENTIMENT VS PRICE CORRELATION ── */}
      {activeSubTab === 'CORRELATION' && (
        <div className="space-y-6">
          {correlation ? (
            <>
              {/* Executive Correlation Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
                <div className="glass-panel p-5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">PEARSON COEFFICIENT</span>
                  <div className="text-3xl font-bold font-mono text-cyan-400 mt-1">
                    {correlation.pearsonCorrelation.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Range: -1.0 (inverse) to +1.0 (direct)
                  </span>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">DIRECTION MATCH</span>
                  <div className="text-3xl font-bold font-mono text-emerald-400 mt-1">
                    {correlation.sentimentPriceDirectionMatchPct.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Sessions where news & price agreed
                  </span>
                </div>

                <div className="glass-panel p-5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">LEAD-LAG RELATIONSHIP</span>
                  <div className="text-lg font-bold font-mono text-purple-300 mt-1">
                    {correlation.leadLagAnalysis?.optimalLagDays || 1} Day Lead
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {correlation.leadLagAnalysis?.leadStatus || 'News leads next session price action'}
                  </span>
                </div>
              </div>

              {/* Lead-Lag Explanation Banner */}
              <div className="glass-panel p-5 rounded-xl border border-blue-500/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-300">
                  <Compass className="w-4 h-4 text-blue-400" />
                  CORRELATION & LEAD-LAG INTERPRETATION
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{correlation.interpretation}</p>
              </div>

              {/* Rolling Correlation Timeline Chart */}
              {correlation.rollingCorrelation && correlation.rollingCorrelation.length > 0 && (
                <div className="glass-panel p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-bold text-white font-mono uppercase">
                        Rolling Window Correlation History
                      </h3>
                    </div>
                  </div>

                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={correlation.rollingCorrelation}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" stroke="#4a6285" tick={{ fontSize: 9, fontFamily: 'monospace' }} />
                        <YAxis stroke="#4a6285" domain={[-1, 1]} tick={{ fontSize: 9, fontFamily: 'monospace' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(2,4,8,0.95)',
                            borderColor: 'rgba(0,212,255,0.3)',
                            borderRadius: '12px',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                          }}
                        />
                        <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
                        <Line
                          type="monotone"
                          dataKey="rollingCorrelation"
                          stroke="#00d4ff"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#00d4ff' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-panel p-12 text-center text-slate-400 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              Computing Pearson correlation matrices…
            </div>
          )}
        </div>
      )}
    </div>
  );
};
