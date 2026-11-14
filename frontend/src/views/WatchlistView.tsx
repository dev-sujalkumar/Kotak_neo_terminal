import React, { useState, useEffect } from 'react';
import { Eye, Plus, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

export const WatchlistView: React.FC = () => {
  const { setSelectedSymbol, setActiveTab, openOrderModal } = useStore();

  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [newSymbol, setNewSymbol] = useState('');
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadWatchlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getWatchlists();
      setWatchlists(res);
    } catch (err) {
      console.error(err);
      setError('Unable to load watchlists. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  const handleAddSymbol = async (watchlistId: string) => {
    if (!newSymbol.trim()) return;
    setError(null);
    setNotice(null);
    try {
      await api.addToWatchlist(watchlistId, newSymbol.trim());
      setNewSymbol('');
      setNotice(`${newSymbol.trim().toUpperCase()} added to your watchlist.`);
      await loadWatchlists();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Unable to add this symbol.');
    }
  };

  const handleCreateWatchlist = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newWatchlistName.trim()) return;
    setError(null);
    setNotice(null);
    try {
      await api.createWatchlist(newWatchlistName.trim());
      setNotice(`"${newWatchlistName.trim()}" watchlist created.`);
      setNewWatchlistName('');
      await loadWatchlists();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Unable to create watchlist.');
    }
  };

  return (
    <div className="space-y-6 font-mono animate-fade-up">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Watchlists</h2>
            <span className="badge badge-cyan">{watchlists.length} LISTS</span>
          </div>
          <p className="mt-1 text-xs text-gray-400">Keep the symbols you follow together and open analysis or trading in one click.</p>
        </div>
        <form onSubmit={handleCreateWatchlist} className="flex w-full gap-2 sm:w-auto">
          <input
            aria-label="New watchlist name"
            required
            maxLength={40}
            value={newWatchlistName}
            onChange={event => setNewWatchlistName(event.target.value)}
            placeholder="Name a new list"
            className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white sm:w-48"
          />
          <button type="submit" disabled={loading || !newWatchlistName.trim()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <Plus className="h-3.5 w-3.5" />
            CREATE LIST
          </button>
        </form>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">{notice}</div>}

      {loading ? (
        <div className="glass-panel p-8 text-center text-sm text-gray-400">Loading your watchlists…</div>
      ) : watchlists.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <Eye className="mx-auto h-9 w-9 text-gray-600" />
          <h3 className="mt-3 font-semibold text-white">Start with your first list</h3>
          <p className="mt-1 text-sm text-gray-400">Create a watchlist above, then add the symbols you want to follow.</p>
        </div>
      ) : watchlists.map((wl) => (
        <section key={wl.id} className="glass-panel space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                {wl.name}
                <span className="text-xs font-normal text-gray-400">{wl.items?.length || 0} symbols</span>
              </h3>
            </div>
            <form
              onSubmit={event => {
                event.preventDefault();
                handleAddSymbol(wl.id);
              }}
              className="flex w-full gap-2 sm:w-auto"
            >
              <input
                type="text"
                aria-label={`Symbol to add to ${wl.name}`}
                placeholder="Add symbol (e.g. RELIANCE)"
                value={newSymbol}
                onChange={event => setNewSymbol(event.target.value.toUpperCase())}
                className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white placeholder-gray-500 sm:w-56"
              />
              <button type="submit" disabled={loading || !newSymbol.trim()} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-xs">
                <Plus className="h-3.5 w-3.5" /> ADD
              </button>
            </form>
          </div>

          {wl.items?.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {wl.items.map((item: any) => (
                <div key={item.id} className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 transition-colors hover:border-cyan-500/30">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSymbol(item.instrument.symbol);
                        setActiveTab('detail');
                      }}
                      className="min-w-0 text-left"
                    >
                      <span className="block font-bold text-sm text-white hover:text-cyan-400">{item.instrument.symbol}</span>
                      <span className="block truncate text-[10px] text-gray-500">{item.instrument.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openOrderModal(item.instrument.symbol, 'BUY')}
                      className="btn-buy shrink-0 px-3 py-1.5 text-[10px]"
                    >
                      TRADE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-7 text-center text-xs text-gray-500">This list is empty. Add a symbol above to get started.</div>
          )}
        </section>
      ))}

      {!loading && (
        <button type="button" onClick={loadWatchlists} className="btn-ghost flex items-center gap-2 px-3 py-2 text-xs">
          <RefreshCw className="h-3.5 w-3.5" /> REFRESH
        </button>
      )}
    </div>
  );
};
