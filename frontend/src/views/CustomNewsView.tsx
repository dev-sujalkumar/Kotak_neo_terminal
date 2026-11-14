import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  FileText,
  Sparkles,
  RotateCcw,
  Download,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Layers,
  Activity,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  BookOpen,
  PieChart,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { CustomNewsAnalysisResult } from '../types';

const SAMPLE_ARTICLES = [
  {
    title: 'Multi-Company Tech Earnings (TCS vs Infosys)',
    company: 'Tata Consultancy Services',
    ticker: 'TCS.NS',
    text: `Tata Consultancy Services (TCS) reported a stellar 14.8% jump in quarterly consolidated net profit, surpassing consensus Street estimates on strong order book wins and robust demand in North America. The IT giant announced a generous interim dividend of Rs 28 per share and expressed confidence in sustained double-digit revenue growth. CEO K. Krithivasan highlighted expanding deal momentum in generative AI and cloud infrastructure engagements.

In contrast, rival Infosys slashed its annual revenue forecast to 1.0%-2.5% following unplanned project deferrals and cautious discretionary spending among European banking clients. Operating margins compressed 120 basis points, and management flagged continued attrition in mid-level delivery units.

Meanwhile, the Securities and Exchange Board of India (SEBI) confirmed it is reviewing standard disclosure norms for IT exporters regarding algorithmic trading systems.`,
  },
  {
    title: 'Reliance Renewable Capex & Telecom Expansion',
    company: 'Reliance Industries',
    ticker: 'RELIANCE.NS',
    text: `Reliance Industries Limited announced a mega Rs 75,000 crore capital expenditure roadmap to commission giga-factories for solar PV modules, green hydrogen electrolyzers, and advanced energy storage systems in Jamnagar. Chairman Mukesh Ambani affirmed that the clean energy division will emerge as a cornerstone growth engine within three years.

Concurrently, Reliance Jio crossed 470 million subscribers following the nationwide rollout of standalone 5G networks, boosting blended average revenue per user (ARPU) by 8.4% year-on-year. Analysts at Morgan Stanley reaffirmed an overweight rating, citing resilient operating cash flows and balance sheet deleveraging.`,
  },
  {
    title: 'Banking Regulatory Review & Asset Quality',
    company: 'HDFC Bank',
    ticker: 'HDFCBANK.NS',
    text: `HDFC Bank announced robust net interest income growth of 18% following smooth progress on deposit mobilization across semi-urban branches. Gross non-performing assets improved to 1.24%, reflecting strong asset quality and credit discipline.

However, the Reserve Bank of India (RBI) issued a revised circular on unsecured retail lending risk weights, which could moderately temper loan growth in personal credit and credit cards across the banking sector. HDFC Bank management assured investors that their Tier-1 capital adequacy of 16.8% provides ample cushion against regulatory tightening.`,
  },
];

export const CustomNewsView: React.FC = () => {
  const { customNewsDraft, setCustomNewsDraft } = useStore();
  const [inputText, setInputText] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomNewsAnalysisResult | null>(null);
  const [showAllSentences, setShowAllSentences] = useState(false);

  useEffect(() => {
    if (customNewsDraft?.text) {
      const textToAnalyze = customNewsDraft.text;
      const comp = customNewsDraft.company || '';
      const tick = customNewsDraft.ticker || '';

      setInputText(textToAnalyze);
      setSelectedCompany(comp);
      setSelectedTicker(tick);

      if (customNewsDraft.autoAnalyze) {
        setLoading(true);
        setError(null);
        api.analyzeCustomNews({
          text: textToAnalyze,
          selectedCompany: comp.trim() || undefined,
          selectedTicker: tick.trim() || undefined,
        }).then(data => {
          setResult(data);
        }).catch(err => {
          setError(
            err?.response?.data?.error ||
            err?.message ||
            'Unable to analyze text with FinBERT. Please ensure ML service is available.'
          );
        }).finally(() => {
          setLoading(false);
        });
      }
      setCustomNewsDraft(null);
    }
  }, [customNewsDraft]);

  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const paragraphCount = inputText.trim() ? inputText.split(/\n+/).filter(Boolean).length : 0;

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please paste or type a financial headline or article to analyze.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.analyzeCustomNews({
        text: inputText,
        selectedCompany: selectedCompany.trim() || undefined,
        selectedTicker: selectedTicker.trim() || undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        err?.message ||
        'Unable to analyze text with FinBERT. Please ensure ML service is available.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
    setError(null);
  };

  const loadSample = (sample: typeof SAMPLE_ARTICLES[0]) => {
    setInputText(sample.text);
    setSelectedCompany(sample.company);
    setSelectedTicker(sample.ticker);
    setError(null);
  };

  const handleDownloadReport = () => {
    if (!result) return;
    const report = {
      title: 'FinBERT Custom Financial News Sentiment Report',
      timestamp: new Date().toISOString(),
      inputTextSummary: {
        characters: result.characterCount,
        words: result.wordCount,
        paragraphs: result.paragraphCount,
      },
      overallAnalysis: {
        sentiment: result.sentiment,
        normalizedScore: result.normalized_score,
        confidence: result.confidence,
        probabilities: {
          positive: result.positive_probability,
          neutral: result.neutral_probability,
          negative: result.negative_probability,
        },
      },
      marketDirectionPrediction: {
        direction: result.marketDirection,
        probability: result.marketDirectionProbability,
        supportingEvidence: result.supportingEvidence,
        negativeSignals: result.negativeSignals,
        uncertainties: result.importantUncertainties,
      },
      entityDisaggregation: result.detectedEntities,
      detectedEvents: result.detectedEvents,
      financialImpacts: result.financialImpacts,
      executiveSummary: result.executiveSummary,
      sentenceBreakdown: result.sentenceAnalysis,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finbert-sentiment-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSentimentColor = (sentiment: string) => {
    const s = sentiment?.toUpperCase();
    if (s === 'POSITIVE' || s === 'HIGHLY POSITIVE' || s === 'MODERATELY POSITIVE') {
      return {
        badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        text: 'text-emerald-400',
        bar: 'bg-emerald-500',
      };
    }
    if (s === 'NEGATIVE' || s === 'HIGHLY NEGATIVE' || s === 'MODERATELY NEGATIVE') {
      return {
        badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
        text: 'text-rose-400',
        bar: 'bg-rose-500',
      };
    }
    return {
      badge: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
      text: 'text-sky-400',
      bar: 'bg-sky-500',
    };
  };

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
              <span className="badge badge-purple text-[9px]">FINBERT NLP ENGINE</span>
              <span className="badge badge-cyan text-[9px]">FULL ARTICLE PARSING</span>
              <span className="text-[10px] font-mono text-slate-400">PROSUSAI/FINBERT ARCHITECTURE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Custom News Sentiment Analyzer
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste raw financial news headlines, articles, or earnings statements to analyze sentence trajectories, multi-company sentiment disaggregation, and market impact.
            </p>
          </div>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Try Sample:</span>
          {SAMPLE_ARTICLES.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => loadSample(sample)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[rgba(173,190,208,0.15)] bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              Sample {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Company Input Section */}
      <div className="glass-panel p-5 sm:p-6 space-y-4">
        {/* Optional Company & Ticker Override */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Target Company Name <span className="text-slate-500">(Optional / Auto-detected if blank)</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                placeholder="e.g. Reliance Industries, Tata Consultancy Services, Infosys"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[rgba(173,190,208,0.15)] bg-slate-950/70 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Stock Ticker Symbol <span className="text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={selectedTicker}
              onChange={e => setSelectedTicker(e.target.value)}
              placeholder="e.g. RELIANCE.NS, TCS.NS, INFY.NS"
              className="w-full px-3 py-2 text-sm rounded-xl border border-[rgba(173,190,208,0.15)] bg-slate-950/70 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
            />
          </div>
        </div>

        {/* Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-purple-400" />
              Financial News Text, Earnings Transcript, or Article
            </label>
            <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
              <span>{charCount.toLocaleString()} chars</span>
              <span>•</span>
              <span>{wordCount.toLocaleString()} words</span>
              <span>•</span>
              <span>{paragraphCount} paras</span>
            </div>
          </div>
          <textarea
            rows={7}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Paste your financial news article, stock market update, company announcement, or financial report here..."
            className="w-full p-3.5 text-sm rounded-xl border border-[rgba(173,190,208,0.15)] bg-slate-950/80 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 leading-relaxed font-sans resize-y"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              disabled={!inputText && !result}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-[rgba(173,190,208,0.15)] bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-all disabled:opacity-40 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear Text
            </button>
          </div>

          <div className="flex items-center gap-3">
            {result && (
              <button
                onClick={handleDownloadReport}
                className="px-3.5 py-2 text-xs font-medium rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-all flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Download Report (.JSON)
              </button>
            )}

            <button
              onClick={handleAnalyze}
              disabled={loading || !inputText.trim()}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/25 transition-all disabled:opacity-40 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Analyzing with FinBERT...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Analyze News
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Analysis Results View */}
      {result && (
        <div className="space-y-6">
          {/* 1. Executive Summary & Sentiment Gauge Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overall FinBERT Classification */}
            <div className="glass-panel p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">FINBERT OVERALL SENTIMENT</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getSentimentColor(result.sentiment).badge}`}>
                    {result.sentiment.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-3xl font-black tracking-tight text-white font-mono">
                    {result.normalized_score >= 0 ? '+' : ''}{result.normalized_score.toFixed(3)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Score [-1 to +1]
                  </span>
                </div>

                <div className="space-y-1.5 mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Model Confidence</span>
                    <span className="text-white font-mono font-medium">{(result.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-[rgba(173,190,208,0.1)]">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, result.confidence * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* FinBERT Probabilities */}
              <div className="pt-5 border-t border-[rgba(173,190,208,0.08)] grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                  <div className="text-[10px] text-emerald-400 uppercase font-semibold">Positive</div>
                  <div className="text-sm font-mono font-bold text-emerald-300">
                    {(result.positive_probability * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-sky-950/20 border border-sky-500/20">
                  <div className="text-[10px] text-sky-400 uppercase font-semibold">Neutral</div>
                  <div className="text-sm font-mono font-bold text-sky-300">
                    {(result.neutral_probability * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/20">
                  <div className="text-[10px] text-rose-400 uppercase font-semibold">Negative</div>
                  <div className="text-sm font-mono font-bold text-rose-300">
                    {(result.negative_probability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Market Direction Prediction */}
            <div className="glass-panel p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">MARKET DIRECTION PREDICTION</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    result.marketDirection === 'Bullish'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : result.marketDirection === 'Bearish'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  }`}>
                    {result.marketDirection.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-black tracking-tight text-white font-mono">
                    {(result.marketDirectionProbability * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-400">Directional Probability</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mt-2 line-clamp-3">
                  {result.supportingEvidence?.[0] || 'Sentiment indicates high-probability directional bias based on FinBERT scoring.'}
                </p>
              </div>

              <div className="pt-4 border-t border-[rgba(173,190,208,0.08)]">
                <div className="text-[11px] text-slate-400 font-medium mb-1">Key Uncertainty / Macro Risk:</div>
                <div className="text-xs text-amber-300/90 italic">
                  {result.importantUncertainties?.[0] || 'Macro monetary posture and liquidity conditions remain critical.'}
                </div>
              </div>
            </div>

            {/* AI Executive Summary */}
            <div className="glass-panel p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-medium text-slate-400">AI EXECUTIVE SUMMARY</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {result.executiveSummary}
                </p>
              </div>

              <div className="pt-4 border-t border-[rgba(173,190,208,0.08)] flex items-center justify-between text-xs text-slate-400">
                <span>Sentences Evaluated:</span>
                <span className="font-mono text-white font-semibold">{result.sentenceAnalysis.length}</span>
              </div>
            </div>
          </div>

          {/* 2. Multi-Company Entity Disaggregation */}
          {result.detectedEntities && result.detectedEntities.length > 0 && (
            <div className="glass-panel p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Multi-Company Entity Sentiment Disaggregation
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {result.detectedEntities.length} identified entities
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.detectedEntities.map((ent, idx) => {
                  const colors = getSentimentColor(ent.sentiment);
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-[rgba(173,190,208,0.12)] bg-slate-900/40 hover:bg-slate-900/70 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {ent.type}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {ent.sentiment}
                          </span>
                        </div>

                        <div className="text-sm font-bold text-white mb-0.5">{ent.name}</div>
                        {ent.ticker && (
                          <div className="text-[11px] font-mono text-purple-400 mb-2">{ent.ticker}</div>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-slate-400 font-mono">
                            Score: <strong className={colors.text}>{ent.score >= 0 ? '+' : ''}{ent.score.toFixed(2)}</strong>
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400 font-mono">
                            Conf: <strong>{(ent.confidence * 100).toFixed(0)}%</strong>
                          </span>
                        </div>

                        {ent.reasons && ent.reasons.length > 0 && (
                          <div className="space-y-1 text-xs text-slate-300 border-t border-[rgba(173,190,208,0.08)] pt-2">
                            {ent.reasons.map((r, rIdx) => (
                              <p key={rIdx} className="line-clamp-2 italic text-slate-400 text-[11px]">
                                "{r}"
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Financial Impact Matrix & Detected Corporate Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Impact Breakdown */}
            <div className="glass-panel p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Financial Impact Classification</h3>
              </div>
              <div className="space-y-2.5">
                {result.financialImpacts.map((imp, idx) => {
                  const colors = getSentimentColor(imp.classification);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[rgba(173,190,208,0.1)] bg-slate-900/40 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{imp.category}</div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{imp.explanation}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${colors.badge}`}>
                        {imp.classification}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detected Events & Market Catalysts */}
            <div className="glass-panel p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Detected Financial Events & Catalysts</h3>
              </div>
              <div className="space-y-2.5">
                {result.detectedEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-purple-500/20 bg-purple-950/10 flex items-start gap-3"
                  >
                    <div className="h-2 w-2 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-purple-200">{evt.eventType}</div>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{evt.significance}</p>
                      <p className="text-[10px] text-slate-500 mt-1 italic">{evt.explanation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Strongest Statements Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positive Drivers */}
            <div className="glass-panel p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <h4 className="text-xs font-semibold uppercase tracking-wider">Strongest Bullish / Positive Statements</h4>
              </div>
              {result.strongestPositiveStatements && result.strongestPositiveStatements.length > 0 ? (
                <div className="space-y-2">
                  {result.strongestPositiveStatements.map((stmt, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-xs text-emerald-200 leading-relaxed flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>"{stmt}"</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No strong positive statements detected.</p>
              )}
            </div>

            {/* Negative Drivers */}
            <div className="glass-panel p-5 space-y-3">
              <div className="flex items-center gap-2 text-rose-400">
                <TrendingDown className="h-4 w-4" />
                <h4 className="text-xs font-semibold uppercase tracking-wider">Strongest Bearish / Negative Statements</h4>
              </div>
              {result.strongestNegativeStatements && result.strongestNegativeStatements.length > 0 ? (
                <div className="space-y-2">
                  {result.strongestNegativeStatements.map((stmt, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-rose-500/20 bg-rose-950/20 text-xs text-rose-200 leading-relaxed flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>"{stmt}"</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No strong negative statements detected.</p>
              )}
            </div>
          </div>

          {/* 5. Complete Sentence-by-Sentence Sentiment Trajectory & Table */}
          <div className="glass-panel p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-400" />
                  Full Article Sentiment Trajectory & Sentence-Level Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizes chronological sentiment evolution from opening sentence to conclusion.
                </p>
              </div>

              <button
                onClick={() => setShowAllSentences(!showAllSentences)}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition-colors"
              >
                {showAllSentences ? (
                  <>
                    Show Summary Only <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    View All {result.sentenceAnalysis.length} Sentences <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Trajectory Stepper */}
            <div className="p-4 rounded-xl border border-[rgba(173,190,208,0.1)] bg-slate-950/60 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max pb-2">
                {result.sentimentTrajectory.map((score, sIdx) => {
                  const isPos = score > 0.05;
                  const isNeg = score < -0.05;
                  const bg = isPos ? 'bg-emerald-500' : isNeg ? 'bg-rose-500' : 'bg-sky-500';
                  return (
                    <div key={sIdx} className="flex items-center gap-1.5">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-mono text-slate-500 mb-1">S{sIdx + 1}</span>
                        <div
                          className={`h-6 w-6 rounded-md ${bg} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}
                          title={`Sentence ${sIdx + 1}: Score ${score.toFixed(2)}`}
                        >
                          {score >= 0 ? '+' : ''}{score.toFixed(1)}
                        </div>
                      </div>
                      {sIdx < result.sentimentTrajectory.length - 1 && (
                        <div className="h-0.5 w-4 bg-slate-800" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sentence Breakdown List */}
            {showAllSentences && (
              <div className="space-y-2 mt-4 pt-4 border-t border-[rgba(173,190,208,0.08)] max-h-96 overflow-y-auto pr-1">
                {result.sentenceAnalysis.map((s, idx) => {
                  const colors = getSentimentColor(s.sentiment);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[rgba(173,190,208,0.08)] bg-slate-900/30 hover:bg-slate-900/60 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                          #{idx + 1}
                        </span>
                        <p className="text-slate-300 leading-relaxed font-sans">{s.sentence}</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                          {s.sentiment}
                        </span>
                        <span className={`font-bold ${colors.text}`}>
                          {s.score >= 0 ? '+' : ''}{s.score.toFixed(2)}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {(s.confidence * 100).toFixed(0)}% conf
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

