import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BrainCircuit,
  Sparkles,
  RotateCcw,
  Download,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Activity,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  PieChart,
  ShieldAlert,
  Copy,
  Check,
  Printer,
  Search,
  RefreshCw,
  BarChart2,
  ArrowUpRight,
  AlignLeft,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Gauge,
  Globe,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { CustomNewsAnalysisResult } from '../types';

interface PresetArticle {
  title: string;
  category: string;
  badgeColor: string;
  company: string;
  ticker: string;
  text: string;
}

interface StockRegistryItem {
  symbol: string;
  label: string;
  name: string;
  exchange: 'NSE' | 'BSE' | 'NYSE' | 'NASDAQ';
  currency: '₹' | '$';
  defaultLtp: number;
  aliases: string[];
}

// ── COMPREHENSIVE STOCK REGISTRY (INDIAN + GLOBAL HEAVYWEIGHTS) ──
const COMPREHENSIVE_STOCKS: StockRegistryItem[] = [
  // US / Global Equities
  { symbol: 'WMT', label: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', currency: '$', defaultLtp: 86.50, aliases: ['walmart', 'wal-mart', 'wmt'] },
  { symbol: 'AAPL', label: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', currency: '$', defaultLtp: 228.00, aliases: ['apple', 'aapl', 'iphone', 'macbook', 'ipad', 'tim cook'] },
  { symbol: 'MSFT', label: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', currency: '$', defaultLtp: 425.00, aliases: ['microsoft', 'msft', 'azure', 'windows', 'satya nadella'] },
  { symbol: 'AMZN', label: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', currency: '$', defaultLtp: 198.00, aliases: ['amazon', 'amzn', 'aws', 'jeff bezos'] },
  { symbol: 'GOOGL', label: 'GOOGL', name: 'Alphabet Inc. (Google)', exchange: 'NASDAQ', currency: '$', defaultLtp: 175.00, aliases: ['google', 'alphabet', 'googl', 'goog', 'sundar pichai'] },
  { symbol: 'TSLA', label: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', currency: '$', defaultLtp: 320.00, aliases: ['tesla', 'tsla', 'elon musk', 'cybertruck'] },
  { symbol: 'NVDA', label: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', currency: '$', defaultLtp: 142.00, aliases: ['nvidia', 'nvda', 'jensen huang'] },
  { symbol: 'META', label: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', currency: '$', defaultLtp: 585.00, aliases: ['meta', 'facebook', 'instagram', 'whatsapp', 'zuckerberg'] },
  { symbol: 'TGT', label: 'TGT', name: 'Target Corporation', exchange: 'NYSE', currency: '$', defaultLtp: 135.00, aliases: ['target', 'target stores', 'tgt'] },
  { symbol: 'NFLX', label: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', currency: '$', defaultLtp: 820.00, aliases: ['netflix', 'nflx'] },
  { symbol: 'DIS', label: 'DIS', name: 'Walt Disney Company', exchange: 'NYSE', currency: '$', defaultLtp: 115.00, aliases: ['disney', 'walt disney', 'dis'] },
  { symbol: 'INTC', label: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', currency: '$', defaultLtp: 24.50, aliases: ['intel', 'intc'] },
  { symbol: 'AMD', label: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', currency: '$', defaultLtp: 138.00, aliases: ['amd'] },

  // Indian Equities (NSE / BSE)
  { symbol: 'TCS.NS', label: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', currency: '₹', defaultLtp: 2407.50, aliases: ['tata consultancy', 'tata consultancy services', 'tcs'] },
  { symbol: 'RELIANCE.NS', label: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', currency: '₹', defaultLtp: 2981.30, aliases: ['reliance', 'reliance industries', 'jio', 'ril', 'mukesh ambani'] },
  { symbol: 'INFY.NS', label: 'INFY', name: 'Infosys', exchange: 'NSE', currency: '₹', defaultLtp: 1892.40, aliases: ['infosys', 'infy', 'salil parekh'] },
  { symbol: 'HDFCBANK.NS', label: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', currency: '₹', defaultLtp: 1680.50, aliases: ['hdfc bank', 'hdfc'] },
  { symbol: 'ICICIBANK.NS', label: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', currency: '₹', defaultLtp: 1245.00, aliases: ['icici bank', 'icici'] },
  { symbol: 'SBIN.NS', label: 'SBIN', name: 'State Bank of India', exchange: 'NSE', currency: '₹', defaultLtp: 815.20, aliases: ['state bank of india', 'sbi', 'sbin'] },
  { symbol: 'BHARTIARTL.NS', label: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE', currency: '₹', defaultLtp: 1540.00, aliases: ['bharti airtel', 'airtel'] },
  { symbol: 'ITC.NS', label: 'ITC', name: 'ITC Limited', exchange: 'NSE', currency: '₹', defaultLtp: 475.00, aliases: ['itc', 'itc limited'] },
  { symbol: 'KOTAKBANK.NS', label: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', currency: '₹', defaultLtp: 1720.00, aliases: ['kotak mahindra', 'kotak bank', 'kotak'] },
  { symbol: 'LT.NS', label: 'LT', name: 'Larsen & Toubro', exchange: 'NSE', currency: '₹', defaultLtp: 3580.00, aliases: ['larsen & toubro', 'l&t', 'lt'] },
  { symbol: 'TATAMOTORS.NS', label: 'TATAMOTORS', name: 'Tata Motors', exchange: 'NSE', currency: '₹', defaultLtp: 920.00, aliases: ['tata motors', 'tatamotors', 'jlr', 'jaguar land rover'] },
  { symbol: 'MARUTI.NS', label: 'MARUTI', name: 'Maruti Suzuki India', exchange: 'NSE', currency: '₹', defaultLtp: 11250.00, aliases: ['maruti', 'maruti suzuki'] },
  { symbol: 'SUNPHARMA.NS', label: 'SUNPHARMA', name: 'Sun Pharmaceutical', exchange: 'NSE', currency: '₹', defaultLtp: 1780.00, aliases: ['sun pharma', 'sun pharmaceutical', 'sunpharma'] },
  { symbol: 'TITAN.NS', label: 'TITAN', name: 'Titan Company', exchange: 'NSE', currency: '₹', defaultLtp: 3260.00, aliases: ['titan', 'titan company', 'tanishq'] },
  { symbol: 'BAJFINANCE.NS', label: 'BAJFINANCE', name: 'Bajaj Finance', exchange: 'NSE', currency: '₹', defaultLtp: 6920.00, aliases: ['bajaj finance', 'bajfinance'] },
  { symbol: 'ADANIENT.NS', label: 'ADANIENT', name: 'Adani Enterprises', exchange: 'NSE', currency: '₹', defaultLtp: 2840.00, aliases: ['adani enterprises', 'adani', 'gautam adani'] },
  { symbol: 'ADANIPORTS.NS', label: 'ADANIPORTS', name: 'Adani Ports & SEZ', exchange: 'NSE', currency: '₹', defaultLtp: 1220.00, aliases: ['adani ports', 'adanimports'] },
  { symbol: 'ZOMATO.NS', label: 'ZOMATO', name: 'Zomato Limited', exchange: 'NSE', currency: '₹', defaultLtp: 265.00, aliases: ['zomato', 'blinkit', 'deepinder goyal'] },
  { symbol: 'PAYTM.NS', label: 'PAYTM', name: 'One97 Communications (Paytm)', exchange: 'NSE', currency: '₹', defaultLtp: 810.00, aliases: ['paytm', 'one97'] },
  { symbol: 'NYKAA.NS', label: 'NYKAA', name: 'FSN E-Commerce (Nykaa)', exchange: 'NSE', currency: '₹', defaultLtp: 178.00, aliases: ['nykaa'] },
  { symbol: 'DMART.NS', label: 'DMART', name: 'Avenue Supermarts (DMart)', exchange: 'NSE', currency: '₹', defaultLtp: 3840.00, aliases: ['dmart', 'avenue supermarts', 'radhakishan damani'] },
  { symbol: 'WIPRO.NS', label: 'WIPRO', name: 'Wipro Limited', exchange: 'NSE', currency: '₹', defaultLtp: 560.00, aliases: ['wipro', 'wipro limited'] },
  { symbol: 'HCLTECH.NS', label: 'HCLTECH', name: 'HCL Technologies', exchange: 'NSE', currency: '₹', defaultLtp: 1840.00, aliases: ['hcl tech', 'hcl technologies', 'hcl'] },
  { symbol: 'HAL.NS', label: 'HAL', name: 'Hindustan Aeronautics Limited', exchange: 'NSE', currency: '₹', defaultLtp: 4250.00, aliases: ['hal', 'hindustan aeronautics'] },
  { symbol: 'BEL.NS', label: 'BEL', name: 'Bharat Electronics', exchange: 'NSE', currency: '₹', defaultLtp: 295.00, aliases: ['bel', 'bharat electronics'] },
  { symbol: 'VEDL.NS', label: 'VEDL', name: 'Vedanta Limited', exchange: 'NSE', currency: '₹', defaultLtp: 440.00, aliases: ['vedanta', 'vedl'] },
  { symbol: 'SUZLON.NS', label: 'SUZLON', name: 'Suzlon Energy', exchange: 'NSE', currency: '₹', defaultLtp: 62.00, aliases: ['suzlon', 'suzlon energy'] },
  { symbol: 'IRCTC.NS', label: 'IRCTC', name: 'IRCTC', exchange: 'NSE', currency: '₹', defaultLtp: 840.00, aliases: ['irctc'] },
];

// Presets for quick demos
const SAMPLE_ARTICLES: PresetArticle[] = [
  {
    title: 'Walmart Q3FY26 Results: Revenue seen up 5.3% as valuation worries linger',
    category: 'Retail / US',
    badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
    company: 'Walmart Inc.',
    ticker: 'WMT',
    text: `Walmart Q3FY26 Results: Revenue seen up 5.3% as valuation worries linger - scanx.trade

Walmart is scheduled to report its third-quarter financial results, with consensus estimates pointing to a 5.3% year-on-year revenue expansion driven by resilient grocery demand, e-commerce marketplace gains, and accelerated advertising monetization through Walmart Connect.

Operating profit margins are projected to expand 25 basis points despite persistent cost pressures and promotional discounts. However, Wall Street analysts have highlighted valuation concerns, noting that the retail bellwether trades at a premium forward multiple compared to historical five-year averages.`,
  },
  {
    title: 'TCS Q3 Profit Surges 14.8% on AI Deal Wins',
    category: 'IT / Tech',
    badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
    company: 'Tata Consultancy Services',
    ticker: 'TCS.NS',
    text: `Tata Consultancy Services (TCS) reported a stellar 14.8% jump in quarterly consolidated net profit, surpassing consensus Street estimates on strong order book wins and robust demand in North America. The IT giant announced a generous interim dividend of Rs 28 per share and expressed confidence in sustained double-digit revenue growth. CEO K. Krithivasan highlighted expanding deal momentum in generative AI and cloud infrastructure engagements.

In contrast, rival Infosys slashed its annual revenue forecast to 1.0%-2.5% following unplanned project deferrals and cautious discretionary spending among European banking clients. Operating margins compressed 120 basis points, and management flagged continued attrition in mid-level delivery units.`,
  },
  {
    title: 'Reliance Rs 75,000 Cr Green Energy & 5G Capex',
    category: 'Energy & Telecom',
    badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
    company: 'Reliance Industries',
    ticker: 'RELIANCE.NS',
    text: `Reliance Industries Limited announced a mega Rs 75,000 crore capital expenditure roadmap to commission giga-factories for solar PV modules, green hydrogen electrolyzers, and advanced energy storage systems in Jamnagar. Chairman Mukesh Ambani affirmed that the clean energy division will emerge as a cornerstone growth engine within three years.

Concurrently, Reliance Jio crossed 470 million subscribers following the nationwide rollout of standalone 5G networks, boosting blended average revenue per user (ARPU) by 8.4% year-on-year. Analysts at Morgan Stanley reaffirmed an overweight rating, citing resilient operating cash flows and balance sheet deleveraging.`,
  },
  {
    title: 'HDFC Bank Credit Expansion & Deposit Mobilization',
    category: 'Banking & NBFC',
    badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-500/30',
    company: 'HDFC Bank',
    ticker: 'HDFCBANK.NS',
    text: `HDFC Bank announced robust net interest income growth of 18% following smooth progress on deposit mobilization across semi-urban branches. Gross non-performing assets improved to 1.24%, reflecting strong asset quality and credit discipline.

However, the Reserve Bank of India (RBI) issued a revised circular on unsecured retail lending risk weights, which could moderately temper loan growth in personal credit and credit cards across the banking sector. HDFC Bank management assured investors that their Tier-1 capital adequacy of 16.8% provides ample cushion against regulatory tightening.`,
  },
  {
    title: 'Tata Motors Record JLR Revenue & EV Transition',
    category: 'Automotive & EV',
    badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
    company: 'Tata Motors',
    ticker: 'TATAMOTORS.NS',
    text: `Tata Motors delivered record quarterly EBIT margins of 8.9% driven by surging international demand for Range Rover and Defender luxury SUVs at Jaguar Land Rover (JLR). Free cash flow generation reached a record high of 860 million British pounds, allowing the parent company to accelerate debt reduction plans.

In the domestic Indian passenger market, Tata Passenger Electric Mobility expanded its EV market share to 72% behind robust demand for the Punch.ev and Nexon.ev. Management signaled accelerated capital expenditure into battery pack localization to hedge against commodity price volatility.`,
  },
];

// ── SMART ENTITY & TICKER DETECTION HEURISTIC ──
function detectStockFromText(text: string): StockRegistryItem | null {
  if (!text || !text.trim()) return null;
  const lower = text.toLowerCase();

  // 1. Direct dictionary match against aliases
  for (const stock of COMPREHENSIVE_STOCKS) {
    for (const alias of stock.aliases) {
      const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(lower)) {
        return stock;
      }
    }
  }

  // 2. Check for explicit ticker in parentheses like (WMT), (NYSE: WMT), (NSE: TCS)
  const tickerMatch = text.match(/\((?:NYSE|NASDAQ|NSE|BSE)?:\s*([A-Z0-9.\-]{1,10})\)/i) ||
                      text.match(/\b(?:Ticker|Symbol):\s*([A-Z0-9.\-]{1,10})\b/i);
  if (tickerMatch && tickerMatch[1]) {
    const rawTick = tickerMatch[1].trim().toUpperCase();
    const existing = COMPREHENSIVE_STOCKS.find(s => s.label === rawTick || s.symbol === rawTick);
    if (existing) return existing;
    return {
      symbol: rawTick,
      label: rawTick.replace(/\.(NS|BO)$/i, ''),
      name: `${rawTick} Stock`,
      exchange: rawTick.includes('.NS') ? 'NSE' : rawTick.includes('.BO') ? 'BSE' : 'NYSE',
      currency: rawTick.includes('.NS') || rawTick.includes('.BO') ? '₹' : '$',
      defaultLtp: 1000.0,
      aliases: [rawTick.toLowerCase()],
    };
  }

  // 3. Check headline subject pattern e.g. "Walmart Q3FY26 Results..."
  const headlineMatch = text.match(/^([A-Z][a-zA-Z0-9&.'-]+(?:\s+[A-Z][a-zA-Z0-9&.'-]+){0,2})\s+(?:Q[1-4]|Q[1-4]FY\d+|Results|Revenue|Profit|Reports|Shares|Stock|Announces|Acquires|Launches|Sees|Wins)/i);
  if (headlineMatch && headlineMatch[1]) {
    const candidate = headlineMatch[1].trim();
    for (const stock of COMPREHENSIVE_STOCKS) {
      if (stock.name.toLowerCase().includes(candidate.toLowerCase()) || stock.aliases.some(a => candidate.toLowerCase().includes(a))) {
        return stock;
      }
    }
    const symbolCandidate = candidate.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    return {
      symbol: symbolCandidate,
      label: symbolCandidate,
      name: candidate,
      exchange: 'NSE',
      currency: '₹',
      defaultLtp: 1500.0,
      aliases: [candidate.toLowerCase()],
    };
  }

  return null;
}

export const CustomNewsView: React.FC = () => {
  const { customNewsDraft, setCustomNewsDraft, openOrderModal } = useStore();
  const [inputText, setInputText] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [customTickerInput, setCustomTickerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CustomNewsAnalysisResult | null>(null);

  // Tab Navigation for Analysis
  const [activeSection, setActiveSection] = useState<'synthesis' | 'entities' | 'impact' | 'sentences' | 'briefing'>('synthesis');

  // Sentence filter & search
  const [sentenceFilter, setSentenceFilter] = useState<'ALL' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'>('ALL');
  const [sentenceQuery, setSentenceQuery] = useState('');
  const [selectedSentenceIdx, setSelectedSentenceIdx] = useState<number | null>(null);

  // Feedback states
  const [copiedBriefing, setCopiedBriefing] = useState(false);
  const [copiedTradeSignal, setCopiedTradeSignal] = useState(false);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Auto-detect mention of stock from input text in real-time
  const autoDetectedStock = useMemo(() => {
    return detectStockFromText(inputText);
  }, [inputText]);

  // Handle draft incoming from Sentiment View or other sources
  useEffect(() => {
    if (customNewsDraft?.text) {
      const textToAnalyze = customNewsDraft.text;
      // Intelligently auto-detect true company/stock from text first
      const detected = detectStockFromText(textToAnalyze);
      const comp = detected ? detected.name : (customNewsDraft.company || '');
      const tick = detected ? detected.symbol : (customNewsDraft.ticker || '');

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
          setActiveSection('synthesis');
        }).catch(err => {
          setError(
            err?.response?.data?.error ||
            err?.message ||
            'Unable to analyze text with FinBERT. Please ensure backend is running.'
          );
        }).finally(() => {
          setLoading(false);
        });
      }
      setCustomNewsDraft(null);
    }
  }, [customNewsDraft]);

  // Live text metrics
  const charCount = inputText.length;
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const sentenceCount = inputText.trim() ? inputText.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  // ── RESOLVE TARGET INSTRUMENT (DYNAMIC & ACCURATE, NEVER HARDCODED TO TCS) ──
  const resolvedStock = useMemo(() => {
    // 1. User explicitly selected/typed a ticker
    if (selectedTicker) {
      const clean = selectedTicker.replace(/\.(NS|BO)$/i, '').toUpperCase();
      const matched = COMPREHENSIVE_STOCKS.find(s => s.label === clean || s.symbol === clean);
      if (matched) return matched;
      return {
        symbol: selectedTicker,
        label: clean,
        name: selectedCompany || `${clean} Stock`,
        exchange: selectedTicker.includes('.NS') ? 'NSE' : selectedTicker.includes('.BO') ? 'BSE' : 'NYSE',
        currency: selectedTicker.includes('.NS') || selectedTicker.includes('.BO') ? '₹' : '$',
        defaultLtp: 1000.0,
        aliases: [clean.toLowerCase()],
      } as StockRegistryItem;
    }

    // 2. Auto-detected from article text (e.g. Walmart -> WMT)
    if (autoDetectedStock) {
      return autoDetectedStock;
    }

    // 3. Primary entity detected by FinBERT backend
    if (result?.primaryEntity?.ticker) {
      const clean = result.primaryEntity.ticker.replace(/\.(NS|BO)$/i, '').toUpperCase();
      const matched = COMPREHENSIVE_STOCKS.find(s => s.label === clean || s.symbol === clean);
      if (matched) return matched;
      return {
        symbol: result.primaryEntity.ticker,
        label: clean,
        name: result.primaryEntity.name || `${clean} Stock`,
        exchange: result.primaryEntity.ticker.includes('.NS') ? 'NSE' : 'NYSE',
        currency: result.primaryEntity.ticker.includes('.NS') ? '₹' : '$',
        defaultLtp: 1000.0,
        aliases: [clean.toLowerCase()],
      } as StockRegistryItem;
    }

    // 4. Any detected entity with ticker from FinBERT backend
    if (result?.detectedEntities && result.detectedEntities.length > 0) {
      const ent = result.detectedEntities.find(e => e.ticker);
      if (ent?.ticker) {
        const clean = ent.ticker.replace(/\.(NS|BO)$/i, '').toUpperCase();
        const matched = COMPREHENSIVE_STOCKS.find(s => s.label === clean || s.symbol === clean);
        if (matched) return matched;
        return {
          symbol: ent.ticker,
          label: clean,
          name: ent.name || `${clean} Stock`,
          exchange: 'NSE',
          currency: '₹',
          defaultLtp: 1000.0,
          aliases: [clean.toLowerCase()],
        } as StockRegistryItem;
      }
    }

    // 5. Default fallback if nothing detected or selected: null (NO DEFAULT TO TCS!)
    return null;
  }, [selectedTicker, selectedCompany, autoDetectedStock, result]);

  const cleanTicker = resolvedStock ? resolvedStock.label : '';
  const currencySymbol = resolvedStock ? resolvedStock.currency : '₹';

  // Market direction derived from NLP score (no price data needed)
  const marketBias = useMemo(() => {
    if (!result) return null;
    const score = result.normalized_score;
    if (score >= 0.38) return { label: 'STRONG BULLISH', tone: 'emerald', desc: 'High institutional conviction detected — positive catalyst dominance across majority of sentences.' };
    if (score >= 0.10) return { label: 'MILDLY BULLISH', tone: 'cyan', desc: 'Moderate positive sentiment signals momentum accumulation potential in near-term sessions.' };
    if (score <= -0.38) return { label: 'STRONG BEARISH', tone: 'rose', desc: 'Dominant negative sentiment — significant risk-off catalyst detected across the news corpus.' };
    if (score <= -0.10) return { label: 'MILDLY BEARISH', tone: 'orange', desc: 'Cautionary negative bias. Potential near-term selling pressure from adverse headline news.' };
    return { label: 'NEUTRAL / BALANCED', tone: 'amber', desc: 'Sentiment is evenly distributed. No clear directional bias — monitor for confirmation catalysts.' };
  }, [result]);

  // Execute Analysis
  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setError('Please paste or enter financial news text before running FinBERT analysis.');
      return;
    }

    setLoading(true);
    setError(null);

    // Pass resolved stock metadata to backend
    const effectiveCompany = selectedCompany || resolvedStock?.name || undefined;
    const effectiveTicker = selectedTicker || resolvedStock?.symbol || undefined;

    try {
      const data = await api.analyzeCustomNews({
        text: inputText,
        selectedCompany: effectiveCompany,
        selectedTicker: effectiveTicker,
      });
      setResult(data);
      setActiveSection('synthesis');
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
        err?.message ||
        'Unable to complete FinBERT NLP scoring. Ensure the backend server is reachable.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut: Ctrl + Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAnalyze();
    }
  };

  // Clipboard Paste Helper
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text);
        setPasteNotice('Text successfully pasted from clipboard!');
        setTimeout(() => setPasteNotice(null), 3000);
      }
    } catch {
      setPasteNotice('Please press Ctrl+V to paste news text into the editor.');
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  // Format & Clean Whitespace
  const handleFormatText = () => {
    if (!inputText) return;
    const formatted = inputText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n\n');
    setInputText(formatted);
  };

  // Clear Editor
  const handleClear = () => {
    setInputText('');
    setSelectedCompany('');
    setSelectedTicker('');
    setCustomTickerInput('');
    setResult(null);
    setError(null);
  };

  // Load Preset
  const handleLoadPreset = (sample: PresetArticle) => {
    setInputText(sample.text);
    setSelectedCompany(sample.company);
    setSelectedTicker(sample.ticker);
    setCustomTickerInput(sample.ticker);
    setError(null);
  };

  // Handle custom ticker search/input
  const handleCustomTickerSelect = (symbol: string, companyName?: string) => {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    const matched = COMPREHENSIVE_STOCKS.find(s => s.label === clean || s.symbol === clean);
    if (matched) {
      setSelectedTicker(matched.symbol);
      setSelectedCompany(matched.name);
      setCustomTickerInput(matched.label);
    } else {
      setSelectedTicker(clean);
      setSelectedCompany(companyName || `${clean} Stock`);
      setCustomTickerInput(clean);
    }
  };

  // Copy Executive Briefing (NLP-only, no price data)
  const handleCopyBriefing = () => {
    if (!result) return;
    const tickerStr = cleanTicker || 'ACTIVE ASSET';

    const textToCopy = `[FINBERT INSTITUTIONAL BRIEFING: ${tickerStr}]
Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
Overall Sentiment: ${result.sentiment.toUpperCase()} (Score: ${(result.normalized_score > 0 ? '+' : '')}${result.normalized_score.toFixed(3)})
Confidence: ${(result.confidence * 100).toFixed(0)}%
Directional Bias: ${result.marketDirection.toUpperCase()} (${(result.marketDirectionProbability * 100).toFixed(1)}%)

FinBERT Probability Distribution:
  Positive: ${(result.positive_probability * 100).toFixed(1)}%
  Neutral:  ${(result.neutral_probability * 100).toFixed(1)}%
  Negative: ${(result.negative_probability * 100).toFixed(1)}%

Executive Summary:
${result.executiveSummary}

Key Catalysts:
${result.financialImpacts.slice(0, 3).map((f: any, i: number) => `  ${i + 1}. [${f.impact}] ${f.factor}`).join('\n')}

Kotak Neo Terminal NLP Engine v2.5`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 3000);
  };

  // Copy NLP Signal (no price references)
  const handleCopyTradeSignal = () => {
    if (!result) return;
    const tickerStr = cleanTicker || 'ACTIVE ASSET';

    const textToCopy = `📊 [KOTAK NEO NLP SIGNAL: ${tickerStr}]
Sentiment: ${result.sentiment.toUpperCase()} (${result.normalized_score >= 0 ? '+' : ''}${result.normalized_score.toFixed(3)})
Conviction: ${(result.confidence * 100).toFixed(0)}%
Directional Bias: ${result.marketDirection?.toUpperCase() || 'N/A'}

FinBERT Distribution:
• Positive: ${(result.positive_probability * 100).toFixed(1)}%
• Neutral: ${(result.neutral_probability * 100).toFixed(1)}%
• Negative: ${(result.negative_probability * 100).toFixed(1)}%

Top Entity: ${result.detectedEntities?.[0]?.name || tickerStr}
Sentences Analyzed: ${result.sentenceAnalysis?.length || 0}

Generated by Kotak Neo FinBERT Terminal v2.5`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedTradeSignal(true);
    setTimeout(() => setCopiedTradeSignal(false), 3000);
  };

    navigator.clipboard.writeText(textToCopy);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 3000);
  };

  // Download Analysis JSON Report
  const handleDownloadJSON = () => {
    if (!result) return;
    const reportData = {
      title: 'FinBERT Institutional News Analysis Report',
      generatedAt: new Date().toISOString(),
      targetCompany: cleanTicker || selectedCompany || 'General',
      analysis: result,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finbert-analysis-${cleanTicker || 'news'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered Sentences
  const filteredSentences = useMemo(() => {
    if (!result) return [];
    return result.sentenceAnalysis.filter((s) => {
      const matchFilter =
        sentenceFilter === 'ALL' ||
        s.sentiment.toUpperCase() === sentenceFilter;
      const matchQuery =
        !sentenceQuery.trim() ||
        s.sentence.toLowerCase().includes(sentenceQuery.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [result, sentenceFilter, sentenceQuery]);

  return (
    <div className="space-y-6 animate-fade-up font-sans pb-12">
      {/* ── 1. HEADER BANNER ── */}
      <section className="glass-panel p-6 sm:p-7 relative overflow-hidden border border-white/10 shadow-xl rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-500/30">
                PROSUSAI / FINBERT v2.5
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                MULTI-ASSET QUANT ADVISORY
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30">
                <Globe className="w-3.5 h-3.5" />
                NSE • BSE • GLOBAL MARKETS
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <BrainCircuit className="h-5 w-5 text-cyan-300" />
                </div>
              </div>
              Custom News Sentiment & Trade Studio
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Paste breaking financial news, corporate disclosures, or earnings reports for any stock. FinBERT isolates company catalysts, extracts multi-entity sentiment, and computes risk-adjusted price objectives.
            </p>
          </div>

          {/* Quick Preset Selector */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-white/5 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Featured Corporate News Presets:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-1.5">
              {SAMPLE_ARTICLES.slice(0, 4).map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadPreset(sample)}
                  className={`px-3 py-1.5 rounded-lg border text-left transition-all text-xs font-mono flex items-center justify-between gap-2 hover:brightness-125 ${sample.badgeColor}`}
                  title={sample.title}
                >
                  <span className="font-bold">{sample.ticker.replace('.NS', '')}</span>
                  <span className="text-[10px] opacity-75">{sample.category}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. STUDIO INPUT CONSOLE ── */}
      <section className="glass-panel p-5 sm:p-6 space-y-4 rounded-2xl border border-white/10 shadow-lg">
        {/* Editor Top Bar & Action Shortcuts */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-mono transition-all shadow-sm"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              Paste Clipboard
            </button>
            <button
              type="button"
              onClick={handleFormatText}
              disabled={!inputText.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-mono transition-all disabled:opacity-40 shadow-sm"
            >
              <AlignLeft className="w-3.5 h-3.5 text-purple-400" />
              Format Text
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!inputText.trim() && !result}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-300 text-xs font-mono transition-all disabled:opacity-40 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Character & Reading Metrics */}
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span className="text-white font-medium">{wordCount} words</span>
            <span>•</span>
            <span>{charCount} characters</span>
            <span>•</span>
            <span className="text-cyan-300 font-medium">~{readingTimeMinutes} min read</span>
          </div>
        </div>

        {pasteNotice && (
          <div className="p-2.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-xs text-cyan-200 font-mono animate-fade-in flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{pasteNotice}</span>
          </div>
        )}

        {/* Text Area Input */}
        <div className="relative group">
          <textarea
            ref={textareaRef}
            rows={6}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste news headline, corporate earnings press release, regulatory notice, or broker report for ANY stock here...&#10;&#10;Examples:&#10;• 'Walmart Q3FY26 Results: Revenue seen up 5.3% as valuation worries linger...'&#10;• 'Apple unveils new generative AI chips and expands gross margins in Q4...'&#10;• 'Tata Consultancy Services (TCS) reported a stellar 14.8% jump in quarterly profit...'"
            className="w-full rounded-xl bg-slate-950/90 border border-slate-800 p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans leading-relaxed resize-y shadow-inner"
          />
          <div className="absolute right-3 bottom-3 text-[10px] font-mono text-slate-500 pointer-events-none hidden sm:block bg-slate-900/80 px-2 py-1 rounded border border-white/5">
            Press <kbd className="text-cyan-300">Ctrl</kbd> + <kbd className="text-cyan-300">Enter</kbd> to analyze
          </div>
        </div>

        {/* ── DYNAMIC TARGET INSTRUMENT & AUTO-DETECTION BAR ── */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-400" />
                Target Instrument:
              </span>
              
              {/* Auto-Detection Status Pill */}
              {autoDetectedStock ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-cyan-950/90 text-cyan-200 border border-cyan-400/60 shadow-[0_0_12px_rgba(84,214,207,0.3)] ring-1 ring-cyan-400/50">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  Auto-Detected: <strong className="text-white">{autoDetectedStock.name}</strong> ({autoDetectedStock.label})
                </span>
              ) : selectedTicker ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono bg-purple-950/90 text-purple-200 border border-purple-400/60 shadow-sm">
                  <span>Active Selection:</span> <strong className="text-white">{selectedTicker}</strong>
                </span>
              ) : (
                <span className="text-xs font-mono text-slate-500 italic">
                  Paste news or pick/type an instrument below
                </span>
              )}
            </div>

            {/* Custom Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search symbol (e.g. WMT, ZOMATO, AAPL, ITC)..."
                value={customTickerInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomTickerInput(val);
                  if (val.trim()) {
                    handleCustomTickerSelect(val);
                  } else {
                    setSelectedTicker('');
                    setSelectedCompany('');
                  }
                }}
                className="pl-9 pr-3 py-1.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 w-64 transition-all"
              />
            </div>
          </div>

          {/* Quick Instrument Chips (Dynamically Includes Detected Stock) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
            <span className="text-[11px] font-mono text-slate-400 mr-1">Quick Select:</span>

            {/* Auto-detected stock button (if present and not already in quick list) */}
            {autoDetectedStock && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTicker(autoDetectedStock.symbol);
                  setSelectedCompany(autoDetectedStock.name);
                  setCustomTickerInput(autoDetectedStock.label);
                }}
                className={`text-xs font-mono px-3 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  cleanTicker === autoDetectedStock.label
                    ? 'border-cyan-400 bg-cyan-950/90 text-cyan-200 font-bold shadow-[0_0_12px_rgba(84,214,207,0.3)] ring-1 ring-cyan-400/60'
                    : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40'
                }`}
              >
                <Sparkles className="w-3 h-3 text-cyan-300" />
                {autoDetectedStock.label} ({autoDetectedStock.name.split(' ')[0]})
              </button>
            )}

            {/* Popular Stock Pills */}
            {COMPREHENSIVE_STOCKS.slice(0, 10).map(st => {
              const isSelected = cleanTicker === st.label;
              return (
                <button
                  key={st.symbol}
                  type="button"
                  onClick={() => {
                    setSelectedTicker(st.symbol);
                    setSelectedCompany(st.name);
                    setCustomTickerInput(st.label);
                  }}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-950/90 text-cyan-200 font-bold shadow-[0_0_12px_rgba(84,214,207,0.25)] ring-1 ring-cyan-400/50'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                  title={`${st.name} (${st.exchange})`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Submit Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || !inputText.trim()}
            className="btn-primary flex items-center gap-2 px-7 py-3 text-xs sm:text-sm font-mono font-bold shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition-all disabled:opacity-40 rounded-xl"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                EVALUATING FINBERT VECTORS…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-cyan-300" />
                RUN FINBERT INTELLIGENCE {cleanTicker ? `• ${cleanTicker}` : ''}
              </>
            )}
          </button>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs sm:text-sm text-rose-200 flex items-center gap-2 font-mono">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      {/* ── 3. COMPREHENSIVE INTELLIGENCE STUDIO RESULTS ── */}
      {result && (
        <div ref={resultsRef} className="space-y-6">

          {/* ══════════════════════════════════════════════════════════════════════
              TOP HERO SIGNAL BANNER: EXECUTIVE NLP VERDICT
              ══════════════════════════════════════════════════════════════════════ */}
          <section className="glass-panel p-6 sm:p-7 rounded-2xl border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.4)] relative overflow-hidden">
            {/* Ambient Top Glow Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Target Entity (4 cols) */}
              <div className="lg:col-span-4 space-y-3 border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-6">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">TARGET ENTITY</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-400/40">
                    {resolvedStock?.exchange || 'EQUITY'} : {cleanTicker || 'ASSET'}
                  </span>
                  <span className="text-xs text-slate-300 font-mono truncate max-w-[180px]">
                    {resolvedStock?.name || selectedCompany || result.detectedEntities?.[0]?.name || 'Target Asset'}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  {result.sentenceAnalysis.length} sentences · {result.detectedEntities.length} entities detected
                </div>
              </div>

              {/* FinBERT Polarity Verdict (4 cols) */}
              <div className="lg:col-span-4 space-y-2 border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-6">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>FINBERT SENTIMENT VERDICT</span>
                  <span className="text-white font-bold">{(result.confidence * 100).toFixed(0)}% Confidence</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`px-4 py-1.5 rounded-xl text-sm font-mono font-extrabold tracking-wider border shadow-md flex items-center gap-2 ${
                    result.normalized_score >= 0.1
                      ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 shadow-emerald-900/20'
                      : result.normalized_score <= -0.1
                        ? 'border-rose-500/50 bg-rose-950/60 text-rose-300 shadow-rose-900/20'
                        : 'border-amber-500/50 bg-amber-950/60 text-amber-300 shadow-amber-900/20'
                  }`}>
                    {result.normalized_score >= 0.1 ? '▲' : result.normalized_score <= -0.1 ? '▼' : '◆'}
                    {result.sentiment.toUpperCase()} ({result.normalized_score >= 0 ? '+' : ''}{result.normalized_score.toFixed(3)})
                  </div>
                </div>

                {/* 3-Way Probability Bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-900 border border-white/5">
                    <div
                      className="bg-emerald-400 transition-all duration-500"
                      style={{ width: `${result.positive_probability * 100}%` }}
                      title={`Positive: ${(result.positive_probability * 100).toFixed(1)}%`}
                    />
                    <div
                      className="bg-amber-400 transition-all duration-500"
                      style={{ width: `${result.neutral_probability * 100}%` }}
                      title={`Neutral: ${(result.neutral_probability * 100).toFixed(1)}%`}
                    />
                    <div
                      className="bg-rose-400 transition-all duration-500"
                      style={{ width: `${result.negative_probability * 100}%` }}
                      title={`Negative: ${(result.negative_probability * 100).toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-emerald-400">{(result.positive_probability * 100).toFixed(0)}% Pos</span>
                    <span className="text-amber-400">{(result.neutral_probability * 100).toFixed(0)}% Neu</span>
                    <span className="text-rose-400">{(result.negative_probability * 100).toFixed(0)}% Neg</span>
                  </div>
                </div>
              </div>

              {/* Market Direction & Quick Export (4 cols) */}
              <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">NLP DIRECTIONAL BIAS</div>

                <div className={`px-4 py-2.5 rounded-xl text-sm font-mono font-black border text-center shadow-lg ${
                  marketBias?.tone === 'emerald' ? 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300'
                    : marketBias?.tone === 'cyan' ? 'border-cyan-500/60 bg-cyan-950/60 text-cyan-200'
                    : marketBias?.tone === 'rose' ? 'border-rose-500/60 bg-rose-950/60 text-rose-300'
                    : marketBias?.tone === 'orange' ? 'border-orange-500/60 bg-orange-950/60 text-orange-300'
                    : 'border-amber-500/60 bg-amber-950/60 text-amber-300'
                }`}>
                  {marketBias?.label || 'NEUTRAL'}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {marketBias?.desc}
                </p>

                <button
                  type="button"
                  onClick={handleCopyTradeSignal}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-all"
                >
                  {copiedTradeSignal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  {copiedTradeSignal ? 'Signal Copied!' : 'Copy NLP Signal'}
                </button>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════════════════════════
              SUB-NAVIGATION TABS
              ══════════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <button
                type="button"
                onClick={() => setActiveSection('synthesis')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
                  activeSection === 'synthesis'
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-md ring-1 ring-cyan-400/40'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                AI SYNTHESIS
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('entities')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
                  activeSection === 'entities'
                    ? 'border-purple-400 bg-purple-950/60 text-purple-200 shadow-md ring-1 ring-purple-400/40'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                ENTITIES ({result.detectedEntities.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('impact')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
                  activeSection === 'impact'
                    ? 'border-purple-400 bg-purple-950/60 text-purple-200 shadow-md ring-1 ring-purple-400/40'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <PieChart className="w-3.5 h-3.5 text-purple-400" />
                CATALYSTS & IMPACTS ({result.financialImpacts.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('sentences')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
                  activeSection === 'sentences'
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-md ring-1 ring-cyan-400/40'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                SENTENCE NLP ({result.sentenceAnalysis.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveSection('briefing')}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-all flex items-center gap-2 ${
                  activeSection === 'briefing'
                    ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200 shadow-md ring-1 ring-emerald-400/40'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                EXECUTIVE BRIEFING
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyBriefing}
                className="px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                {copiedBriefing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                {copiedBriefing ? 'Copied Briefing' : 'Copy Briefing'}
              </button>

              <button
                type="button"
                onClick={handleDownloadJSON}
                className="px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-950/40 hover:bg-purple-900/40 text-xs font-mono text-purple-200 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-purple-400" />
                Export JSON
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════
              VIEW 1: EXECUTIVE AI SYNTHESIS (CLEAN NLP — NO PRICE DATA)
              ══════════════════════════════════════════════════════════════════════ */}
          {activeSection === 'synthesis' && (
            <div className="space-y-6">

              {/* Row 1: Executive Summary + Catalyst Cards */}
              <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-purple-500/20 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Executive AI Catalyst Synthesis
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Evaluated {result.sentenceAnalysis.length} sentences · {result.detectedEntities.length} entities
                  </span>
                </div>

                <p className="text-sm text-slate-200 leading-relaxed font-sans">
                  {result.executiveSummary}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
                      <TrendingUp className="w-3 h-3" /> Primary Bullish Catalyst
                    </span>
                    <p className="text-xs text-slate-300 leading-snug">
                      {result.supportingEvidence?.[0] || 'Strong revenue momentum and institutional confidence detected.'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> Key Risk / Uncertainty
                    </span>
                    <p className="text-xs text-slate-300 leading-snug">
                      {result.importantUncertainties?.[0] || 'Broader sectoral volatility and regulatory posture to be monitored.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 2: Sentiment Deep Dive + Market Direction */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* FinBERT Probability Distribution */}
                <div className="glass-panel p-5 rounded-2xl border border-cyan-500/20 space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                      <BarChart2 className="w-4 h-4 text-cyan-400" />
                      FinBERT Probability Distribution
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                      {(result.confidence * 100).toFixed(0)}% Model Confidence
                    </span>
                  </div>

                  {/* Score meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Normalized Score</span>
                      <span className={`font-bold ${result.normalized_score > 0 ? 'text-emerald-400' : result.normalized_score < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {result.normalized_score >= 0 ? '+' : ''}{result.normalized_score.toFixed(4)}
                      </span>
                    </div>
                    <div className="relative h-3 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden">
                      <div className="absolute inset-0 flex">
                        <div className="bg-rose-500/40 w-1/2 h-full" />
                        <div className="bg-emerald-500/40 w-1/2 h-full" />
                      </div>
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-[0_0_8px_white]"
                        style={{ left: `${((result.normalized_score + 1) / 2) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>-1.0 (Max Bear)</span>
                      <span>0 (Neutral)</span>
                      <span>+1.0 (Max Bull)</span>
                    </div>
                  </div>

                  {/* Tri-class probability bars */}
                  <div className="space-y-2.5">
                    {[
                      { label: 'POSITIVE', prob: result.positive_probability, color: 'bg-emerald-500', textColor: 'text-emerald-400', borderColor: 'border-emerald-500/30' },
                      { label: 'NEUTRAL', prob: result.neutral_probability, color: 'bg-amber-500', textColor: 'text-amber-400', borderColor: 'border-amber-500/30' },
                      { label: 'NEGATIVE', prob: result.negative_probability, color: 'bg-rose-500', textColor: 'text-rose-400', borderColor: 'border-rose-500/30' },
                    ].map(cls => (
                      <div key={cls.label} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-mono">
                          <span className={`${cls.textColor} font-bold`}>{cls.label}</span>
                          <span className={`${cls.textColor} font-black text-sm`}>{(cls.prob * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                          <div
                            className={`h-full ${cls.color} rounded-full transition-all duration-700`}
                            style={{ width: `${cls.prob * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Market Direction & Conviction */}
                <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                      <Gauge className="w-4 h-4 text-purple-400" />
                      Market Direction & Conviction
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                      {(result.marketDirectionProbability * 100).toFixed(1)}% Confidence
                    </span>
                  </div>

                  {/* Direction badge */}
                  <div className={`p-4 rounded-xl text-center border ${
                    marketBias?.tone === 'emerald' ? 'border-emerald-500/40 bg-emerald-950/30'
                    : marketBias?.tone === 'cyan' ? 'border-cyan-500/40 bg-cyan-950/30'
                    : marketBias?.tone === 'rose' ? 'border-rose-500/40 bg-rose-950/30'
                    : marketBias?.tone === 'orange' ? 'border-orange-500/40 bg-orange-950/30'
                    : 'border-amber-500/40 bg-amber-950/30'
                  }`}>
                    <div className={`text-xl font-black font-mono ${
                      marketBias?.tone === 'emerald' ? 'text-emerald-300'
                      : marketBias?.tone === 'cyan' ? 'text-cyan-300'
                      : marketBias?.tone === 'rose' ? 'text-rose-300'
                      : marketBias?.tone === 'orange' ? 'text-orange-300'
                      : 'text-amber-300'
                    }`}>
                      {marketBias?.label || 'NEUTRAL / BALANCED'}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-snug">{marketBias?.desc}</p>
                  </div>

                  {/* Supporting signals */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Supporting NLP Signals</div>
                    {result.financialImpacts?.slice(0, 3).map((impact: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                          impact.impact === 'POSITIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : impact.impact === 'NEGATIVE' ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        }`}>{impact.impact?.slice(0,3)}</span>
                        <span className="text-slate-300 leading-snug">{impact.factor}</span>
                      </div>
                    ))}
                    {(!result.financialImpacts || result.financialImpacts.length === 0) && (
                      <p className="text-xs text-slate-500 italic">No explicit impact factors extracted from this article.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Top Catalysts Grid */}
              {result.financialImpacts?.length > 0 && (
                <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                      <Activity className="w-4 h-4 text-amber-400" />
                      Catalyst & Impact Factor Matrix
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{result.financialImpacts.length} factors identified</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.financialImpacts.map((impact: any, idx: number) => (
                      <div key={idx} className={`p-3.5 rounded-xl border space-y-1.5 ${
                        impact.impact === 'POSITIVE' ? 'border-emerald-500/20 bg-emerald-950/20'
                        : impact.impact === 'NEGATIVE' ? 'border-rose-500/20 bg-rose-950/20'
                        : 'border-amber-500/20 bg-amber-950/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                            impact.impact === 'POSITIVE' ? 'text-emerald-400'
                            : impact.impact === 'NEGATIVE' ? 'text-rose-400'
                            : 'text-amber-400'
                          }`}>{impact.impact}</span>
                          {impact.magnitude && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded border border-white/5">
                              {impact.magnitude}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 leading-snug">{impact.factor}</p>
                        {impact.affectedCompany && (
                          <span className="text-[10px] font-mono text-slate-500">→ {impact.affectedCompany}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

                    </span>
                  </div>

                  {/* 3 Distinct Target Cards (Ample Space) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Target 1 */}
                    <div className="rounded-xl bg-slate-900/90 p-4 border border-emerald-500/30 hover:border-emerald-500/60 transition-all shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-400 uppercase">
                        <span>Target 1 (Base)</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-[10px]">
                          {tradeSuggestion.action.includes('SELL') ? '-' : '+'}
                          {Math.abs(((tradeSuggestion.target1 - tradeSuggestion.cmp) / tradeSuggestion.cmp) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-emerald-300 mt-2">
                        {currencySymbol}{tradeSuggestion.target1.toFixed(2)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        High-probability scalp target
                      </div>
                    </div>

                    {/* Target 2 */}
                    <div className="rounded-xl bg-slate-900/90 p-4 border border-cyan-500/30 hover:border-cyan-500/60 transition-all shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-cyan-400 uppercase">
                        <span>Target 2 (Runner)</span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-[10px]">
                          {tradeSuggestion.action.includes('SELL') ? '-' : '+'}
                          {Math.abs(((tradeSuggestion.target2 - tradeSuggestion.cmp) / tradeSuggestion.cmp) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-2">
                        {currencySymbol}{tradeSuggestion.target2.toFixed(2)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        Extended momentum target
                      </div>
                    </div>

                    {/* Stop Loss */}
                    <div className="rounded-xl bg-slate-900/90 p-4 border border-rose-500/30 hover:border-rose-500/60 transition-all shadow-sm">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-rose-400 uppercase">
                        <span>Stop Loss (Risk)</span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-[10px]">
                          -{Math.abs(((tradeSuggestion.cmp - tradeSuggestion.stopLoss) / tradeSuggestion.cmp) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-rose-300 mt-2">
                        {currencySymbol}{tradeSuggestion.stopLoss.toFixed(2)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        Strict invalidation level
                      </div>
                    </div>
                  </div>

                  {/* Proportional Risk vs Reward Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-rose-400 font-medium">
                        Capped Risk: -{Math.abs(((tradeSuggestion.cmp - tradeSuggestion.stopLoss) / tradeSuggestion.cmp) * 100).toFixed(1)}%
                      </span>
                      <span className="text-emerald-400 font-medium">
                        Projected Gain: +{Math.abs(((tradeSuggestion.target2 - tradeSuggestion.cmp) / tradeSuggestion.cmp) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-slate-900 border border-white/5">
                      <div className="bg-rose-500/90 h-full rounded-l-full" style={{ width: '28%' }} title="Risk (1.2%)" />
                      <div className="bg-emerald-500/90 h-full rounded-r-full" style={{ width: '72%' }} title="Reward (3.6%)" />
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 text-center">
                      Rule: Shift stop loss to entry price (breakeven) once Target 1 is triggered.
                    </div>
                  </div>
                </div>

                {/* 3. Holding Horizon & Strategy Roadmap */}
                <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                      <Clock className="w-4 h-4 text-purple-400" />
                      Holding Horizon & Session Roadmap
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-purple-950 text-purple-300 border border-purple-500/40">
                      {tradeSuggestion.horizonTime}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-base font-bold text-white font-mono">
                      {tradeSuggestion.horizonTitle}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      {tradeSuggestion.horizonRationale}
                    </p>
                  </div>

                  {/* 4 Spacious Horizon Cards (Clickable to simulate different holding horizons!) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                      <span>Click to test different horizons:</span>
                      <span className="text-purple-300 font-bold">Stage {tradeSuggestion.timelineIndex + 1} of 4</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { label: 'Intraday', time: '0-1 Day', desc: 'Exit before close', idx: 0 },
                        { label: 'Short-Term', time: '1-3 Days', desc: 'Momentum scalp', idx: 1 },
                        { label: 'Swing Conviction', time: '3-7 Days', desc: 'Multi-session trend', idx: 2 },
                        { label: 'Positional', time: '2-4 Weeks', desc: 'Fundamental shift', idx: 3 },
                      ].map(stage => {
                        const isActive = tradeSuggestion.timelineIndex === stage.idx;
                        return (
                          <button
                            key={stage.idx}
                            type="button"
                            onClick={() => setSelectedHorizonIndex(stage.idx)}
                            className={`p-3 rounded-xl text-left border transition-all ${
                              isActive
                                ? 'border-purple-400 bg-purple-950/70 text-white shadow-[0_0_16px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/50'
                                : 'border-white/5 bg-slate-900/60 text-slate-400 hover:text-white hover:border-white/20'
                            }`}
                          >
                            <div className={`text-xs font-mono font-bold uppercase ${isActive ? 'text-purple-200' : 'text-slate-300'}`}>
                              {stage.label}
                            </div>
                            <div className={`text-[11px] font-mono mt-0.5 ${isActive ? 'text-purple-300 font-semibold' : 'text-slate-400'}`}>
                              {stage.time}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 truncate">
                              {stage.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* ── RIGHT COLUMN (5 Cols): POSITION SIZING & ONE-CLICK ORDER EXECUTION ── */}
              <div className="lg:col-span-5 space-y-6">

                {/* Capital Allocation & Risk Management Desk */}
                <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-cyan-500/30 space-y-5 shadow-xl bg-gradient-to-b from-slate-900/90 to-slate-950">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-mono font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                      <Calculator className="w-4 h-4 text-amber-400" />
                      Position Sizing Desk
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-500/40">
                      Capital Management
                    </span>
                  </div>

                  {/* Capital Preset Selectors */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Available Capital Preset:</span>
                      <span className="text-white font-bold">
                        {currencySymbol}{selectedCapital.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {[25000, 50000, 100000, 250000].map(cap => (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => setSelectedCapital(cap)}
                          className={`py-2 text-xs font-mono rounded-xl border transition-all ${
                            selectedCapital === cap
                              ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-bold shadow-md ring-1 ring-cyan-400/40'
                              : 'text-slate-400 hover:text-white bg-slate-900/60 border-white/5 hover:border-white/20'
                          }`}
                        >
                          {currencySymbol}{cap >= 100000 ? `${cap / 100000} Lakh` : `${cap / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Risk Appetite Selection */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-mono text-slate-400">Risk Model Appetite:</div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      {(['conservative', 'standard', 'aggressive'] as const).map(model => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => setRiskModel(model)}
                          className={`py-1.5 text-[11px] font-mono rounded-lg border capitalize transition-all ${
                            riskModel === model
                              ? 'bg-purple-950/80 text-purple-200 border-purple-400 font-bold'
                              : 'text-slate-400 bg-slate-900/50 border-white/5 hover:text-white'
                          }`}
                        >
                          {model} ({model === 'conservative' ? '1%' : model === 'standard' ? '2%' : '3%'})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Big Recommended Quantity Badge */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-purple-950/60 border border-cyan-500/40 space-y-1">
                    <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>RECOMMENDED POSITION SIZE</span>
                      <span className="text-cyan-400">Risk-Adjusted</span>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <div className="text-3xl font-extrabold font-mono text-cyan-300">
                        {tradeSuggestion.suggestedQty} <span className="text-sm font-normal text-slate-400">Shares</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-200">
                          {currencySymbol}{tradeSuggestion.totalOutlay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">Total Outlay</div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Projection Table */}
                  <div className="space-y-2.5 text-xs font-mono bg-slate-950/90 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between pb-1.5 border-b border-white/5">
                      <span className="text-slate-400">Indicative Entry (CMP):</span>
                      <span className="font-bold text-white">{currencySymbol}{tradeSuggestion.cmp.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-white/5">
                      <span className="text-slate-400">Target 1 Est. Profit:</span>
                      <span className="text-emerald-400 font-bold">+{currencySymbol}{tradeSuggestion.potentialGainT1.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-white/5">
                      <span className="text-slate-400">Target 2 Est. Profit:</span>
                      <span className="text-cyan-400 font-bold">+{currencySymbol}{tradeSuggestion.potentialGainT2.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span className="text-slate-400">Stop-Loss Max Risk:</span>
                      <span className="text-rose-400 font-bold">-{currencySymbol}{tradeSuggestion.potentialRiskAmount.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Giant Action Execution Button */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const actionType = tradeSuggestion.action.includes('SELL') ? 'SELL' : 'BUY';
                        openOrderModal(cleanTicker || 'EQUITY', actionType);
                      }}
                      className={`w-full py-4 rounded-xl text-sm font-mono font-black flex items-center justify-center gap-2 transition-all shadow-xl hover:brightness-110 active:scale-[0.98] ${
                        tradeSuggestion.action.includes('SELL')
                          ? 'btn-sell shadow-rose-900/30'
                          : 'btn-buy shadow-cyan-900/30'
                      }`}
                    >
                      <Zap className="w-5 h-5" />
                      EXECUTE IN PAPER • {tradeSuggestion.action.includes('SELL') ? 'SELL' : 'BUY'} {tradeSuggestion.suggestedQty} {cleanTicker || 'EQUITY'}
                    </button>

                    <div className="text-[10px] font-mono text-slate-500 text-center flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      Instant Order Routing · Kotak Neo Paper Simulated Broker
                    </div>
                  </div>

                  {/* Share & Export Desk */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleCopyTradeSignal}
                      className="flex-1 py-2 px-3 rounded-lg border border-slate-700/80 bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
                    >
                      {copiedTradeSignal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                      <span>{copiedTradeSignal ? 'Signal Copied!' : 'Copy Trade Signal'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadJSON}
                      className="py-2 px-3 rounded-lg border border-purple-500/30 bg-purple-950/40 hover:bg-purple-900/40 text-xs font-mono text-purple-200 transition-all flex items-center justify-center gap-1.5"
                      title="Download full analysis report in JSON format"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-400" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                </div>

                {/* Intraday Market Context & Technical Range */}
                <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3 shadow-md">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Technical & Volatility Context
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {tradeSuggestion.isRealQuote ? 'Real-Time Quote' : 'Simulated Bracket'}
                    </span>
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                      <span>Low: <strong className="text-slate-200">{currencySymbol}{tradeSuggestion.dayLow.toFixed(1)}</strong></span>
                      <span className="text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/20 text-[10px]">
                        {tradeSuggestion.dayRangePercent < 30 ? 'Near Day Lows' : tradeSuggestion.dayRangePercent > 70 ? 'Near Day Highs' : 'Mid Session Range'}
                      </span>
                      <span>High: <strong className="text-slate-200">{currencySymbol}{tradeSuggestion.dayHigh.toFixed(1)}</strong></span>
                    </div>

                    <div className="relative w-full bg-slate-900 rounded-full h-2 overflow-visible my-1 border border-white/5">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-500/30 via-cyan-500/30 to-emerald-500/30" />
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
                        style={{ width: `${tradeSuggestion.dayRangePercent}%` }}
                      />
                      <div
                        className="absolute -top-1 w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_10px_rgba(84,214,207,1)] -ml-2 transition-all"
                        style={{ left: `${tradeSuggestion.dayRangePercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center text-xs font-mono">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-400">52W Low</div>
                      <div className="font-bold text-slate-200">{currencySymbol}{(tradeSuggestion.dayLow * 0.85).toFixed(0)}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-400">Volume</div>
                      <div className="font-bold text-cyan-300">{(advisoryQuote?.volume || 1420500).toLocaleString('en-IN')}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                      <div className="text-[10px] text-slate-400">52W High</div>
                      <div className="font-bold text-slate-200">{currencySymbol}{(tradeSuggestion.dayHigh * 1.2).toFixed(0)}</div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              VIEW 2: MULTI-COMPANY ENTITY DISAGGREGATION
              ══════════════════════════════════════════════════════════════════════ */}
          {activeSection === 'entities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    Multi-Company Entity Sentiment Disaggregation
                  </h3>
                  <p className="text-xs text-slate-400">
                    FinBERT identifies each company mentioned in the news and separates their individual market impact
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {result.detectedEntities.length} identified corporate entities
                </span>
              </div>

              {result.detectedEntities.length === 0 ? (
                <div className="glass-panel p-8 text-center text-xs text-slate-400 font-mono rounded-2xl">
                  No distinct company entities detected in the text.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.detectedEntities.map((ent, idx) => {
                    const isPositive = ent.sentiment.toUpperCase().includes('POS');
                    const isNegative = ent.sentiment.toUpperCase().includes('NEG');
                    return (
                      <div
                        key={idx}
                        className="glass-panel p-5 rounded-2xl flex flex-col justify-between space-y-4 border border-white/10 hover:border-purple-400/40 transition-all shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                              {ent.type}
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                              isPositive
                                ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                                : isNegative
                                  ? 'border-rose-500/40 bg-rose-950/50 text-rose-300'
                                  : 'border-sky-500/40 bg-sky-950/50 text-sky-300'
                            }`}>
                              {ent.sentiment.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-base font-bold text-white">{ent.name}</div>
                          {ent.ticker && (
                            <div className="text-xs font-mono text-purple-400 font-semibold">{ent.ticker}</div>
                          )}

                          <div className="flex items-center gap-3 text-xs font-mono text-slate-400 pt-1">
                            <span>Score: <strong className={isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-sky-400'}>
                              {ent.score >= 0 ? '+' : ''}{ent.score.toFixed(2)}
                            </strong></span>
                            <span>•</span>
                            <span>Confidence: <strong className="text-white">{(ent.confidence * 100).toFixed(0)}%</strong></span>
                          </div>

                          {ent.reasons && ent.reasons.length > 0 && (
                            <div className="space-y-1 text-xs text-slate-300 border-t border-white/5 pt-2">
                              {ent.reasons.map((r, rIdx) => (
                                <p key={rIdx} className="italic text-slate-400 text-[11px] leading-relaxed">
                                  "{r}"
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        {ent.ticker && (
                          <div className="pt-3 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                handleCustomTickerSelect(ent.ticker || '', ent.name);
                                setActiveSection('advisory');
                              }}
                              className="w-full py-2 rounded-lg text-xs font-mono font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 transition-all flex items-center justify-center gap-1.5"
                            >
                              Pin to Trade Advisory Desk <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              VIEW 3: CATALYSTS & FINANCIAL IMPACTS
              ══════════════════════════════════════════════════════════════════════ */}
          {activeSection === 'impact' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Financial Impact Classification */}
              <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 shadow-md">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <PieChart className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Financial Impact Classification
                  </h3>
                </div>

                <div className="space-y-3">
                  {result.financialImpacts.map((imp, idx) => {
                    const isPos = imp.classification.toUpperCase().includes('POS');
                    const isNeg = imp.classification.toUpperCase().includes('NEG');
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-white/5 bg-slate-900/60 space-y-1.5 hover:border-white/15 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">{imp.category}</span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            isPos
                              ? 'border-emerald-500/40 bg-emerald-950/50 text-emerald-300'
                              : isNeg
                                ? 'border-rose-500/40 bg-rose-950/50 text-rose-300'
                                : 'border-sky-500/40 bg-sky-950/50 text-sky-300'
                          }`}>
                            {imp.classification.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{imp.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detected Corporate Events */}
              <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-4 shadow-md">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Detected Catalysts & Regulatory Events
                  </h3>
                </div>

                <div className="space-y-3">
                  {result.detectedEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-white/5 bg-slate-900/60 space-y-1.5 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white">{evt.eventType}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          evt.significance.toUpperCase() === 'HIGH'
                            ? 'border-purple-500/40 bg-purple-950/50 text-purple-300'
                            : 'border-slate-700 bg-slate-800 text-slate-300'
                        }`}>
                          {evt.significance.toUpperCase()} IMPACT
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{evt.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              VIEW 4: SENTENCE-BY-SENTENCE NLP FLOW
              ══════════════════════════════════════════════════════════════════════ */}
          {activeSection === 'sentences' && (
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/10 space-y-5 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Sentence-by-Sentence Sentiment Trajectory
                  </h3>
                  <p className="text-xs text-slate-400">
                    FinBERT weights evaluated individually across each discrete sentence
                  </p>
                </div>

                {/* Filter and Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/5">
                    {(['ALL', 'POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const).map(filter => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSentenceFilter(filter)}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded transition-colors ${
                          sentenceFilter === filter
                            ? 'bg-purple-600 text-white font-bold'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search sentences…"
                      value={sentenceQuery}
                      onChange={(e) => setSentenceQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs font-mono rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* DNA Heat Strip */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Sentiment Flow Strip (click segment to jump):</span>
                  <span>{result.sentenceAnalysis.length} Sentences</span>
                </div>
                <div className="flex h-3.5 w-full rounded-md overflow-hidden gap-0.5 bg-slate-950 p-0.5 border border-white/5">
                  {result.sentenceAnalysis.map((s, idx) => {
                    const isPos = s.sentiment.toUpperCase() === 'POSITIVE';
                    const isNeg = s.sentiment.toUpperCase() === 'NEGATIVE';
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedSentenceIdx(idx)}
                        title={`Sentence ${idx + 1}: ${s.sentiment} (${(s.score > 0 ? '+' : '')}${s.score.toFixed(2)})`}
                        className={`h-full flex-1 transition-all hover:opacity-100 ${
                          isPos
                            ? 'bg-emerald-500 opacity-80 hover:scale-105'
                            : isNeg
                              ? 'bg-rose-500 opacity-80 hover:scale-105'
                              : 'bg-amber-400 opacity-70 hover:scale-105'
                        } ${selectedSentenceIdx === idx ? 'ring-2 ring-white z-10 opacity-100' : ''}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Filtered Sentences List */}
              <div className="space-y-3 pt-2">
                {filteredSentences.map((sent, idx) => {
                  const isPos = sent.sentiment.toUpperCase() === 'POSITIVE';
                  const isNeg = sent.sentiment.toUpperCase() === 'NEGATIVE';
                  const isHighlighted = selectedSentenceIdx === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all space-y-2 ${
                        isHighlighted
                          ? 'border-cyan-400/60 bg-cyan-950/30 shadow-md ring-1 ring-cyan-400/40'
                          : 'border-white/5 bg-slate-900/40 hover:bg-slate-900/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-500 text-[11px]">#{idx + 1}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            isPos
                              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                              : isNeg
                                ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                                : 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                          }`}>
                            {sent.sentiment.toUpperCase()} · {sent.score >= 0 ? '+' : ''}{sent.score.toFixed(3)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                        "{sent.sentence}"
                      </p>

                      <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-2 border-t border-white/5">
                        <span>Positive: <strong className="text-emerald-400">{(sent.positive_probability * 100).toFixed(1)}%</strong></span>
                        <span>Neutral: <strong className="text-amber-400">{(sent.neutral_probability * 100).toFixed(1)}%</strong></span>
                        <span>Negative: <strong className="text-rose-400">{(sent.negative_probability * 100).toFixed(1)}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════
              VIEW 5: EXECUTIVE BRIEFING & PRINTABLE MEMO
              ══════════════════════════════════════════════════════════════════════ */}
          {activeSection === 'briefing' && (
            <div className="glass-panel p-6 sm:p-8 space-y-6 max-w-4xl mx-auto border border-emerald-500/20 rounded-2xl shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                    INSTITUTIONAL MEMORANDUM
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                    Financial News Intelligence Briefing
                  </h2>
                  <p className="text-xs text-slate-400">
                    Generated on {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyBriefing}
                    className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs font-mono"
                  >
                    {copiedBriefing ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                    {copiedBriefing ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs font-mono"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-300" />
                    Print Memo
                  </button>
                </div>
              </div>

              {/* Memo Body */}
              <div className="space-y-4 font-sans text-xs sm:text-sm text-slate-200 leading-relaxed">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    1. Executive Overview & Sentiment
                  </div>
                  <p className="text-slate-100">{result.executiveSummary}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    2. Trade Advisory & Key Price Objectives
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Stance</span>
                      <strong className="text-cyan-300">{tradeSuggestion?.action || 'HOLD'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Holding Horizon</span>
                      <strong className="text-purple-300">{tradeSuggestion?.horizonTime || '1-3 sessions'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Target 1</span>
                      <strong className="text-emerald-300">{currencySymbol}{tradeSuggestion?.target1?.toFixed(2) || '---'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Stop Loss</span>
                      <strong className="text-rose-300">{currencySymbol}{tradeSuggestion?.stopLoss?.toFixed(2) || '---'}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    3. Primary Corporate Catalysts & Drivers
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                    {result.detectedEvents.map((evt, i) => (
                      <li key={i}>
                        <strong>{evt.eventType}:</strong> {evt.explanation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
