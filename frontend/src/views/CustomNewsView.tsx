import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCheck,
  FileEdit,
  FileText,
  Globe,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  Zap,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import type { CustomNewsAnalysisResult, ExtractedPdfDocument } from '../types';

const STOCKS = [
  { symbol: 'TCS.NS', label: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE' },
  { symbol: 'RELIANCE.NS', label: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE' },
  { symbol: 'HDFCBANK.NS', label: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE' },
  { symbol: 'INFY.NS', label: 'INFY', name: 'Infosys Limited', exchange: 'NSE' },
  { symbol: 'ICICIBANK.NS', label: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE' },
  { symbol: 'TATAMOTORS.NS', label: 'TATAMOTORS', name: 'Tata Motors', exchange: 'NSE' },
  { symbol: 'SBIN.NS', label: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
  { symbol: 'AAPL', label: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
  { symbol: 'MSFT', label: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  { symbol: 'NVDA', label: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
];

const PRELOADED_TEMPLATES = [
  {
    id: 'tcs-beat',
    title: 'TCS Q3 Financial Results Beat (Bullish)',
    symbol: 'TCS.NS',
    company: 'Tata Consultancy Services',
    tag: 'Earnings Beat',
    tagColor: 'emerald',
    text: `Tata Consultancy Services (TCS) reported a robust 14.8% YoY jump in consolidated net profit to ₹12,434 crore for the quarter, outperforming Bloomberg street estimates. Operating revenue expanded 8.2% to ₹64,259 crore driven by double-digit deal ramp-ups in cloud infrastructure and generative AI transformations. CEO K. Krithivasan highlighted that the order book Total Contract Value (TCV) stood at an all-time quarterly high of $10.2 billion with broad-based acceleration across BFSI and North American enterprise customers. Operating margins expanded 60 bps to 25.1%, reflecting tight cost discipline and disciplined pricing power. The board recommended an interim dividend of ₹27 per share. Management reiterated confident guidance for sustained double-digit pipeline conversion in coming quarters.`,
  },
  {
    id: 'reliance-expansion',
    title: 'Reliance 5G & Retail Expansion (Bullish)',
    symbol: 'RELIANCE.NS',
    company: 'Reliance Industries',
    tag: 'Expansion & Capex',
    tagColor: 'cyan',
    text: `Reliance Industries Limited delivered strong quarterly EBITDA growth of 16.2% YoY to ₹44,678 crore, spearheaded by relentless subscriber gains in Jio Infocomm and rapid store footprint rollout in Reliance Retail. Jio added 11.2 million net 5G subscribers, pushing average revenue per user (ARPU) up to ₹182.7. The consumer businesses contributed over 52% of consolidated EBITDA, underscoring resilient domestic consumption dynamics. In addition, the Oil-to-Chemicals (O2C) segment posted steady downstream margins supported by strong export demand. Chairman Mukesh Ambani announced accelerated capital expenditure in gigawatt-scale green hydrogen and solar gigafactories, reinforcing long-term sustainable valuation upside.`,
  },
  {
    id: 'bank-caution',
    title: 'Banking Sector Regulatory Audit & NIM Drag (Bearish)',
    symbol: 'HDFCBANK.NS',
    company: 'HDFC Bank',
    tag: 'Regulatory Drag',
    tagColor: 'rose',
    text: `Regulatory scrutiny intensified following the central bank audit, which flagged elevated credit-deposit ratios and demanded a higher statutory risk weight on unsecured consumer lending. Net Interest Margin (NIM) compressed by 28 bps sequentially to 3.42%, pressured by aggressive retail deposit rate hikes and rising cost of funds. Gross non-performing assets (GNPA) in the micro-finance and credit card segment ticked up 35 bps. Analysts warned that tightened capital adequacy buffers would constrain loan origination velocity over the next two fiscal quarters, triggering sharp valuation multiples de-rating across brokerages.`,
  },
  {
    id: 'it-guidance-cut',
    title: 'IT Sector Spending Slowdown & Guidance Cut (Bearish)',
    symbol: 'INFY.NS',
    company: 'Infosys Limited',
    tag: 'Guidance Cut',
    tagColor: 'amber',
    text: `Infosys slashed its annual constant-currency revenue growth guidance band to 1.5%-2.5% from 4.0%-7.0%, citing abrupt discretionary IT budget freezes, delayed client decision cycles, and renegotiation of legacy service contracts across European retail and manufacturing clients. Operating margins narrowed to 20.8% due to underutilized bench capacity and wage increments. Management acknowledged persistent macro headwinds, cautious client sentiment, and deferred cloud migrations, warning of subdued hiring and pricing pressure for the forthcoming fiscal year.`,
  },
];

function detectStockFromText(text: string) {
  if (!text || !text.trim()) return null;
  const lower = text.toLowerCase();
  const match = STOCKS.find((stock) => {
    const alias = stock.label.toLowerCase();
    const namePart = stock.name.toLowerCase().split(' ')[0];
    return lower.includes(alias) || lower.includes(namePart);
  });
  return match ?? null;
}

export const CustomNewsView: React.FC = () => {
  const { customNewsDraft, openOrderModal, setActiveTab, setSelectedSymbol } = useStore();

  // Input states
  const [activeInputMode, setActiveInputMode] = useState<'pdf' | 'text' | 'templates'>('pdf');
  const [inputText, setInputText] = useState(customNewsDraft?.text ?? '');
  const [selectedCompany, setSelectedCompany] = useState(customNewsDraft?.company ?? '');
  const [selectedTicker, setSelectedTicker] = useState(customNewsDraft?.ticker ?? '');

  // PDF specific states
  const [uploadedPdfDoc, setUploadedPdfDoc] = useState<ExtractedPdfDocument | null>(null);
  const [pdfExtracting, setPdfExtracting] = useState(false);
  const [pdfExtractError, setPdfExtractError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showExtractedPreview, setShowExtractedPreview] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [autoAnalyzeOnUpload, setAutoAnalyzeOnUpload] = useState(false);

  // Analysis states
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomNewsAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeResultTab, setActiveResultTab] = useState<'overview' | 'catalysts' | 'entities' | 'sentences'>('overview');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect stock whenever input text updates
  const detectedStock = useMemo(() => detectStockFromText(inputText), [inputText]);
  const analysisSymbol = (selectedTicker || detectedStock?.symbol || '').trim().replace(/\.(NS|BO)$/i, '');

  useEffect(() => {
    if (!customNewsDraft) return;
    setInputText(customNewsDraft.text ?? '');
    setSelectedCompany(customNewsDraft.company ?? '');
    setSelectedTicker(customNewsDraft.ticker ?? '');
    setActiveInputMode('text');
  }, [customNewsDraft]);

  // Handle PDF / Document extraction
  const processUploadedFile = async (file: File) => {
    setPdfExtractError(null);
    setPdfExtracting(true);

    try {
      const isTextFile = file.name.match(/\.(txt|md|csv|json)$/i);

      if (isTextFile) {
        const text = await file.text();
        const extracted: ExtractedPdfDocument = {
          text,
          pageCount: 1,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          charCount: text.length,
          fileName: file.name,
          fileSizeBytes: file.size,
        };
        setUploadedPdfDoc(extracted);
        setInputText(extracted.text);

        const detected = detectStockFromText(extracted.text);
        if (detected) {
          setSelectedTicker(detected.symbol);
          setSelectedCompany(detected.name);
        }

        if (autoAnalyzeOnUpload) {
          setTimeout(() => triggerAnalysis(extracted.text, detected?.symbol, detected?.name), 200);
        }
      } else {
        // PDF or binary document: read via native browser FileReader
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const b64 = res.includes(',') ? res.split(',')[1] : res;
            resolve(b64);
          };
          reader.onerror = () => reject(new Error('Failed to read document file.'));
          reader.readAsDataURL(file);
        });

        const extracted = await api.extractPdfText({
          base64Data,
          fileName: file.name,
        });

        if (!extracted.text || extracted.text.trim().length === 0) {
          throw new Error('No readable text found in PDF. The file might contain scanned images without embedded text.');
        }

        setUploadedPdfDoc(extracted);
        setInputText(extracted.text);

        const detected = detectStockFromText(extracted.text);
        if (detected) {
          setSelectedTicker(detected.symbol);
          setSelectedCompany(detected.name);
        }

        if (autoAnalyzeOnUpload) {
          setTimeout(() => triggerAnalysis(extracted.text, detected?.symbol, detected?.name), 200);
        }
      }
    } catch (err: any) {
      const message =
        err?.response?.status === 413
          ? 'File is too large for upload (Maximum limit is 50MB). Please choose a smaller PDF or copy & paste text directly.'
          : err?.response?.data?.error || err?.message || 'Failed to extract text from file.';
      setPdfExtractError(message);
    } finally {
      setPdfExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const triggerAnalysis = async (textToAnalyze?: string, ticker?: string, company?: string) => {
    const targetText = textToAnalyze ?? inputText;
    if (!targetText || !targetText.trim()) {
      setError('Please provide news text or upload a PDF report before analyzing.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisStep('Tokenizing financial document chunks...');

    try {
      setTimeout(() => setAnalysisStep('Evaluating FinBERT contextual sentiment...'), 600);
      setTimeout(() => setAnalysisStep('Mapping corporate entities & risk factors...'), 1200);

      const payload = {
        text: targetText,
        selectedCompany: company || selectedCompany || detectedStock?.name,
        selectedTicker: ticker || selectedTicker || detectedStock?.symbol,
      };

      const data = await api.analyzeCustomNews(payload);
      setResult(data);
      setActiveResultTab('overview');
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Unable to analyze news content right now.');
    } finally {
      setLoading(false);
      setAnalysisStep('');
    }
  };

  const handleCopySummary = async () => {
    if (!result) return;
    const summary = `--- KOTAK NEO FINBERT NLP INTELLIGENCE REPORT ---
Symbol: ${analysisSymbol || 'N/A'}
Sentiment Verdict: ${result.sentiment} (Normalized Score: ${result.normalized_score >= 0 ? '+' : ''}${result.normalized_score.toFixed(3)})
Model Confidence: ${(result.confidence * 100).toFixed(1)}%
Directional Bias: ${result.marketDirection} (${(result.marketDirectionProbability * 100).toFixed(1)}%)
Probabilities: Positive ${(result.positive_probability * 100).toFixed(1)}% | Neutral ${(result.neutral_probability * 100).toFixed(1)}% | Negative ${(result.negative_probability * 100).toFixed(1)}%

Executive Summary:
${result.executiveSummary || 'N/A'}

Entities Detected: ${result.detectedEntities.map((e) => `${e.name} (${e.sentiment})`).join(', ') || 'None'}
`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadReport = () => {
    if (!result) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FinBERT_Analysis_${analysisSymbol || 'Report'}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Keyword highlighting helper
  const filteredHighlightedText = useMemo(() => {
    if (!inputText) return '';
    if (!searchFilter.trim()) return inputText;

    const regex = new RegExp(`(${searchFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return inputText.replace(regex, '==HIGHLIGHT==$1==ENDHIGHLIGHT==');
  }, [inputText, searchFilter]);

  const matchesCount = useMemo(() => {
    if (!searchFilter.trim() || !inputText) return 0;
    const regex = new RegExp(searchFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = inputText.match(regex);
    return matches ? matches.length : 0;
  }, [inputText, searchFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <section className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950/80 via-slate-900/60 to-purple-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-purple-600/30">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300 font-bold">
                  PROSUSAI / FINBERT v2.5
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                  PDF ENGINE ACTIVE
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">News & Document Analyser</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Analyze financial earnings PDFs, regulatory circulars, broker notes, and real-time news with deep institutional NLP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={autoAnalyzeOnUpload}
                onChange={(e) => setAutoAnalyzeOnUpload(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
              />
              <span className="font-mono text-[11px]">Auto-Analyze on Upload</span>
            </label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-950/30 text-purple-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Asset AI</span>
            </div>
          </div>
        </div>

        {/* 2. Mode Selector Navigation Tabs */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveInputMode('pdf')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                activeInputMode === 'pdf'
                  ? 'bg-gradient-to-r from-purple-600/30 to-cyan-500/30 border border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <span>Upload PDF / Report</span>
              {uploadedPdfDoc && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveInputMode('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                activeInputMode === 'text'
                  ? 'bg-gradient-to-r from-purple-600/30 to-cyan-500/30 border border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <FileEdit className="w-4 h-4 text-purple-400" />
              <span>Paste News Text</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveInputMode('templates')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all ${
                activeInputMode === 'templates'
                  ? 'bg-gradient-to-r from-purple-600/30 to-cyan-500/30 border border-cyan-500/50 text-white shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Sample Filings (4)</span>
            </button>
          </div>

          {inputText && (
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span>{inputText.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
              <span>•</span>
              <span>{inputText.length.toLocaleString()} characters</span>
              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  setUploadedPdfDoc(null);
                  setSelectedTicker('');
                  setSelectedCompany('');
                  setResult(null);
                }}
                className="text-slate-500 hover:text-rose-400 transition-colors ml-2"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* 3. Input Mode Sections */}
        <div className="mt-4">
          {/* TAB 1: PDF UPLOAD */}
          {activeInputMode === 'pdf' && (
            <div className="space-y-4">
              {!uploadedPdfDoc ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all duration-200 text-center ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
                      : 'border-slate-800 hover:border-purple-500/60 bg-slate-900/40 hover:bg-slate-900/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.txt,.md,.csv,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-inner">
                    {pdfExtracting ? (
                      <RefreshCw className="w-7 h-7 animate-spin text-purple-400" />
                    ) : (
                      <UploadCloud className="w-7 h-7" />
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    {pdfExtracting ? 'Extracting Financial Text from PDF...' : 'Click or Drag & Drop Financial PDF Report'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Upload Earnings Releases, Annual Reports, RBI Statements, Broker Research Notes, or SEBI Filings (.pdf, .txt, .md).
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[10px] font-mono text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-800/80">PDF Documents</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/80">Native Stream Decompression</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/80">Up to 25MB</span>
                  </div>
                </div>
              ) : (
                /* Document Summary Card */
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                        <FileCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{uploadedPdfDoc.fileName || 'Financial_Document.pdf'}</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                            Parsed Successfully
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-0.5">
                          {uploadedPdfDoc.fileSizeBytes && (
                            <span>{(uploadedPdfDoc.fileSizeBytes / 1024).toFixed(1)} KB</span>
                          )}
                          <span>•</span>
                          <span>{uploadedPdfDoc.pageCount} {uploadedPdfDoc.pageCount === 1 ? 'Page' : 'Pages'}</span>
                          <span>•</span>
                          <span>{uploadedPdfDoc.wordCount.toLocaleString()} Words</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowExtractedPreview(!showExtractedPreview)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-mono text-slate-300 hover:text-white"
                      >
                        {showExtractedPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showExtractedPreview ? 'Hide Text' : 'View Text'}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-mono text-slate-300 hover:text-white"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Replace File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPdfDoc(null);
                          setInputText('');
                        }}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400"
                        title="Remove document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Extracted Document Viewer & Keyword Search */}
                  {showExtractedPreview && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <div className="relative flex-1 max-w-sm">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                          <input
                            type="text"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            placeholder="Search keywords (e.g. EBITDA, margin, penalty)..."
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/80 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        {searchFilter.trim() && (
                          <span className="text-[11px] font-mono text-cyan-400">
                            {matchesCount} {matchesCount === 1 ? 'match' : 'matches'} found
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <textarea
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          placeholder="Extracted financial text..."
                          className="w-full min-h-[160px] max-h-[300px] rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-xs text-slate-200 font-mono leading-relaxed placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {pdfExtractError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-300 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{pdfExtractError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PASTE TEXT */}
          {activeInputMode === 'text' && (
            <div className="space-y-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste earnings announcement, quarterly report, management commentary, or news text here..."
                className="w-full min-h-[170px] rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 leading-relaxed font-sans"
              />
            </div>
          )}

          {/* TAB 3: PRE-LOADED SAMPLES */}
          {activeInputMode === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PRELOADED_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setInputText(tmpl.text);
                    setSelectedTicker(tmpl.symbol);
                    setSelectedCompany(tmpl.company);
                    setUploadedPdfDoc(null);
                    setActiveInputMode('text');
                  }}
                  className="text-left rounded-xl border border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 hover:bg-slate-900 p-3.5 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {tmpl.title}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                        tmpl.tagColor === 'emerald'
                          ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                          : tmpl.tagColor === 'cyan'
                          ? 'border-cyan-500/30 bg-cyan-950/30 text-cyan-300'
                          : tmpl.tagColor === 'rose'
                          ? 'border-rose-500/30 bg-rose-950/30 text-rose-300'
                          : 'border-amber-500/30 bg-amber-950/30 text-amber-300'
                      }`}
                    >
                      {tmpl.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {tmpl.text}
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-cyan-400/80">
                    Symbol: {tmpl.symbol} • Click to Load
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Stock Association Chips */}
        <div className="mt-5 space-y-2 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
            <span>Link with Stock Symbol for Instant Order Execution:</span>
            {detectedStock && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Detected: {detectedStock.name} ({detectedStock.symbol})
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {STOCKS.map((stock) => {
              const isSelected = (selectedTicker || detectedStock?.symbol) === stock.symbol;
              return (
                <button
                  key={stock.symbol}
                  type="button"
                  onClick={() => {
                    setSelectedTicker(stock.symbol);
                    setSelectedCompany(stock.name);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 shadow-sm shadow-cyan-500/20'
                      : 'border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  {stock.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Action Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="text-xs font-mono text-slate-400">
            {analysisSymbol ? (
              <span>Target Asset: <strong className="text-cyan-300">{analysisSymbol}</strong></span>
            ) : (
              <span className="text-slate-500">No stock selected (Model will auto-detect from text)</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => triggerAnalysis()}
            disabled={loading || !inputText.trim()}
            className="btn-primary flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wide shadow-xl shadow-purple-600/30 disabled:opacity-40"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" /> : <Zap className="w-4 h-4 text-cyan-300" />}
            <span>{loading ? 'ANALYZING DOCUMENT...' : 'RUN FINBERT NLP ANALYSIS'}</span>
          </button>
        </div>

        {loading && analysisStep && (
          <div className="mt-3 flex items-center gap-2 text-xs font-mono text-cyan-300 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{analysisStep}</span>
          </div>
        )}
      </section>

      {/* 6. Error Notice */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 7. Comprehensive Interactive Results View */}
      {result && (
        <section className="space-y-5">
          {/* Main Verdict & KPI Cards */}
          <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg ${
                    result.sentiment.toUpperCase() === 'POSITIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/20'
                      : result.sentiment.toUpperCase() === 'NEGATIVE'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-rose-500/20'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-500/20'
                  }`}
                >
                  {result.sentiment.toUpperCase() === 'POSITIVE' ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : result.sentiment.toUpperCase() === 'NEGATIVE' ? (
                    <TrendingDown className="w-6 h-6" />
                  ) : (
                    <Layers className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400 font-bold">
                    FINBERT AI SENTIMENT VERDICT
                  </div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-white tracking-tight">{result.sentiment}</h3>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        result.normalized_score >= 0.15
                          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                          : result.normalized_score <= -0.15
                          ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                          : 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                      }`}
                    >
                      SCORE: {result.normalized_score >= 0 ? '+' : ''}{result.normalized_score.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copied ? 'Copied' : 'Copy Summary'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-200 hover:text-white"
                  title="Download JSON analysis report"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* Tri-Color Probability Distribution Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-semibold">Positive {(result.positive_probability * 100).toFixed(1)}%</span>
                <span className="text-amber-400 font-semibold">Neutral {(result.neutral_probability * 100).toFixed(1)}%</span>
                <span className="text-rose-400 font-semibold">Negative {(result.negative_probability * 100).toFixed(1)}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-900 overflow-hidden flex shadow-inner border border-slate-800">
                <div
                  style={{ width: `${Math.max(2, result.positive_probability * 100)}%` }}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                />
                <div
                  style={{ width: `${Math.max(2, result.neutral_probability * 100)}%` }}
                  className="bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                />
                <div
                  style={{ width: `${Math.max(2, result.negative_probability * 100)}%` }}
                  className="bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-500"
                />
              </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Model Confidence</div>
                <div className="text-xl font-bold text-white mt-1">{(result.confidence * 100).toFixed(1)}%</div>
                <div className="text-[10px] font-mono text-cyan-400 mt-0.5">High Conviction</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Market Direction</div>
                <div className="text-xl font-bold text-white mt-1">{result.marketDirection || 'Neutral'}</div>
                <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                  {(result.marketDirectionProbability * 100).toFixed(1)}% Probability
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Word Count</div>
                <div className="text-xl font-bold text-white mt-1">{result.wordCount.toLocaleString()}</div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">{result.paragraphCount} Paragraphs</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Entities Detected</div>
                <div className="text-xl font-bold text-white mt-1">{result.detectedEntities.length}</div>
                <div className="text-[10px] font-mono text-purple-400 mt-0.5">
                  {result.primaryEntity?.name || 'Primary: Auto'}
                </div>
              </div>
            </div>

            {/* Kotak Trading Action Strip */}
            <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-purple-950/30 p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                  KOTAK TRADE ACTION RECOMMENDED
                </div>
                <div className="text-base font-bold text-white mt-0.5">
                  {result.sentiment.toUpperCase() === 'POSITIVE'
                    ? 'STRONG BUY / ACCUMULATE'
                    : result.sentiment.toUpperCase() === 'NEGATIVE'
                    ? 'SELL / REDUCE EXPOSURE'
                    : 'HOLD / NEUTRAL BIAS'}
                  {analysisSymbol && <span className="text-cyan-400 ml-2">[{analysisSymbol}]</span>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {analysisSymbol && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSymbol(analysisSymbol);
                      setActiveTab('detail');
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-mono text-slate-200 hover:border-cyan-500/50 hover:text-white"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                    Deep Analysis
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openOrderModal(analysisSymbol || 'TCS', 'BUY')}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/80 px-4 py-2 text-xs font-mono font-bold text-emerald-300"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Quick Buy {analysisSymbol}
                </button>

                <button
                  type="button"
                  onClick={() => openOrderModal(analysisSymbol || 'TCS', 'SELL')}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/60 hover:bg-rose-900/80 px-4 py-2 text-xs font-mono font-bold text-rose-300"
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  Quick Sell {analysisSymbol}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Sub-Tabs for Deep Dive */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveResultTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                activeResultTab === 'overview'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Executive Summary & Impacts
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('catalysts')}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                activeResultTab === 'catalysts'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Catalysts & Risk Vectors ({result.strongestPositiveStatements.length + result.strongestNegativeStatements.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('entities')}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                activeResultTab === 'entities'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entities & Tickers ({result.detectedEntities.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveResultTab('sentences')}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                activeResultTab === 'sentences'
                  ? 'bg-slate-800 text-white font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sentence NLP Breakdown ({result.sentenceAnalysis.length})
            </button>
          </div>

          {/* SUB-TAB 1: Overview & Executive Summary */}
          {activeResultTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  AI EXECUTIVE SYNTHESIS
                </div>
                <p className="text-sm leading-relaxed text-slate-200">
                  {result.executiveSummary || 'No executive summary provided by the model for this text.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  FINANCIAL IMPACT BY CATEGORY
                </div>
                <div className="space-y-2.5">
                  {result.financialImpacts && result.financialImpacts.length > 0 ? (
                    result.financialImpacts.map((impact, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-slate-200">{impact.category}</span>
                          <span className="font-mono text-[11px] text-cyan-300">{impact.classification}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{impact.explanation}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400">No category impacts detected.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: Catalysts & Risks */}
          {activeResultTab === 'catalysts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Key Positive Catalysts ({result.strongestPositiveStatements.length})</span>
                </div>
                <div className="space-y-2">
                  {result.strongestPositiveStatements.length > 0 ? (
                    result.strongestPositiveStatements.map((stmt, idx) => (
                      <div key={idx} className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-3 text-xs text-emerald-200 leading-relaxed">
                        "{stmt}"
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">No significant positive catalyst statements extracted.</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Key Negative Risks & Uncertainties ({result.strongestNegativeStatements.length})</span>
                </div>
                <div className="space-y-2">
                  {result.strongestNegativeStatements.length > 0 ? (
                    result.strongestNegativeStatements.map((stmt, idx) => (
                      <div key={idx} className="rounded-xl border border-rose-500/20 bg-rose-950/30 p-3 text-xs text-rose-200 leading-relaxed">
                        "{stmt}"
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-500 italic">No significant negative risk statements extracted.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: Entities & Mentions */}
          {activeResultTab === 'entities' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold mb-4">
                DETECTED CORPORATE ENTITIES & ASSETS
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {result.detectedEntities.length > 0 ? (
                  result.detectedEntities.map((entity, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{entity.name}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            entity.sentiment === 'POSITIVE'
                              ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                              : entity.sentiment === 'NEGATIVE'
                              ? 'border-rose-500/30 bg-rose-950/40 text-rose-300'
                              : 'border-amber-500/30 bg-amber-950/40 text-amber-300'
                          }`}
                        >
                          {entity.sentiment}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Type: {entity.type} {entity.ticker && `• Ticker: ${entity.ticker}`}
                      </div>
                      <div className="text-[10px] font-mono text-cyan-400">
                        Score: {entity.score >= 0 ? '+' : ''}{entity.score.toFixed(2)} • Confidence: {(entity.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 col-span-3">No distinct entities extracted.</div>
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 4: Sentence NLP Breakdown */}
          {activeResultTab === 'sentences' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                SENTENCE-BY-SENTENCE FINBERT CLASSIFICATION
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {result.sentenceAnalysis.map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-3 text-xs leading-relaxed flex items-start justify-between gap-3 ${
                      item.sentiment === 'POSITIVE'
                        ? 'border-emerald-500/20 bg-emerald-950/20 text-slate-200'
                        : item.sentiment === 'NEGATIVE'
                        ? 'border-rose-500/20 bg-rose-950/20 text-slate-200'
                        : 'border-slate-800 bg-slate-950/50 text-slate-300'
                    }`}
                  >
                    <span>"{item.sentence}"</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border flex-shrink-0 ${
                        item.sentiment === 'POSITIVE'
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40'
                          : item.sentiment === 'NEGATIVE'
                          ? 'border-rose-500/40 text-rose-400 bg-rose-950/40'
                          : 'border-slate-700 text-slate-400 bg-slate-900'
                      }`}
                    >
                      {item.sentiment} ({item.score >= 0 ? '+' : ''}{item.score.toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
