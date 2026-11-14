import React, { useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Line, ReferenceLine
} from 'recharts';
import { ChevronDown } from 'lucide-react';

interface CandlestickChartProps {
  candles: any[];
  symbol: string;
  ltp: number;
  change?: number;
  changePercent?: number;
}

type Indicator = 'EMA' | 'BOLLINGER' | 'RSI' | 'MACD' | 'VOLUME';
type Period = '1D' | '1W' | '1M' | '3M' | '1Y';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-[rgba(2,4,8,0.97)] border border-[rgba(0,212,255,0.25)] rounded-xl p-3
                    shadow-[0_8px_32px_rgba(0,0,0,0.7),0_0_20px_rgba(0,212,255,0.1)]
                    font-mono text-[10px] min-w-[160px]">
      <div className="text-[#4a6285] mb-2 font-bold border-b border-[rgba(255,255,255,0.05)] pb-1.5">{label}</div>
      <div className="space-y-1">
        {[
          { k: 'Open',   v: d.open,   c: '#8ba5c8' },
          { k: 'High',   v: d.high,   c: '#00ff88' },
          { k: 'Low',    v: d.low,    c: '#ff3366' },
          { k: 'Close',  v: d.close,  c: d.isBullish ? '#00ff88' : '#ff3366' },
          { k: 'Volume', v: d.volume?.toLocaleString(), c: '#4a6285', noRupee: true },
        ].filter(x => x.v !== undefined).map(x => (
          <div key={x.k} className="flex justify-between gap-4">
            <span className="text-[#4a6285]">{x.k}</span>
            <span className="font-bold" style={{ color: x.c }}>{x.noRupee ? x.v : `₹${Number(x.v).toFixed(2)}`}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const emaSeries = (values: number[], period: number): number[] => {
  const multiplier = 2 / (period + 1);
  return values.reduce<number[]>((series, value, index) => {
    series.push(index === 0 ? value : value * multiplier + series[index - 1] * (1 - multiplier));
    return series;
  }, []);
};

const rsiSeries = (values: number[], period = 14): Array<number | null> =>
  values.map((_, index) => {
    if (index < period) return null;
    let gains = 0;
    let losses = 0;
    for (let cursor = index - period + 1; cursor <= index; cursor++) {
      const change = values[cursor] - values[cursor - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    if (losses === 0) return gains === 0 ? 50 : 100;
    const relativeStrength = gains / losses;
    return 100 - 100 / (1 + relativeStrength);
  });

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles, symbol, ltp, change, changePercent,
}) => {
  const [period, setPeriod]    = useState<Period>('1M');
  const [indicator, setIndicator] = useState<Indicator>('EMA');

  const closes = candles.map(c => c.close);
  const ema9 = emaSeries(closes, 9);
  const ema21 = emaSeries(closes, 21);
  const ema12 = emaSeries(closes, 12);
  const ema26 = emaSeries(closes, 26);
  const macdLine = ema12.map((value, index) => value - ema26[index]);
  const macdSignal = emaSeries(macdLine, 9);
  const rsi = rsiSeries(closes);
  const data = candles.map((c, idx) => {
    const isBullish = c.close >= c.open;
    const bandWindow = closes.slice(Math.max(0, idx - 19), idx + 1);
    const bandMean = bandWindow.reduce((sum, value) => sum + value, 0) / bandWindow.length;
    const bandDeviation = Math.sqrt(
      bandWindow.reduce((sum, value) => sum + (value - bandMean) ** 2, 0) / bandWindow.length
    );
    return {
      date: new Date(c.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }),
      open: c.open, high: c.high, low: c.low, close: c.close,
      volume: c.volume,
      isBullish,
      ema9: ema9[idx],
      ema21: ema21[idx],
      rsi: rsi[idx],
      macdLine: macdLine[idx],
      macdSignal: macdSignal[idx],
      macdHist: macdLine[idx] - macdSignal[idx],
      upperBB: bandMean + 2 * bandDeviation,
      lowerBB: bandMean - 2 * bandDeviation,
      midBB: bandMean,
    };
  });

  const periodLength: Record<Period, number> = { '1D': 1, '1W': 5, '1M': 21, '3M': 63, '1Y': data.length };
  const visibleData = data.slice(-Math.min(periodLength[period], data.length));
  const dayChange = change ?? (
    data.length > 1 ? data[data.length - 1].close - data[data.length - 2].close : 0
  );
  const dayChangePercent = changePercent ?? (
    data.length > 1 && data[data.length - 2].close
      ? dayChange / data[data.length - 2].close * 100
      : 0
  );
  const ltpColor = dayChange >= 0 ? '#00ff88' : '#ff3366';

  const isPositive = dayChange >= 0;

  return (
    <div className="glass-panel p-4 space-y-3 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Toolbar */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 pb-3
                      border-b border-[rgba(255,255,255,0.05)]">
        {/* Symbol + Price */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold font-mono text-white">{symbol}<span className="text-[#4a6285]">/INR</span></h2>
              <span className="text-lg font-bold font-mono" style={{ color: ltpColor }}>
                ₹{ltp.toFixed(2)}
              </span>
              <span className={`text-xs font-mono font-bold ${isPositive ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                {isPositive ? '+' : ''}{dayChange.toFixed(2)} ({isPositive ? '+' : ''}{dayChangePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="text-[9px] font-mono text-[#2a3f5f]">DAILY PRICE HISTORY · SOURCE: YAHOO FINANCE</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="flex items-center bg-[rgba(4,8,16,0.8)] border border-[rgba(255,255,255,0.06)]
                          rounded-xl p-0.5 gap-0.5">
            {(['1D', '1W', '1M', '3M', '1Y'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all
                  ${period === p
                    ? 'bg-[#0066ff] text-white shadow-[0_0_10px_rgba(0,102,255,0.4)]'
                    : 'text-[#4a6285] hover:text-[#8ba5c8]'}`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Indicator Selector */}
          <div className="flex items-center bg-[rgba(4,8,16,0.8)] border border-[rgba(255,255,255,0.06)]
                          rounded-xl p-0.5 gap-0.5">
            {(['EMA', 'BOLLINGER', 'RSI', 'MACD', 'VOLUME'] as Indicator[]).map(ind => (
              <button
                key={ind}
                onClick={() => setIndicator(ind)}
                className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold transition-all
                  ${indicator === ind
                    ? 'bg-[rgba(0,212,255,0.15)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]'
                    : 'text-[#4a6285] hover:text-[#8ba5c8]'}`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Price Chart */}
      <div className="h-64 w-full relative">
        {visibleData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-[#2a3f5f] font-mono text-xs">Loading price data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visibleData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={isPositive ? '#00ff88' : '#ff3366'} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={isPositive ? '#00ff88' : '#ff3366'} stopOpacity={0} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#2a3f5f', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} />
              <YAxis domain={['auto', 'auto']} stroke="transparent" tick={{ fill: '#2a3f5f', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} width={55} tickFormatter={v => `₹${v.toFixed(0)}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,212,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone" dataKey="close"
                stroke={isPositive ? '#00ff88' : '#ff3366'} strokeWidth={2}
                fill="url(#priceGrad)" fillOpacity={1}
                filter="url(#glow)"
              />
              {indicator === 'EMA' && (
                <>
                  <Line type="monotone" dataKey="ema9"  stroke="#f59e0b" strokeWidth={1.5} dot={false} name="EMA 9" />
                  <Line type="monotone" dataKey="ema21" stroke="#a855f7" strokeWidth={1.5} dot={false} name="EMA 21" />
                </>
              )}
              {indicator === 'BOLLINGER' && (
                <>
                  <Line type="monotone" dataKey="upperBB" stroke="rgba(168,85,247,0.7)" strokeWidth={1} dot={false} strokeDasharray="4 3" name="Upper BB" />
                  <Line type="monotone" dataKey="lowerBB" stroke="rgba(168,85,247,0.7)" strokeWidth={1} dot={false} strokeDasharray="4 3" name="Lower BB" />
                  <Line type="monotone" dataKey="midBB"   stroke="rgba(168,85,247,0.4)" strokeWidth={1} dot={false} name="Mid BB" />
                </>
              )}
              {indicator === 'VOLUME' && (
                <Bar dataKey="volume" yAxisId={1} fill="rgba(0,212,255,0.25)"
                     radius={[2, 2, 0, 0]} maxBarSize={6} />
              )}
              {visibleData.length > 0 && (
                <ReferenceLine y={ltp} stroke="rgba(0,212,255,0.5)" strokeDasharray="5 3" strokeWidth={1}
                               label={{ value: `₹${ltp.toFixed(0)}`, position: 'right', fill: '#00d4ff', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Sub-chart: RSI */}
      {indicator === 'RSI' && visibleData.length > 0 && (
        <div className="border-t border-[rgba(255,255,255,0.05)] pt-3 space-y-1">
          <div className="text-[9px] font-mono text-[#4a6285] flex justify-between">
            <span>RSI (14) · Momentum Oscillator</span>
            <span style={{ color: (visibleData[visibleData.length - 1]?.rsi ?? 50) > 70 ? '#ff3366' : (visibleData[visibleData.length - 1]?.rsi ?? 50) < 30 ? '#00ff88' : '#f59e0b' }}>
              {visibleData[visibleData.length - 1]?.rsi?.toFixed(1) || '—'}
            </span>
          </div>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visibleData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#2a3f5f', fontSize: 8, fontFamily: 'JetBrains Mono' }} width={30} />
                <Line type="monotone" dataKey="rsi" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                <ReferenceLine y={70} stroke="rgba(255,51,102,0.4)" strokeDasharray="3 3" />
                <ReferenceLine y={30} stroke="rgba(0,255,136,0.4)" strokeDasharray="3 3" />
                <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sub-chart: MACD */}
      {indicator === 'MACD' && visibleData.length > 0 && (
        <div className="border-t border-[rgba(255,255,255,0.05)] pt-3 space-y-1">
          <div className="text-[9px] font-mono text-[#4a6285]">MACD (12,26,9) · Trend Momentum</div>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visibleData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <YAxis tick={{ fill: '#2a3f5f', fontSize: 8, fontFamily: 'JetBrains Mono' }} width={30} />
                <Bar dataKey="macdHist" fill="#0066ff" opacity={0.6} radius={[2, 2, 0, 0]} maxBarSize={6} />
                <Line type="monotone" dataKey="macdLine"   stroke="#00d4ff" strokeWidth={1.5} dot={false} name="MACD" />
                <Line type="monotone" dataKey="macdSignal" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Signal" />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
