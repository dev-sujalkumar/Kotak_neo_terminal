import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell, Plus, Trash2, CheckCircle2, AlertTriangle, RefreshCw,
  TrendingUp, TrendingDown, Activity, Sparkles, Sliders,
  Check, X, ShieldAlert, Zap, Clock, Power
} from 'lucide-react';
import { api } from '../services/api';
import { useStore } from '../store/useStore';
import { resolveStock } from '../data/stockRegistry';

const POPULAR_SYMBOLS = ['TCS', 'RELIANCE', 'INFY', 'HDFCBANK', 'TATAMOTORS', 'SBIN'];

interface AlertPreset {
  symbol: string;
  type: string;
  target: number;
  condition: string;
  label: string;
}

const PRESET_TEMPLATES: AlertPreset[] = [
  { symbol: 'TCS', type: 'PRICE', target: 4300, condition: 'GREATER_THAN', label: 'TCS Bullish Breakout > ₹4300' },
  { symbol: 'RELIANCE', type: 'RSI', target: 30, condition: 'LESS_THAN', label: 'Reliance RSI Oversold Dip < 30' },
  { symbol: 'INFY', type: 'SENTIMENT', target: 0.60, condition: 'GREATER_THAN', label: 'Infosys FinBERT Sentiment Spike > +0.60' },
  { symbol: 'HDFCBANK', type: 'PRICE', target: 1680, condition: 'LESS_THAN', label: 'HDFC Bank Critical Support Dip < ₹1680' },
];

export const AlertsView: React.FC = () => {
  const { selectedSymbol, setSelectedSymbol } = useStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [symbol, setSymbol] = useState(selectedSymbol || 'TCS');
  const [alertType, setAlertType] = useState<'PRICE' | 'RSI' | 'SENTIMENT'>('PRICE');
  const [targetValue, setTargetValue] = useState<number>(4300);
  const [condition, setCondition] = useState<'GREATER_THAN' | 'LESS_THAN'>('GREATER_THAN');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'TRIGGERED'>('ALL');

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
    } catch (err: any) {
      setError('Unable to load alerts. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleCreateAlert = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!symbol.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.createAlert({
        symbol: symbol.trim().toUpperCase(),
        alertType,
        targetValue,
        condition,
      });
      setNotice(`Alert configured for ${symbol.toUpperCase()} (${alertType} ${condition === 'GREATER_THAN' ? '≥' : '≤'} ${targetValue}).`);
      await loadAlerts();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Unable to create alert.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (preset: AlertPreset) => {
    setSymbol(preset.symbol);
    setAlertType(preset.type as any);
    setTargetValue(preset.target);
    setCondition(preset.condition as any);
  };

  const handleDeleteAlert = async (id: string, sym: string) => {
    try {
      await api.deleteAlert(id);
      setNotice(`Alert for ${sym} deleted.`);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to delete alert.');
    }
  };

  const handleToggleAlert = async (id: string) => {
    try {
      const updated = await api.toggleAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? updated : a));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Unable to toggle alert.');
    }
  };

  const filteredAlerts = useMemo(() => {
    if (filter === 'ACTIVE') return alerts.filter(a => !a.isTriggered);
    if (filter === 'TRIGGERED') return alerts.filter(a => a.isTriggered);
    return alerts;
  }, [alerts, filter]);

  return (
    <div className="space-y-6 animate-fade-up font-sans">
      {/* ── TOP HERO BANNER ── */}
      <div className="glass-panel p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <Bell className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-amber text-[9px]">REAL-TIME SURVEILLANCE</span>
              <span className="text-[10px] font-mono text-slate-400">PRICE · RSI · FINBERT SENTIMENT TRIGGERS</span>
            </div>
            <h2 className="dashboard-hero-title text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              Price & Signal Alert Manager
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Set automated notifications for technical threshold breaks, momentum pullbacks, or institutional news sentiment spikes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAlerts()}
            disabled={loading}
            className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'SYNCING…' : 'SYNC ALERTS'}
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

      {/* ── QUICK PRESETS ── */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
          One-Click Alert Templates:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_TEMPLATES.map(preset => (
            <button
              key={preset.label}
              onClick={() => handleApplyPreset(preset)}
              className="p-3 rounded-xl text-left transition-all border border-slate-800 bg-slate-950/50 hover:border-amber-500/40 hover:bg-slate-900/60 group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono text-white group-hover:text-amber-300">
                  {preset.symbol}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {preset.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{preset.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── CREATE FORM & ALERTS LIST ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Create Form */}
        <form onSubmit={handleCreateAlert} className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white font-mono uppercase">Configure New Alert</h3>
            </div>
            <span className="badge badge-amber text-[9px]">SURVEILLANCE</span>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            {/* Symbol with hot pills */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">Scrip Symbol</label>
                <div className="flex gap-1">
                  {POPULAR_SYMBOLS.slice(0, 4).map(sym => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => setSymbol(sym)}
                      className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                        symbol === sym ? 'bg-amber-500/30 text-amber-300 font-bold' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                required
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. TCS, RELIANCE"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Alert Type Selector */}
            <div>
              <label className="block text-slate-400 mb-1">Trigger Parameter</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'PRICE', label: 'Price (₹)', icon: Zap },
                  { id: 'RSI', label: 'RSI Level', icon: Activity },
                  { id: 'SENTIMENT', label: 'NLP Score', icon: Sparkles },
                ].map(item => {
                  const isSelected = alertType === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setAlertType(item.id as any);
                        if (item.id === 'RSI') setTargetValue(30);
                        else if (item.id === 'SENTIMENT') setTargetValue(0.5);
                        else setTargetValue(4300);
                      }}
                      className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Condition: Above vs Below */}
            <div>
              <label className="block text-slate-400 mb-1">Condition</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('GREATER_THAN')}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    condition === 'GREATER_THAN'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Greater Than (≥)
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('LESS_THAN')}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    condition === 'LESS_THAN'
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  Less Than (≤)
                </button>
              </div>
            </div>

            {/* Target Value Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-400 font-medium">
                  {alertType === 'PRICE' ? 'Price Target (₹)' : alertType === 'RSI' ? 'RSI Threshold (0 - 100)' : 'Sentiment Score (-1.0 to +1.0)'}
                </label>
                <span className="text-[10px] text-amber-400 font-bold">{targetValue}</span>
              </div>
              <input
                type="number"
                step={alertType === 'SENTIMENT' ? '0.05' : '1'}
                required
                value={targetValue}
                onChange={e => setTargetValue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Bell className="w-4 h-4 fill-white" />
              <span>{saving ? 'CONFIGURING ALERT…' : 'SET MARKET ALERT'}</span>
            </button>
          </div>
        </form>

        {/* Right 2 Columns: Active & Triggered Alerts Dashboard */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white font-mono uppercase">
                  Active Surveillance Radar ({alerts.length})
                </h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${filter === 'ALL' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400'}`}
                >
                  ALL ({alerts.length})
                </button>
                <button
                  onClick={() => setFilter('ACTIVE')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${filter === 'ACTIVE' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
                >
                  ACTIVE ({alerts.filter(a => !a.isTriggered).length})
                </button>
                <button
                  onClick={() => setFilter('TRIGGERED')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${filter === 'TRIGGERED' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
                >
                  TRIGGERED ({alerts.filter(a => a.isTriggered).length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 font-mono text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Checking market alert rules…
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-mono space-y-2">
                <Bell className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-bold text-white">No Alerts Found</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Set your first price target or indicator alert on the left to monitor market conditions.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map(alert => {
                  const info = resolveStock(alert.symbol);
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
                        alert.isTriggered
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Stock info & condition */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">
                            {alert.symbol}
                          </span>
                          {info && (
                            <span className="text-[10px] text-slate-400 hidden sm:inline">
                              {info.name}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            alert.isTriggered
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}>
                            {alert.isTriggered ? 'TRIGGERED' : 'MONITORING'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                          <span className="text-amber-400 font-bold">{alert.alertType}</span>
                          <span>{alert.condition === 'GREATER_THAN' ? '≥ (rises above)' : '≤ (drops below)'}</span>
                          <span className="font-bold text-white">
                            {alert.alertType === 'PRICE' ? `₹${alert.targetValue.toLocaleString()}` : alert.targetValue}
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-500">
                          Created {new Date(alert.createdAt).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleAlert(alert.id)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                            alert.isTriggered
                              ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                              : 'border-slate-700 text-slate-400 hover:text-white'
                          }`}
                          title="Toggle Triggered State"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{alert.isTriggered ? 'Mark Active' : 'Test Trigger'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id, alert.symbol)}
                          title="Delete alert"
                          className="p-2 rounded-lg border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
