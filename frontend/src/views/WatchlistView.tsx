import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Eye, Plus, RefreshCw, Trash2, TrendingUp, TrendingDown,
  ShoppingCart, ArrowUpRight, Search, Activity, Sliders,
  Sparkles, Layers, Check, X, Building2, AlertTriangle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { QuoteData } from '../types';
import { searchStocks, resolveStock, StockInfo } from '../data/stockRegistry';

export const WatchlistView: React.FC = () => {
  const { setSelectedSymbol, setActiveTab, openOrderModal } = useStore();

  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('');
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search results for symbol autocomplete
  const searchResults = useMemo(() => {
    return searchStocks(newSymbolInput, 8);
  }, [newSymbolInput]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadWatchlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWatchlists();
      setWatchlists(res);
      if (res.length > 0 && !activeWatchlistId) {
        setActiveWatchlistId(res[0].id);
      }
    } catch (err: any) {
      setError('Unable to load watchlists. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  // Active watchlist object
  const activeWatchlist = useMemo(() => {
    return watchlists.find(w => w.id === activeWatchlistId) || watchlists[0] || null;
  }, [watchlists, activeWatchlistId]);

  // Fetch real-time quotes for all symbols in the active watchlist
  useEffect(() => {
    if (!activeWatchlist || !activeWatchlist.items || activeWatchlist.items.length === 0) {
      return;
    }

    let active = true;
    setQuotesLoading(true);

    const symbols = activeWatchlist.items.map((item: any) => item.instrument.symbol);
    Promise.allSettled(symbols.map((sym: string) => api.getQuote(sym)))
      .then(results => {
        if (!active) return;
        const newQuotes: Record<string, QuoteData> = {};
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            newQuotes[symbols[idx]] = res.value;
          }
        });
        setQuotes(prev => ({ ...prev, ...newQuotes }));
      })
      .finally(() => {
        if (active) setQuotesLoading(false);
      });

    return () => { active = false; };
  }, [activeWatchlist]);

  const handleAddSymbol = async (symbolToAdd: string) => {
    if (!symbolToAdd.trim() || !activeWatchlist) return;
    setError(null);
    setNotice(null);
    const cleanSym = symbolToAdd.trim().toUpperCase().replace(/\.(NS|BO)$/i, '');
    try {
      await api.addToWatchlist(activeWatchlist.id, cleanSym);
      setNewSymbolInput('');
      setSearchDropdownOpen(false);
      setNotice(`${cleanSym} successfully added to "${activeWatchlist.name}".`);
      await loadWatchlists();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Unable to add this symbol.');
    }
  };

  const handleRemoveItem = async (itemId: string, symbol: string) => {
    if (!activeWatchlist) return;
    try {
      await api.deleteWatchlistItem(activeWatchlist.id, itemId);
      setNotice(`${symbol} removed from "${activeWatchlist.name}".`);
      await loadWatchlists();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to remove item.');
    }
  };

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const created = await api.createWatchlist(newWatchlistName.trim());
      setNotice(`Watchlist "${newWatchlistName.trim()}" created.`);
      setNewWatchlistName('');
      setShowCreateModal(false);
      await loadWatchlists();
      if (created?.id) setActiveWatchlistId(created.id);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Unable to create watchlist.');
    }
  };

  const handleDeleteWatchlist = async (id: string, name: string) => {
    if (!window.confirm(`Delete watchlist "${name}" and all its tracked stocks?`)) return;
    try {
      await api.deleteWatchlist(id);
      setNotice(`Watchlist "${name}" deleted.`);
      const remaining = watchlists.filter(w => w.id !== id);
      setWatchlists(remaining);
      if (remaining.length > 0) setActiveWatchlistId(remaining[0].id);
      else setActiveWatchlistId('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to delete watchlist.');
    }
  };

  // Watchlist summary metrics
  const summaryMetrics = useMemo(() => {
    if (!activeWatchlist?.items) return { total: 0, gainers: 0, losers: 0, topGainer: null as any, topLoser: null as any };
    let gainers = 0;
    let losers = 0;
    let topGainer: { sym: string; pct: number } | null = null;
    let topLoser: { sym: string; pct: number } | null = null;

    activeWatchlist.items.forEach((item: any) => {
      const q = quotes[item.instrument.symbol];
      if (q) {
        if (q.change >= 0) gainers++; else losers++;
        if (!topGainer || q.changePercent > topGainer.pct) topGainer = { sym: item.instrument.symbol, pct: q.changePercent };
        if (!topLoser || q.changePercent < topLoser.pct) topLoser = { sym: item.instrument.symbol, pct: q.changePercent };
      }
    });

    return {
      total: activeWatchlist.items.length,
      gainers,
      losers,
      topGainer,
      topLoser,
    };
  }, [activeWatchlist, quotes]);

  return (
    <div className="space-y-6 animate-fade-up font-sans">
      {/* ── TOP HERO BANNER ── */}
      <div className="glass-panel p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_20px_rgba(0,212,255,0.15)]">
            <Eye className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-cyan text-[9px]">REAL-TIME RADAR</span>
              <span className="text-[10px] font-mono text-slate-400">NSE & BSE LIVE SCRIP MONITOR</span>
            </div>
            <h2 className="dashboard-hero-title text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              Watchlists & Market Radar
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Organize favorite securities, monitor live price movements, 52-week ranges, and execute 1-click orders.
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadWatchlists()}
            disabled={loading || quotesLoading}
            className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${quotesLoading ? 'animate-spin' : ''}`} />
            {quotesLoading ? 'REFRESHING…' : 'REFRESH QUOTES'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-mono"
          >
            <Plus className="w-4 h-4" />
            NEW WATCHLIST
          </button>
        </div>
      </div>

      {notice && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── WATCHLIST TABS & SEARCH ROW ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
        {/* Watchlist Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scroll-x">
          {watchlists.map(w => {
            const isActive = (w.id === activeWatchlistId) || (!activeWatchlistId && w === watchlists[0]);
            return (
              <div key={w.id} className="flex items-center gap-1">
                <button
                  onClick={() => setActiveWatchlistId(w.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-white border border-cyan-400/50 shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                      : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>{w.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {w.items?.length || 0}
                  </span>
                </button>
                {watchlists.length > 1 && (
                  <button
                    onClick={() => handleDeleteWatchlist(w.id, w.name)}
                    title={`Delete "${w.name}"`}
                    className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Add Scrip with Autocomplete */}
        <div ref={searchContainerRef} className="relative w-full sm:w-72">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={newSymbolInput}
              onChange={e => {
                setNewSymbolInput(e.target.value);
                setSearchDropdownOpen(true);
              }}
              onFocus={() => setSearchDropdownOpen(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newSymbolInput.trim()) {
                  e.preventDefault();
                  handleAddSymbol(newSymbolInput);
                }
              }}
              placeholder="Add symbol (e.g. TCS, Apple)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            {newSymbolInput && (
              <button
                onClick={() => handleAddSymbol(newSymbolInput)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-cyan-400 hover:text-cyan-300"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {searchDropdownOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-950/95 border border-cyan-500/30 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden divide-y divide-white/5">
              {searchResults.map(stock => (
                <button
                  key={stock.symbol}
                  onClick={() => handleAddSymbol(stock.symbol)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-cyan-500/10 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-xs text-white group-hover:text-cyan-300">
                      {stock.symbol}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                      {stock.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {stock.sector}
                    </span>
                    <Plus className="w-3.5 h-3.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── WATCHLIST EXECUTIVE SUMMARY BAR ── */}
      {activeWatchlist && activeWatchlist.items?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">MONITORED SCRIPS</span>
            <span className="text-xl font-bold font-mono text-white mt-1">{summaryMetrics.total} Instruments</span>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">MARKET BREADTH</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {summaryMetrics.gainers} Adv <span className="text-slate-500 text-xs">/</span> <span className="text-rose-400">{summaryMetrics.losers} Dec</span>
            </span>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">TOP GAINER</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {summaryMetrics.topGainer ? `${summaryMetrics.topGainer.sym} +${summaryMetrics.topGainer.pct.toFixed(2)}%` : '—'}
            </span>
          </div>
          <div className="glass-panel p-3.5 rounded-xl border border-slate-800">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">TOP DRAG</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1">
              {summaryMetrics.topLoser ? `${summaryMetrics.topLoser.sym} ${summaryMetrics.topLoser.pct.toFixed(2)}%` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* ── WATCHLIST TABLE ── */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-400 font-mono text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
          Loading your active watchlists…
        </div>
      ) : !activeWatchlist || !activeWatchlist.items || activeWatchlist.items.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 font-mono space-y-3">
          <Eye className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="text-base font-bold text-white">This Watchlist Is Empty</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Use the search box above to add securities like TCS, RELIANCE, INFY, or AAPL to start tracking.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {['TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'TATAMOTORS'].map(s => (
              <button
                key={s}
                onClick={() => handleAddSymbol(s)}
                className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono font-bold transition-all"
              >
                + Add {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/60 text-slate-400 font-semibold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-4">Instrument</th>
                  <th className="py-3 px-4">LTP</th>
                  <th className="py-3 px-4">Change</th>
                  <th className="py-3 px-4 hidden sm:table-cell">52-Week Range</th>
                  <th className="py-3 px-4 hidden md:table-cell">Day Range</th>
                  <th className="py-3 px-4 hidden lg:table-cell">Volume</th>
                  <th className="py-3 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px]">
                {activeWatchlist.items.map((item: any) => {
                  const sym = item.instrument.symbol;
                  const quote = quotes[sym];
                  const info = resolveStock(sym);
                  const isUp = (quote?.change ?? 0) >= 0;
                  const currency = quote?.currency === 'USD' || info?.currency === '$' ? '$' : '₹';

                  // 52W range progress
                  let rangePct = 50;
                  if (quote?.fiftyTwoWeekHigh && quote?.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh > quote.fiftyTwoWeekLow) {
                    rangePct = Math.min(100, Math.max(0,
                      ((quote.ltp - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) * 100
                    ));
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Instrument Symbol & Company */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            setSelectedSymbol(sym);
                            setActiveTab('detail');
                          }}
                          className="text-left group/btn"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs group-hover/btn:text-cyan-300 transition-colors">
                              {sym}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {item.instrument.exchangeSegment?.toUpperCase() || 'NSE'}
                            </span>
                            {info && (
                              <span className="text-[9px] font-mono text-purple-400 hidden sm:inline">
                                {info.sector}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                            {item.instrument.name || info?.name || sym}
                          </div>
                        </button>
                      </td>

                      {/* LTP */}
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {quote ? `${currency}${quote.ltp.toFixed(2)}` : <span className="skeleton h-4 w-16 block rounded" />}
                      </td>

                      {/* Change & % */}
                      <td className="py-3.5 px-4 font-bold">
                        {quote ? (
                          <div className={`flex items-center gap-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            <span>{isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
                          </div>
                        ) : (
                          <span className="skeleton h-4 w-20 block rounded" />
                        )}
                      </td>

                      {/* 52W Range Bar */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        {quote?.fiftyTwoWeekLow && quote?.fiftyTwoWeekHigh ? (
                          <div className="space-y-1 w-36">
                            <div className="flex justify-between text-[8px] text-slate-500">
                              <span>{currency}{quote.fiftyTwoWeekLow.toFixed(0)}</span>
                              <span>{currency}{quote.fiftyTwoWeekHigh.toFixed(0)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                style={{ width: `${rangePct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Day Range */}
                      <td className="py-3.5 px-4 text-slate-300 hidden md:table-cell">
                        {quote ? `${currency}${quote.low.toFixed(1)} - ${currency}${quote.high.toFixed(1)}` : '—'}
                      </td>

                      {/* Volume */}
                      <td className="py-3.5 px-4 text-slate-400 hidden lg:table-cell">
                        {quote?.volume ? quote.volume.toLocaleString() : '—'}
                      </td>

                      {/* Quick Actions: Trade & Remove */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSymbol(sym);
                              setActiveTab('technical');
                            }}
                            title="Open Technical Analysis"
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openOrderModal(sym, 'BUY')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white text-[10px] font-bold transition-all"
                          >
                            BUY
                          </button>
                          <button
                            onClick={() => openOrderModal(sym, 'SELL')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-white text-[10px] font-bold transition-all"
                          >
                            SELL
                          </button>
                          <button
                            onClick={() => handleRemoveItem(item.id, sym)}
                            title="Remove from watchlist"
                            className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE WATCHLIST MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-cyan-500/30 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold font-mono text-white">Create New Watchlist</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWatchlist} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">Watchlist Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={40}
                  value={newWatchlistName}
                  onChange={e => setNewWatchlistName(e.target.value)}
                  placeholder="e.g. High Growth Tech, EV Sector, Dividend Core"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!newWatchlistName.trim()}
                  className="btn-primary px-5 py-2 text-xs font-mono disabled:opacity-50"
                >
                  CREATE LIST
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
