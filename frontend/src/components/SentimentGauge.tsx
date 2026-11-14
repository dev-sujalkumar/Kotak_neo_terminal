import React from 'react';
import { BrainCircuit, Clock, Sparkles, TrendingUp, TrendingDown, Minus, Newspaper } from 'lucide-react';
import { SentimentAnalysis } from '../types';

interface SentimentGaugeProps {
  sentiment: SentimentAnalysis | null;
  loading?: boolean;
}

const SkeletonLine = ({ w = 'w-full', h = 'h-3' }: { w?: string; h?: string }) => (
  <div className={`skeleton ${h} ${w} rounded-lg`} />
);

export const SentimentGauge: React.FC<SentimentGaugeProps> = ({ sentiment, loading = true }) => {
  if (!sentiment) {
    return (
      <div className="glass-panel p-5 space-y-4">
        {loading ? (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.05)]">
              <SkeletonLine w="w-40" h="h-4" />
              <SkeletonLine w="w-20" h="h-6" />
            </div>
            <SkeletonLine h="h-4" />
            <SkeletonLine h="h-2" />
            <div className="space-y-3 pt-3">
              <SkeletonLine h="h-2" />
              <SkeletonLine h="h-2" />
              <SkeletonLine h="h-2" />
            </div>
          </>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center text-center">
            <Newspaper className="h-6 w-6 text-slate-500" />
            <h3 className="mt-3 text-sm font-semibold text-slate-200">Sentiment unavailable</h3>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
              News sentiment could not be loaded. Check the API connection and try again.
            </p>
          </div>
        )}
      </div>
    );
  }

  const scorePct = sentiment.newsCount > 0
    ? Math.round(((sentiment.score + 1) / 2) * 100)
    : 50;

  const config = {
    POSITIVE: {
      badgeClass: 'badge-positive',
      fillClass: 'progress-fill-green',
      cardBorder: 'border-[rgba(0,255,136,0.15)]',
      glow: 'rgba(0,255,136,0.08)',
      icon: TrendingUp,
      iconColor: '#00ff88',
      bg: 'rgba(0,255,136,0.04)',
    },
    NEGATIVE: {
      badgeClass: 'badge-negative',
      fillClass: 'progress-fill-red',
      cardBorder: 'border-[rgba(255,51,102,0.15)]',
      glow: 'rgba(255,51,102,0.08)',
      icon: TrendingDown,
      iconColor: '#ff3366',
      bg: 'rgba(255,51,102,0.04)',
    },
    NEUTRAL: {
      badgeClass: 'badge-neutral',
      fillClass: 'progress-fill-amber',
      cardBorder: 'border-[rgba(245,158,11,0.15)]',
      glow: 'rgba(245,158,11,0.08)',
      icon: Minus,
      iconColor: '#f59e0b',
      bg: 'rgba(245,158,11,0.03)',
    },
  };

  const c = config[sentiment.overallSentiment];
  const SentIcon = c.icon;

  // Arc gauge calculation
  const radius = 48;
  const circumference = Math.PI * radius; // half circle
  const arcProgress = (scorePct / 100) * circumference;

  return (
    <div
      className={`glass-panel p-5 space-y-4 animate-fade-scale border ${c.cardBorder} relative overflow-hidden`}
      style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.6), 0 0 40px ${c.glow}` }}
    >
      {/* Ambient background gradient */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: `radial-gradient(ellipse at 50% 0%, ${c.bg} 0%, transparent 60%)` }} />

      {/* Header */}
      <div className="relative flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[rgba(168,85,247,0.15)] flex items-center justify-center
                          border border-[rgba(168,85,247,0.2)]">
            <BrainCircuit className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-white">News Sentiment</h3>
            <p className="text-[9px] font-mono text-[#4a6285]">
              {sentiment.newsCount} {sentiment.newsCount === 1 ? 'article' : 'articles'}
              {sentiment.method ? ` · ${sentiment.method}` : ''}
            </p>
          </div>
        </div>
        <span className={`badge ${c.badgeClass}`}>
          <SentIcon className="w-3 h-3" />
          {sentiment.overallSentiment}
        </span>
      </div>

      {sentiment.newsCount === 0 ? (
        <div className="relative rounded-xl border border-dashed border-gray-700 px-4 py-8 text-center">
          <Newspaper className="mx-auto h-6 w-6 text-gray-500" />
          <p className="mt-3 text-xs font-semibold text-gray-200">No matching recent headlines found</p>
          <p className="mt-1 text-[10px] text-gray-500">Sentiment will appear when relevant stock news is available.</p>
        </div>
      ) : (
      <>
      {/* SVG Arc Gauge */}
      <div className="flex flex-col items-center py-2 relative">
        <svg width="140" height="80" viewBox="0 0 140 80" className="overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff3366" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#00ff88" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path
            d={`M 10 72 A ${radius} ${radius} 0 0 1 130 72`}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={`M 10 72 A ${radius} ${radius} 0 0 1 130 72`}
            fill="none" stroke="url(#gaugeGradient)" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${arcProgress} ${circumference}`}
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)' }}
          />
          {/* Needle */}
          {(() => {
            const angle = -180 + (scorePct / 100) * 180;
            const rad = (angle * Math.PI) / 180;
            const nx = 70 + radius * Math.cos(rad);
            const ny = 72 + radius * Math.sin(rad);
            return (
              <>
                <circle cx="70" cy="72" r="5" fill="rgba(10,22,40,0.9)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <line x1="70" y1="72" x2={nx} y2={ny} stroke="white" strokeWidth="2" strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.8))' }} />
              </>
            );
          })()}
          {/* Score labels */}
          <text x="10" y="80" fill="#4a6285" fontSize="9" fontFamily="JetBrains Mono">NEG</text>
          <text x="60" y="12" fill="#4a6285" fontSize="9" fontFamily="JetBrains Mono">NEU</text>
          <text x="120" y="80" fill="#4a6285" fontSize="9" fontFamily="JetBrains Mono">POS</text>
        </svg>

        {/* Score Badge */}
        <div className="mt-1 text-center">
          <div className="text-2xl font-bold font-mono" style={{ color: c.iconColor }}>
            {sentiment.score > 0 ? '+' : ''}{sentiment.score.toFixed(3)}
          </div>
          {sentiment.newsCount > 0 && (
            <div className="text-[10px] font-mono text-[#4a6285]">
              Confidence: <span className="text-[#8ba5c8]">{(sentiment.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Bars */}
      <div className="space-y-2.5 pt-2 border-t border-[rgba(255,255,255,0.05)]">
        <div className="text-[9px] font-mono font-bold text-[#4a6285] uppercase tracking-wider">Article Distribution</div>

        {[
          { label: 'Positive', pct: sentiment.positivePct, fillClass: 'progress-fill-green', color: '#00ff88' },
          { label: 'Neutral',  pct: sentiment.neutralPct,  fillClass: 'progress-fill-amber', color: '#f59e0b' },
          { label: 'Negative', pct: sentiment.negativePct, fillClass: 'progress-fill-red',   color: '#ff3366' },
        ].map(bar => (
          <div key={bar.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-mono font-semibold" style={{ color: bar.color }}>{bar.label}</span>
              <span className="text-[10px] font-mono font-bold" style={{ color: bar.color }}>{bar.pct}%</span>
            </div>
            <div className="progress-track">
              <div className={`progress-fill ${bar.fillClass}`} style={{ width: `${bar.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Scoring method */}
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[rgba(0,212,255,0.05)]
                      border border-[rgba(0,212,255,0.1)] text-[10px] font-mono text-[#00d4ff]">
        <Clock className="w-3 h-3 shrink-0" />
        <span>{sentiment.method || 'NLP-scored news headlines'}</span>
      </div>

      {/* Top Factors */}
      {sentiment.topFactors.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#f59e0b]">
            <Sparkles className="w-3.5 h-3.5" />
            Key Catalysts
          </div>
          <ul className="space-y-1.5 pl-1">
            {sentiment.topFactors.slice(0, 3).map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] font-mono text-[#8ba5c8]
                                     hover:text-[#00d4ff] transition-colors cursor-default">
                <span className="text-[#00d4ff] font-bold mt-0.5 shrink-0">›</span>
                <span className="line-clamp-2">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </>
      )}
    </div>
  );
};
