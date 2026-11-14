import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Cpu, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { CombinedSignal } from '../types';

interface SignalExplanationCardProps {
  signal: CombinedSignal | null;
  onTradeClick?: () => void;
  loading?: boolean;
}

const SkeletonLine = ({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) => (
  <div className={`skeleton ${h} ${w} rounded-lg`} />
);

const signalConfig = {
  STRONG_BULLISH: {
    class: 'signal-strong-bullish',
    label: '⬆ STRONG BULLISH',
    scoreClass: 'from-[rgba(0,255,136,0.15)] border-[rgba(0,255,136,0.2)]',
    barColor: '#00ff88',
    glow: 'rgba(0,255,136,0.12)',
  },
  BULLISH: {
    class: 'signal-bullish',
    label: '↗ BULLISH',
    scoreClass: 'from-[rgba(16,185,129,0.12)] border-[rgba(16,185,129,0.2)]',
    barColor: '#10b981',
    glow: 'rgba(16,185,129,0.08)',
  },
  NEUTRAL: {
    class: 'signal-neutral',
    label: '→ NEUTRAL / HOLD',
    scoreClass: 'from-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.2)]',
    barColor: '#f59e0b',
    glow: 'rgba(245,158,11,0.08)',
  },
  BEARISH: {
    class: 'signal-bearish',
    label: '↘ BEARISH',
    scoreClass: 'from-[rgba(239,68,68,0.12)] border-[rgba(239,68,68,0.2)]',
    barColor: '#ef4444',
    glow: 'rgba(239,68,68,0.08)',
  },
  STRONG_BEARISH: {
    class: 'signal-strong-bearish',
    label: '⬇ STRONG BEARISH',
    scoreClass: 'from-[rgba(255,51,102,0.12)] border-[rgba(255,51,102,0.2)]',
    barColor: '#ff3366',
    glow: 'rgba(255,51,102,0.12)',
  },
};

export const SignalExplanationCard: React.FC<SignalExplanationCardProps> = ({ signal, onTradeClick, loading = true }) => {
  if (!signal) {
    return (
      <div className="glass-panel p-5 space-y-4">
        {loading ? (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.05)]">
              <SkeletonLine w="w-44" h="h-4" />
              <SkeletonLine w="w-28" h="h-6" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(i => <SkeletonLine key={i} h="h-16" />)}
            </div>
            <SkeletonLine h="h-10" />
          </>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center text-center">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <h3 className="mt-3 text-sm font-semibold text-slate-200">Signal unavailable</h3>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
              The combined market signal could not be calculated. Check the API connection and try again.
            </p>
          </div>
        )}
      </div>
    );
  }

  const cfg = signalConfig[signal.signal] ?? signalConfig.NEUTRAL;

  const isBullish = signal.signal.includes('BULLISH');
  const isBearish = signal.signal.includes('BEARISH');

  const combinedPct = Math.min(100, Math.abs(signal.combinedScore));
  const confidencePct = Math.max(0, Math.min(100, signal.confidence));

  return (
    <div
      className="glass-panel p-5 space-y-4 animate-fade-scale relative overflow-hidden"
      style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 40px ${cfg.glow}` }}
    >
      {/* Top ambient */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: `radial-gradient(ellipse at 50% 0%, ${cfg.glow} 0%, transparent 65%)` }} />

      {/* Header */}
      <div className="relative flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[rgba(0,212,255,0.12)] flex items-center justify-center
                          border border-[rgba(0,212,255,0.2)]">
            <Cpu className="w-4 h-4 text-[#00d4ff]" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-white">AI Combined Signal</h3>
            <p className="text-[9px] font-mono text-[#4a6285]">Sentiment + Technical + Momentum</p>
          </div>
        </div>
        <span className={`badge ${cfg.class} text-[10px]`}>{cfg.label}</span>
      </div>

      {/* Combined Score Ring */}
      <div className="flex items-center gap-4">
        {/* Score donut */}
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="32" fill="none"
              stroke={cfg.barColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(combinedPct / 100) * 201} 201`}
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${cfg.barColor})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold font-mono" style={{ color: cfg.barColor }}>
              {signal.combinedScore > 0 ? '+' : ''}{signal.combinedScore.toFixed(2)}
            </span>
            <span className="text-[8px] font-mono text-[#4a6285]">SCORE</span>
          </div>
        </div>

        {/* Confidence + breakdown */}
        <div className="flex-1 space-y-2">
          <div>
            <div className="flex justify-between text-[10px] font-mono mb-1">
              <span className="text-[#4a6285]">Confidence</span>
              <span className="font-bold text-white">{confidencePct.toFixed(0)}%</span>
            </div>
            <div className="progress-track h-1.5">
              <div className="progress-fill progress-fill-cyan" style={{ width: `${confidencePct}%` }} />
            </div>
          </div>
          <div className="text-[9px] font-mono text-[#4a6285]">Updated: {new Date(signal.lastUpdated).toLocaleTimeString('en-IN')}</div>
        </div>
      </div>

      {/* Factor Score Grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Sentiment', val: signal.sentimentScore, weight: signal.weights.sentiment, color: '#a855f7' },
          { label: 'Technical', val: signal.technicalScore, weight: signal.weights.technical, color: '#00d4ff' },
          { label: 'Momentum', val: signal.momentumScore, weight: signal.weights.momentum, color: '#f59e0b' },
        ].map(f => (
          <div key={f.label}
               className="bg-[rgba(4,8,16,0.7)] border border-[rgba(255,255,255,0.05)] rounded-xl p-2.5 text-center
                          hover:border-[rgba(0,212,255,0.15)] transition-colors">
            <div className="text-[8px] font-mono text-[#4a6285] uppercase tracking-wider mb-1">{f.label}</div>
            <div className="text-sm font-bold font-mono" style={{ color: f.val > 0 ? '#00ff88' : f.val < 0 ? '#ff3366' : '#f59e0b' }}>
              {f.val > 0 ? '+' : ''}{f.val}
            </div>
            <div className="text-[8px] font-mono mt-1" style={{ color: f.color }}>
              {(f.weight * 100).toFixed(0)}% weight
            </div>
          </div>
        ))}
      </div>

      {/* Reasons & Warnings */}
      <div className="space-y-1.5">
        {signal.reasons.slice(0, 3).map((r, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px] font-mono text-[#8ba5c8]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff88] shrink-0 mt-0.5" />
            <span>{r}</span>
          </div>
        ))}
        {signal.warnings.slice(0, 2).map((w, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px] font-mono text-[#f59e0b]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] shrink-0 mt-0.5" />
            <span>{w}</span>
          </div>
        ))}
      </div>

      {/* Safety Footer + CTA */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl
                      bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.1)]">
        <div className="flex items-center gap-2 text-[9px] font-mono text-[#4a6285]">
          <ShieldAlert className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
          <span>Signal is analytical only. Explicit order confirmation required.</span>
        </div>
        {onTradeClick && (
          <button
            onClick={onTradeClick}
            className="btn-primary flex items-center gap-1.5 shrink-0 px-3 py-1.5"
          >
            <Zap className="w-3 h-3" />
            ORDER
          </button>
        )}
      </div>
    </div>
  );
};
