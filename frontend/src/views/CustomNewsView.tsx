import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BarChart2, Check, Copy, Globe, RefreshCw, Search, Sparkles, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import type { CustomNewsAnalysisResult } from '../types';

const STOCKS = [
  { symbol: 'TCS.NS', label: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE' },
  { symbol: 'RELIANCE.NS', label: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE' },
  { symbol: 'HDFCBANK.NS', label: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE' },
  { symbol: 'AAPL', label: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', label: 'MSFT', name: 'Microsoft', exchange: 'NASDAQ' },
  { symbol: 'WMT', label: 'WMT', name: 'Walmart', exchange: 'NYSE' },
];

function detectStockFromText(text: string) {
  if (!text || !text.trim()) return null;
  const lower = text.toLowerCase();
  const match = STOCKS.find((stock) => {
    const alias = stock.label.toLowerCase();
    return lower.includes(alias.toLowerCase()) || lower.includes(stock.name.toLowerCase().split(' ')[0]);
  });
  return match ?? null;
}

export const CustomNewsView: React.FC = () => {
  const { customNewsDraft, openOrderModal, setActiveTab, setSelectedSymbol } = useStore();
  const [inputText, setInputText] = useState(customNewsDraft?.text ?? '');
  const [selectedCompany, setSelectedCompany] = useState(customNewsDraft?.company ?? '');
  const [selectedTicker, setSelectedTicker] = useState(customNewsDraft?.ticker ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomNewsAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const detectedStock = useMemo(() => detectStockFromText(inputText), [inputText]);
  const analysisSymbol = (selectedTicker || detectedStock?.symbol || '').trim().replace(/\.(NS|BO)$/i, '');

  useEffect(() => {
    if (!customNewsDraft) return;
    setInputText(customNewsDraft.text ?? '');
    setSelectedCompany(customNewsDraft.company ?? '');
    setSelectedTicker(customNewsDraft.ticker ?? '');
  }, [customNewsDraft]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Add some news text or article content before analyzing.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        text: inputText,
        selectedCompany: selectedCompany || detectedStock?.name,
        selectedTicker: selectedTicker || detectedStock?.symbol,
      };
      const data = await api.analyzeCustomNews(payload);
      setResult(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to analyze custom news right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    const summary = `${result.sentiment} (${result.normalized_score >= 0 ? '+' : ''}${result.normalized_score.toFixed(3)})\nConfidence: ${(result.confidence * 100).toFixed(0)}%\nEntities: ${result.detectedEntities.length}`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300">PROSUSAI / FINBERT v2.5</div>
              <h2 className="text-xl font-bold text-white">Custom News Intelligence</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-cyan-200 text-[10px] font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            Multi-Asset Quant Advisory
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Paste company or market news text to analyze with FinBERT:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">Test Samples:</span>
              <button
                type="button"
                onClick={() => {
                  setInputText('Tata Consultancy Services reported a 14.5% YoY rise in consolidated net profit to ₹12,434 crore, with strong order book expansion across North America and BFSI verticals.');
                  setSelectedTicker('TCS.NS');
                  setSelectedCompany('Tata Consultancy Services');
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:text-white"
              >
                Earnings Beat (Bullish)
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputText('Regulatory authorities imposed penalties and warned of compliance lapses, triggering valuation worries and sharp margin compression across the division.');
                  setSelectedTicker('');
                  setSelectedCompany('');
                }}
                className="text-[10px] px-2 py-0.5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:text-white"
              >
                Regulatory Drag (Bearish)
              </button>
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste a quarterly report, earnings call, company update, or headline analysis here..."
            className="w-full min-h-[150px] rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
          />

          <div className="flex flex-wrap items-center gap-2">
            {STOCKS.map((stock) => (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => {
                  setSelectedTicker(stock.symbol);
                  setSelectedCompany(stock.name);
                  setInputText((prev) => prev || `${stock.name} reported an update. ${stock.label} is in focus.`);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-[10px] font-mono text-slate-300 hover:text-white hover:border-cyan-500/40"
              >
                {stock.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <div className="text-[11px] text-slate-400 font-mono">
              {detectedStock ? `Detected: ${detectedStock.name} (${detectedStock.symbol})` : 'No stock detected yet'}
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !inputText.trim()}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold shadow-lg shadow-purple-600/20 disabled:opacity-40"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? 'ANALYZING...' : 'RUN FINBERT ANALYSIS'}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <section className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-white/10 pb-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">AI SENTIMENT VERDICT</div>
              <h3 className="text-2xl font-bold text-white">{result.sentiment}</h3>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              {copied ? 'Copied' : 'Copy summary'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">Positive</div>
              <div className="text-2xl font-bold text-emerald-300">{(result.positive_probability * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">Neutral</div>
              <div className="text-2xl font-bold text-amber-300">{(result.neutral_probability * 100).toFixed(1)}%</div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-rose-300">Negative</div>
              <div className="text-2xl font-bold text-rose-300">{(result.negative_probability * 100).toFixed(1)}%</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Executive summary</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{result.executiveSummary || 'No executive summary was returned by the model for this input.'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Primary entities</div>
              <div className="mt-3 space-y-2">
                {result.detectedEntities.length > 0 ? (
                  result.detectedEntities.slice(0, 5).map((entity, index) => (
                    <div key={`${entity.name}-${index}`} className="flex items-center justify-between text-sm text-slate-200">
                      <span>{entity.name}</span>
                      <span className="font-mono text-cyan-300">{entity.sentiment}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">No direct entities detected.</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Trade action</div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-lg font-bold text-white">{result.sentiment === 'POSITIVE' ? 'BUY' : result.sentiment === 'NEGATIVE' ? 'SELL' : 'HOLD'}</div>
                <div className="flex flex-wrap justify-end gap-2">
                  {analysisSymbol && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSymbol(analysisSymbol);
                        setActiveTab('detail');
                      }}
                      className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      Analyze {analysisSymbol}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openOrderModal(analysisSymbol || 'TCS', result.sentiment === 'NEGATIVE' ? 'SELL' : 'BUY')}
                    className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-mono text-cyan-200"
                  >
                    Open order <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
