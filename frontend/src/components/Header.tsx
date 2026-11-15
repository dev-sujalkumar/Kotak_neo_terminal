import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, ShieldAlert, ShieldCheck, Zap, Activity,
  Layers, Menu, TrendingUp, TrendingDown, ArrowUpRight, Sparkles, Building2, Check
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { searchStocks, resolveStock, StockInfo, MASTER_STOCK_REGISTRY, SECTOR_FILTERS } from '../data/stockRegistry';

// Mini ticker item
const TickerItem: React.FC<{ symbol: string; price: string; change: number; pct: string }> = ({ symbol, price, change, pct }) => (
  <div className="inline-flex items-center gap-2 px-4 border-r border-[rgba(255,255,255,0.05)] whitespace-nowrap">
    <span className="text-[10px] font-mono font-bold text-[#8ba5c8]">{symbol}</span>
    <span className="text-[10px] font-mono font-semibold text-white">{price}</span>
    <span className={`flex items-center gap-0.5 text-[9px] font-mono font-bold ${change >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
      {change >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {change >= 0 ? '+' : ''}{pct}%
    </span>
  </div>
);

export const Header: React.FC<{ onMenuClick: () => void }> = ({ onMenuClick }) => {
  const {
    selectedSymbol,
    setSelectedSymbol,
    setActiveTab,
    tradingMode,
    isTradingModeVerified,
    setTradingMode,
    isKotakConnected,
    openOrderModal
  } = useStore();

  const [searchInput, setSearchInput] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [activeSectorFilter, setActiveSectorFilter] = useState<string>('ALL');
  const [currentTime, setCurrentTime] = useState(new Date());
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    return searchStocks(searchInput, 20, activeSectorFilter);
  }, [searchInput, activeSectorFilter]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setSearchDropdownOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelectStock = (stock: StockInfo) => {
    setSelectedSymbol(stock.symbol);
    setActiveTab('detail');
    setSearchInput('');
    setSearchDropdownOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (highlightedIndex >= 0 && searchResults[highlightedIndex]) {
      handleSelectStock(searchResults[highlightedIndex]);
      return;
    }
    const trimmed = searchInput.trim();
    if (!trimmed) return;
    const resolved = resolveStock(trimmed);
    if (resolved) {
      handleSelectStock(resolved);
    } else {
      setSelectedSymbol(trimmed.toUpperCase().replace(/\.(NS|BO)$/i, ''));
      setActiveTab('detail');
      setSearchInput('');
      setSearchDropdownOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchDropdownOpen(true);
      setHighlightedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Escape') {
      setSearchDropdownOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const switchMode = async (newMode: 'PAPER' | 'LIVE') => {
    if (newMode === tradingMode) return;
    if (newMode === 'LIVE' && !isKotakConnected) {
      window.alert('Connect Kotak Neo before switching to LIVE mode.');
      setActiveTab('kotak-setup');
      return;
    }
    if (newMode === 'LIVE' && !window.confirm('Switch to LIVE trading? Orders can place real trades using your broker account.')) return;
    try {
      await api.switchTradingMode(newMode);
      setTradingMode(newMode);
    } catch (err: any) {
      window.alert(err.response?.data?.error || err.message);
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: '2-digit', month: 'short' });

  const isMarketOpen = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(currentTime);
    const value = (type: string) => parts.find(part => part.type === type)?.value || '';
    const h = Number(value('hour')), m = Number(value('minute'));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'));
    const mins = h * 60 + m;
    return day >= 1 && day <= 5 && mins >= 555 && mins < 930;
  };

  const marketOpen = isMarketOpen();

  // Static placeholder ticker data (would be live in production)
  const tickerData = [
    { symbol: 'NIFTY 50', price: '24,316.65', change: 0.42, pct: '0.42' },
    { symbol: 'SENSEX', price: '79,802.79', change: 0.38, pct: '0.38' },
    { symbol: 'BANKNIFTY', price: '52,418.90', change: -0.21, pct: '0.21' },
    { symbol: 'TCS', price: '4,218.50', change: 1.24, pct: '1.24' },
    { symbol: 'RELIANCE', price: '2,981.30', change: -0.65, pct: '0.65' },
    { symbol: 'INFY', price: '1,892.40', change: 0.87, pct: '0.87' },
    { symbol: 'HDFCBANK', price: '1,724.60', change: 0.33, pct: '0.33' },
    { symbol: 'SBIN', price: '812.45', change: -0.44, pct: '0.44' },
    { symbol: 'GOLD', price: '72,845', change: 0.15, pct: '0.15' },
    { symbol: 'USD/INR', price: '84.12', change: -0.08, pct: '0.08' },
  ];

  return (
    <header className="app-header sticky top-0 z-40 flex flex-col">
      {/* Main Header Row */}
      <div className="app-header-row flex-1 flex items-center justify-between px-4 lg:px-6
                      bg-[rgba(10,15,23,0.95)] backdrop-blur-2xl
                      border-b border-[rgba(173,190,208,0.1)]
                      shadow-[0_8px_28px_rgba(0,0,0,0.3)]">

        {/* LEFT: Brand + Market Status */}
        <div className="flex items-center gap-2 sm:gap-5 shrink-0 animate-fade-left">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Toggle navigation"
            className="inline-flex items-center justify-center rounded-lg p-2 text-[#8ba5c8] hover:bg-white/5 hover:text-white md:hidden border border-[rgba(173,190,208,0.1)] transition-all"
          >
            <Menu className="h-4 w-4" />
          </button>
          {/* Logo */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="app-brand flex items-center gap-2.5 group"
          >
            <div className="app-brand-mark relative w-9 h-9 rounded-xl
                            flex items-center justify-center
                            group-hover:shadow-[0_0_30px_rgba(84,214,207,0.6)] transition-all duration-300">
              <Activity className="w-4 h-4 text-white relative z-10" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#00ff88] rounded-full animate-dot-blink
                              shadow-[0_0_8px_rgba(0,255,136,0.9)]" />
            </div>
            <div className="app-brand-copy">
              <div className="text-sm font-bold tracking-widest text-white font-mono leading-none">
                NEO<span className="gradient-text">TERMINAL</span>
              </div>
              <div className="text-[9px] text-[#4a6285] font-mono leading-none mt-0.5 tracking-wider">KOTAK SENTIMENT ENGINE v2.0</div>
            </div>
          </button>

          {/* Market Status + Clock */}
          <div className="hidden lg:flex items-center gap-3 pl-4 border-l border-[rgba(255,255,255,0.06)]">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-mono font-bold
                            transition-all duration-300
                            ${marketOpen
                              ? 'bg-[rgba(0,255,136,0.08)] text-[#00ff88] border border-[rgba(0,255,136,0.2)] shadow-[0_0_12px_rgba(0,255,136,0.1)]'
                              : 'bg-[rgba(245,158,11,0.08)] text-[#f59e0b] border border-[rgba(245,158,11,0.2)]'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'bg-[#00ff88] animate-dot-blink' : 'bg-[#f59e0b]'}`} />
              {marketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
            </div>
            <div className="text-[10px] font-mono text-[#4a6285]">
              <span className="text-[#8ba5c8] tabular-nums">{formatTime(currentTime)}</span>
              <span className="ml-1.5 text-[#2a3f5f]">IST</span>
              <span className="ml-2 text-[#4a6285]">{formatDate(currentTime)}</span>
            </div>
          </div>
        </div>

        {/* CENTER: Search with Autocomplete */}
        <div
          ref={searchContainerRef}
          className="app-search relative min-w-0 w-36 sm:w-64 md:w-80 lg:w-96 transition-all duration-300 z-30"
        >
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none z-10 transition-colors ${
              searchFocused ? 'text-cyan-400' : 'text-[#4a6285]'
            }`} />
            <input
              ref={inputRef}
              aria-label="Search stock symbol"
              type="text"
              placeholder="Search 150+ stocks (e.g. Tata Motors, Zomato, WMT)..."
              value={searchInput}
              onChange={e => {
                setSearchInput(e.target.value);
                setSearchDropdownOpen(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => {
                setSearchFocused(true);
                setSearchDropdownOpen(true);
              }}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={handleKeyDown}
              className="w-full h-10 bg-[rgba(255,255,255,0.04)] border border-[rgba(173,190,208,0.15)] rounded-xl
                         pl-9 pr-14 text-xs font-mono text-white placeholder-[#4a6285]
                         focus:outline-none focus:border-[rgba(84,214,207,0.5)]
                         focus:shadow-[0_0_0_3px_rgba(84,214,207,0.1),0_0_20px_rgba(84,214,207,0.1)]
                         focus:bg-[rgba(255,255,255,0.06)]
                         transition-all duration-200"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#4a6285]
                            bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]
                            px-1.5 py-0.5 rounded-md pointer-events-none">⌘K</kbd>
          </form>

          {/* Autocomplete Dropdown */}
          {searchDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-[#090e17]/95 border border-[rgba(84,214,207,0.3)] shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden divide-y divide-white/5 animate-fade-in">
              <div className="p-2.5 bg-slate-950/70 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-300">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  {searchInput.trim() ? `Search Results (${searchResults.length})` : 'Popular & Trending Equities'}
                </span>
                <span className="text-slate-500 hidden sm:inline">↑↓ Navigate · ↵ Select</span>
              </div>

              {/* Sector Filter Chips */}
              <div className="px-2.5 py-1.5 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto scroll-x border-b border-white/5">
                {SECTOR_FILTERS.map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setActiveSectorFilter(sec)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold whitespace-nowrap transition-all ${
                      activeSectorFilter === sec
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(84,214,207,0.2)]'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>

              <div className="max-h-80 overflow-y-auto p-1.5 space-y-1 scroll-y">
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center space-y-2">
                    <p className="text-xs text-slate-400">No exact matches in registry for &ldquo;{searchInput}&rdquo;</p>
                    <button
                      type="button"
                      onClick={() => handleSearchSubmit()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono hover:bg-cyan-500/20"
                    >
                      Search live quote for &ldquo;{searchInput.toUpperCase()}&rdquo; <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  searchResults.map((stock, idx) => {
                    const isSelected = selectedSymbol === stock.symbol;
                    const isHighlighted = highlightedIndex === idx;

                    return (
                      <button
                        key={stock.symbol}
                        type="button"
                        onClick={() => handleSelectStock(stock)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-3 group ${
                          isHighlighted
                            ? 'bg-cyan-500/15 border border-cyan-500/30'
                            : isSelected
                              ? 'bg-white/5 border border-white/10'
                              : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                            stock.exchange === 'NSE'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                              : stock.exchange === 'BSE'
                                ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30'
                                : 'bg-purple-950/60 text-purple-400 border border-purple-500/30'
                          }`}>
                            {stock.symbol.slice(0, 3)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                                {stock.symbol}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold uppercase ${
                                stock.exchange === 'NSE'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : stock.exchange === 'BSE'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}>
                                {stock.exchange}
                              </span>
                              {isSelected && (
                                <span className="flex items-center gap-0.5 text-[8px] font-mono text-cyan-400 font-bold">
                                  <Check className="w-2.5 h-2.5" /> ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 truncate font-sans">
                              {stock.name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-bold text-slate-200">
                            {stock.currency}{stock.defaultLtp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            {stock.sector}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom Quick Chips for Top Categories */}
              <div className="p-2 bg-slate-950/80 flex items-center justify-between text-[10px] font-mono text-slate-400 overflow-x-auto scroll-x gap-2">
                <span className="text-slate-500 shrink-0">Popular:</span>
                <div className="flex items-center gap-1.5">
                  {['TATAMOTORS', 'RELIANCE', 'ZOMATO', 'WMT', 'AAPL', 'HDFCBANK', 'TCS'].map(quickSym => {
                    const st = MASTER_STOCK_REGISTRY.find(s => s.symbol === quickSym);
                    if (!st) return null;
                    return (
                      <button
                        key={quickSym}
                        type="button"
                        onClick={() => handleSelectStock(st)}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/30 text-[9px] transition-all"
                      >
                        {quickSym}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Controls */}
        <div className="app-header-controls flex items-center gap-2 lg:gap-3 shrink-0 animate-fade-right">
          {/* Trading Mode Toggle */}
          <div className="hidden sm:flex items-center bg-[rgba(255,255,255,0.03)] border border-[rgba(173,190,208,0.1)] rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => switchMode('PAPER')}
              disabled={!isTradingModeVerified}
              title={!isTradingModeVerified ? 'Verifying trading mode' : 'Switch to paper trading'}
              aria-pressed={tradingMode === 'PAPER'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200
                ${tradingMode === 'PAPER'
                  ? 'bg-gradient-to-r from-[rgba(221,164,68,0.18)] to-[rgba(221,164,68,0.1)] text-[#e4bd72] border border-[rgba(221,164,68,0.25)] shadow-[0_0_10px_rgba(221,164,68,0.12)]'
                  : 'text-[#637286] hover:text-[#a2afbd]'}`}
            >
              <Layers className="w-3 h-3" />
              PAPER
            </button>
            <button
              type="button"
              onClick={() => switchMode('LIVE')}
              disabled={!isTradingModeVerified}
              title={!isTradingModeVerified ? 'Verifying trading mode' : 'Switch to live trading'}
              aria-pressed={tradingMode === 'LIVE'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all duration-200
                ${tradingMode === 'LIVE'
                  ? 'bg-gradient-to-r from-[rgba(46,179,131,0.18)] to-[rgba(46,179,131,0.1)] text-[#65d5a8] border border-[rgba(46,179,131,0.25)] shadow-[0_0_10px_rgba(46,179,131,0.12)]'
                  : 'text-[#637286] hover:text-[#a2afbd]'}`}
            >
              <Zap className="w-3 h-3" />
              LIVE
            </button>
          </div>

          {/* Kotak Connection */}
          <button
            onClick={() => setActiveTab('kotak-setup')}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[10px] font-mono font-bold border transition-all duration-200
              ${isKotakConnected
                ? 'bg-[rgba(46,179,131,0.07)] border-[rgba(46,179,131,0.2)] text-[#65d5a8] hover:bg-[rgba(46,179,131,0.12)] hover:border-[rgba(46,179,131,0.35)] hover:shadow-[0_0_12px_rgba(46,179,131,0.12)]'
                : 'bg-[rgba(198,76,90,0.07)] border-[rgba(198,76,90,0.2)] text-[#d87885] hover:bg-[rgba(198,76,90,0.12)] hover:border-[rgba(198,76,90,0.35)]'}`}
          >
            {isKotakConnected
              ? <ShieldCheck className="w-3.5 h-3.5" />
              : <ShieldAlert className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isKotakConnected ? 'NEO CONNECTED' : 'OFFLINE'}</span>
          </button>

          {/* Quick Trade Button */}
          <button
            onClick={() => openOrderModal(selectedSymbol, 'BUY')}
            disabled={!isTradingModeVerified}
            title={!isTradingModeVerified ? 'Trading mode verification is required before placing orders' : 'Open order ticket'}
            className="btn-buy h-10 px-4 text-[10px] font-mono font-bold flex items-center gap-1.5 whitespace-nowrap relative overflow-hidden"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            TRADE
          </button>
        </div>
      </div>

      {/* Market Ticker Strip */}
      <div className="bg-[rgba(8,13,20,0.98)] border-b border-[rgba(173,190,208,0.07)] overflow-hidden h-7 flex items-center">
        <div className="shrink-0 px-3 h-full flex items-center border-r border-[rgba(173,190,208,0.08)] bg-[rgba(84,214,207,0.04)]">
          <span className="text-[8px] font-mono font-bold text-[#54d6cf] tracking-widest uppercase">LIVE</span>
          <span className="ml-1.5 w-1 h-1 rounded-full bg-[#54d6cf] animate-dot-blink"></span>
        </div>
        <div className="ticker-wrap flex-1">
          <div className="ticker-inner">
            {[...tickerData, ...tickerData].map((item, i) => (
              <TickerItem key={i} {...item} />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
