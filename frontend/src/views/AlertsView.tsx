import React, { useState, useEffect } from 'react';
import { Bell, Plus, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export const AlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [symbol, setSymbol] = useState('TCS');
  const [alertType, setAlertType] = useState('PRICE');
  const [targetValue, setTargetValue] = useState(4300);
  const [condition, setCondition] = useState('GREATER_THAN');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAlerts();
      setAlerts(res);
    } catch (err) {
      console.error(err);
      setError('Unable to load alerts. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.createAlert({
        symbol: symbol.toUpperCase(),
        alertType,
        targetValue,
        condition,
      });
      setNotice(`Alert created for ${symbol.toUpperCase()}.`);
      await loadAlerts();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Unable to create alert.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-mono animate-fade-up">
      <div className="glass-panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-white">Price & Signal Alerts</h2>
            <p className="mt-1 text-xs text-gray-400">Set a condition and get notified when a market threshold is reached.</p>
          </div>
        </div>
        <span className="badge badge-cyan">{alerts.length} ALERTS</span>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">{notice}</div>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <form onSubmit={handleCreateAlert} className="glass-panel space-y-4 p-5 text-xs">
          <h3 className="border-b border-gray-800 pb-3 text-sm font-bold text-white">Create an alert</h3>
          <div>
            <label className="block text-gray-400 mb-1">Symbol</label>
            <input
              type="text"
              required
              maxLength={20}
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Alert Trigger Parameter</label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white"
            >
              <option value="PRICE">PRICE TARGET</option>
              <option value="RSI">RSI LEVEL</option>
              <option value="SENTIMENT">SENTIMENT SCORE</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white"
            >
              <option value="GREATER_THAN">Above</option>
              <option value="LESS_THAN">Below</option>
              <option value="EQUALS">Equals</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 mb-1">Target value</label>
            <input
              type="number"
              required
              step="0.1"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-cyan-400 font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !symbol.trim()}
            className="w-full rounded-lg bg-amber-600 py-2.5 font-bold text-white transition-all hover:bg-amber-500"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> {saving ? 'CREATING…' : 'CREATE ALERT'}
            </span>
          </button>
        </form>

        <div className="glass-panel space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Your alerts</h3>
            <button type="button" onClick={loadAlerts} disabled={loading} aria-label="Refresh alerts" className="btn-ghost p-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading alerts…</div>
          ) : alerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-700 py-10 text-center text-xs text-gray-500">
              No alerts yet. Create one to keep an eye on a symbol.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((al) => (
                <div key={al.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/70 p-4 text-xs">
                  <div>
                    <div className="font-bold text-white">{al.symbol}</div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      {al.alertType} {al.condition === 'GREATER_THAN' ? 'above' : al.condition === 'LESS_THAN' ? 'below' : 'at'} {al.targetValue}
                    </div>
                  </div>
                  <span className="badge badge-cyan">ACTIVE</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
