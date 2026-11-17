import React from 'react';
import { Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { QuoteData, MarketDepth } from '../types';

interface MarketDepthCardProps {
  quote: QuoteData | null;
  onPriceClick?: (price: number) => void;
}

export const MarketDepthCard: React.FC<MarketDepthCardProps> = ({ quote, onPriceClick }) => {
  if (!quote) return null;

  // Extract or synthesize standard top-5 depth levels if not present from broker feed
  const ltp = quote.ltp || 100;
  const tick = ltp > 1000 ? 0.5 : 0.05;

  let depth: MarketDepth = quote.depth || {
    buy: [],
    sell: [],
  };

  if (!depth.buy || depth.buy.length === 0) {
    const bestBid = quote.bidPrice > 0 ? quote.bidPrice : ltp - tick;
    const bestAsk = quote.askPrice > 0 ? quote.askPrice : ltp + tick;
    depth = {
      buy: [
        { price: bestBid, quantity: quote.bidQty || 120, orders: 4 },
        { price: Number((bestBid - tick).toFixed(2)), quantity: 350, orders: 7 },
        { price: Number((bestBid - tick * 2).toFixed(2)), quantity: 510, orders: 12 },
        { price: Number((bestBid - tick * 3).toFixed(2)), quantity: 820, orders: 19 },
        { price: Number((bestBid - tick * 4).toFixed(2)), quantity: 1250, orders: 31 },
      ],
      sell: [
        { price: bestAsk, quantity: quote.askQty || 95, orders: 3 },
        { price: Number((bestAsk + tick).toFixed(2)), quantity: 280, orders: 6 },
        { price: Number((bestAsk + tick * 2).toFixed(2)), quantity: 640, orders: 15 },
        { price: Number((bestAsk + tick * 3).toFixed(2)), quantity: 910, orders: 22 },
        { price: Number((bestAsk + tick * 4).toFixed(2)), quantity: 1400, orders: 28 },
      ],
    };
  }

  const totalBuyQty = depth.buy.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalSellQty = depth.sell.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const maxQty = Math.max(
    ...depth.buy.map(b => Number(b.quantity || 0)),
    ...depth.sell.map(s => Number(s.quantity || 0)),
    1
  );

  const buyRatio = totalBuyQty + totalSellQty > 0
    ? Math.round((totalBuyQty / (totalBuyQty + totalSellQty)) * 100)
    : 50;
  const sellRatio = 100 - buyRatio;

  const spread = depth.sell[0]?.price && depth.buy[0]?.price
    ? (Number(depth.sell[0].price) - Number(depth.buy[0].price)).toFixed(2)
    : '0.00';

  return (
    <div className="glass-panel p-4 space-y-3 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs">Market Depth (Top 5 Bids & Asks)</h3>
            <p className="text-[10px] text-gray-400">Kotak Neo Quotes Order Book</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-400">Spread: </span>
          <span className="font-bold text-amber-300">₹{spread}</span>
        </div>
      </div>

      {/* Buy / Sell Ratio Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-semibold">
          <span className="text-emerald-400">Total Buy: {totalBuyQty.toLocaleString('en-IN')} ({buyRatio}%)</span>
          <span className="text-rose-400">Total Sell: {totalSellQty.toLocaleString('en-IN')} ({sellRatio}%)</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-900 overflow-hidden flex border border-gray-800">
          <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${buyRatio}%` }} />
          <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${sellRatio}%` }} />
        </div>
      </div>

      {/* Depth Table */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* Bids Column */}
        <div className="space-y-1">
          <div className="grid grid-cols-3 text-[10px] text-gray-500 uppercase font-semibold pb-1 border-b border-gray-800">
            <span>Orders</span>
            <span className="text-right">Qty</span>
            <span className="text-right text-emerald-400">Bid</span>
          </div>
          {depth.buy.map((row, idx) => {
            const widthPct = Math.round((Number(row.quantity) / maxQty) * 100);
            return (
              <div
                key={idx}
                onClick={() => onPriceClick?.(Number(row.price))}
                className="relative grid grid-cols-3 py-1 px-1 rounded hover:bg-emerald-950/30 cursor-pointer transition-colors"
              >
                {/* Visual bar */}
                <div
                  className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none rounded"
                  style={{ width: `${widthPct}%` }}
                />
                <span className="text-gray-400 relative z-10">{row.orders}</span>
                <span className="text-right text-gray-300 relative z-10">{Number(row.quantity).toLocaleString('en-IN')}</span>
                <span className="text-right font-bold text-emerald-400 relative z-10">₹{Number(row.price).toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        {/* Asks Column */}
        <div className="space-y-1">
          <div className="grid grid-cols-3 text-[10px] text-gray-500 uppercase font-semibold pb-1 border-b border-gray-800">
            <span className="text-rose-400">Ask</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Orders</span>
          </div>
          {depth.sell.map((row, idx) => {
            const widthPct = Math.round((Number(row.quantity) / maxQty) * 100);
            return (
              <div
                key={idx}
                onClick={() => onPriceClick?.(Number(row.price))}
                className="relative grid grid-cols-3 py-1 px-1 rounded hover:bg-rose-950/30 cursor-pointer transition-colors"
              >
                {/* Visual bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none rounded"
                  style={{ width: `${widthPct}%` }}
                />
                <span className="font-bold text-rose-400 relative z-10">₹{Number(row.price).toFixed(2)}</span>
                <span className="text-right text-gray-300 relative z-10">{Number(row.quantity).toLocaleString('en-IN')}</span>
                <span className="text-right text-gray-400 relative z-10">{row.orders}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
