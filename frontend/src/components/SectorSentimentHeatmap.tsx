import React from 'react';
import {
  Landmark,
  Laptop,
  Zap,
  Car,
  Activity,
  Building2,
  Layers,
  Radio,
  Globe,
  TrendingUp,
  TrendingDown,
  Filter,
  CheckCircle2,
  PieChart,
} from 'lucide-react';
import { NewsArticle } from '../types';
import { TOP_10_CATEGORIES, classifyNewsCategory, SectorCategoryMeta } from '../utils/categoryClassifier';

interface SectorSentimentHeatmapProps {
  articles: NewsArticle[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  banking: Landmark,
  it: Laptop,
  energy: Zap,
  auto: Car,
  pharma: Activity,
  industrial: Building2,
  consumer: Layers,
  infra: Building2,
  telecom: Radio,
  macro: Globe,
};

export const SectorSentimentHeatmap: React.FC<SectorSentimentHeatmapProps> = ({
  articles,
  selectedCategory,
  onSelectCategory,
}) => {
  // Aggregate sentiment per category
  const categoryStats = TOP_10_CATEGORIES.map((cat) => {
    const matchingArticles = articles.filter((a) => {
      const artCat = a.category || classifyNewsCategory(a.title, a.description || '', a.symbol || '');
      return artCat === cat.name;
    });

    const count = matchingArticles.length;
    let avgScore = 0;
    let posCount = 0;
    let neuCount = 0;
    let negCount = 0;

    if (count > 0) {
      const sum = matchingArticles.reduce((acc, curr) => acc + (curr.score ?? 0), 0);
      avgScore = sum / count;
      matchingArticles.forEach((a) => {
        const sent = (a.sentiment || '').toUpperCase();
        if (sent === 'POSITIVE') posCount++;
        else if (sent === 'NEGATIVE') negCount++;
        else neuCount++;
      });
    }

    return {
      ...cat,
      count,
      avgScore,
      posCount,
      neuCount,
      negCount,
    };
  });

  // Calculate market breadth across sectors
  const activeSectors = categoryStats.filter((c) => c.count > 0);
  const bullishSectors = activeSectors.filter((c) => c.avgScore > 0.05).length;
  const bearishSectors = activeSectors.filter((c) => c.avgScore < -0.05).length;
  const neutralSectors = activeSectors.length - bullishSectors - bearishSectors;

  const getHeatmapColorStyle = (count: number, avgScore: number, isSelected: boolean) => {
    if (count === 0) {
      return {
        bg: 'bg-slate-900/30 border-slate-800/40 text-slate-500 hover:border-slate-700/60',
        scoreBadge: 'bg-slate-800/60 text-slate-500 border-slate-700/40',
        scoreText: 'text-slate-500',
      };
    }

    if (avgScore >= 0.25) {
      return {
        bg: isSelected
          ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
          : 'bg-gradient-to-br from-emerald-950/70 via-emerald-900/30 to-slate-950/80 border-emerald-500/40 hover:border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.1)]',
        scoreBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        scoreText: 'text-emerald-400',
      };
    }

    if (avgScore > 0.05) {
      return {
        bg: isSelected
          ? 'bg-teal-950/80 border-teal-400 ring-2 ring-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.25)]'
          : 'bg-gradient-to-br from-teal-950/60 via-slate-900/50 to-slate-950/80 border-teal-500/30 hover:border-teal-400/60',
        scoreBadge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        scoreText: 'text-teal-400',
      };
    }

    if (avgScore <= -0.25) {
      return {
        bg: isSelected
          ? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
          : 'bg-gradient-to-br from-rose-950/70 via-rose-900/30 to-slate-950/80 border-rose-500/40 hover:border-rose-400/70 shadow-[0_0_12px_rgba(244,63,94,0.1)]',
        scoreBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        scoreText: 'text-rose-400',
      };
    }

    if (avgScore < -0.05) {
      return {
        bg: isSelected
          ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
          : 'bg-gradient-to-br from-amber-950/60 via-slate-900/50 to-slate-950/80 border-amber-500/30 hover:border-amber-400/60',
        scoreBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        scoreText: 'text-amber-400',
      };
    }

    return {
      bg: isSelected
        ? 'bg-sky-950/80 border-sky-400 ring-2 ring-sky-500/50'
        : 'bg-gradient-to-br from-slate-900/60 to-slate-950/80 border-slate-700/40 hover:border-slate-600',
      scoreBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      scoreText: 'text-sky-400',
    };
  };

  return (
    <div className="glass-panel p-5 space-y-4 border border-[rgba(84,214,207,0.2)]">
      {/* Header with Title and Breadth Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Sector & Industry Sentiment Heatmap
              </h3>
              <span className="badge badge-purple text-[9px]">TOP 10 CATEGORIES</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Real-time FinBERT thematic clustering across {articles.length} news articles · Click tile to filter
            </p>
          </div>
        </div>

        {/* Sector Breadth Pills */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
            🟢 {bullishSectors} Bullish
          </span>
          <span className="px-2 py-0.5 rounded-full border border-sky-500/30 bg-sky-950/40 text-sky-400">
            ⚪ {neutralSectors} Neutral
          </span>
          <span className="px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-950/40 text-rose-400">
            🔴 {bearishSectors} Bearish
          </span>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => onSelectCategory('ALL')}
              className="px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-950/60 text-purple-300 hover:text-white transition-colors"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Heatmap 10-Cell Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {categoryStats.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id] || Building2;
          const isSelected = selectedCategory === cat.name;
          const styles = getHeatmapColorStyle(cat.count, cat.avgScore, isSelected);

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? 'ALL' : cat.name)}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[92px] ${styles.bg}`}
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                  <span className="text-xs font-semibold truncate leading-tight">
                    {cat.shortName}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-300 shrink-0 border border-white/5">
                  {cat.count}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between w-full">
                <div className="text-xs font-mono font-bold">
                  {cat.count > 0 ? (
                    <span className={styles.scoreText}>
                      {cat.avgScore >= 0 ? '+' : ''}{cat.avgScore.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-600 text-[11px]">No news</span>
                  )}
                </div>

                {cat.count > 0 && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border font-semibold ${styles.scoreBadge}`}>
                    {cat.avgScore > 0.05 ? 'BULL' : cat.avgScore < -0.05 ? 'BEAR' : 'NEU'}
                  </span>
                )}
              </div>

              {/* Mini Sentiment Ratio Bar */}
              {cat.count > 0 && (
                <div className="w-full bg-slate-900/80 rounded-full h-1 overflow-hidden mt-1.5 flex">
                  {cat.posCount > 0 && (
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(cat.posCount / cat.count) * 100}%` }}
                      title={`Positive: ${cat.posCount}`}
                    />
                  )}
                  {cat.neuCount > 0 && (
                    <div
                      className="bg-sky-500 h-full"
                      style={{ width: `${(cat.neuCount / cat.count) * 100}%` }}
                      title={`Neutral: ${cat.neuCount}`}
                    />
                  )}
                  {cat.negCount > 0 && (
                    <div
                      className="bg-rose-500 h-full"
                      style={{ width: `${(cat.negCount / cat.count) * 100}%` }}
                      title={`Negative: ${cat.negCount}`}
                    />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

