import React, { useState, useEffect } from 'react';
import { Sliders, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';
import { TechnicalIndicators, QuoteData } from '../types';
import { CandlestickChart } from '../components/CandlestickChart';

export const TechnicalView: React.FC = () => {
  const { selectedSymbol } = useStore();
  const [technical, setTechnical] = useState<TechnicalIndicators | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [candles, setCandles] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tData, qData, cData] = await Promise.all([
          api.getTechnical(selectedSymbol),
          api.getQuote(selectedSymbol),
          api.getCandles(selectedSymbol),
        ]);
        setTechnical(tData);
        setQuote(qData);
        setCandles(cData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [selectedSymbol]);

  return (
    <div className="space-y-6 font-mono">
      <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
        <Sliders className="w-6 h-6 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Technical Analysis Engine — {selectedSymbol}</h2>
      </div>

      <CandlestickChart candles={candles} symbol={selectedSymbol} ltp={quote?.ltp || 0} />

      {technical && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-4 shadow-lg">
          <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2">Quantitative Metrics</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
              <div className="text-gray-400 text-[10px]">RSI (14 Period)</div>
              <div className="text-lg font-bold text-cyan-400 mt-1">{technical.rsi14}</div>
            </div>

            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
              <div className="text-gray-400 text-[10px]">EMA 50 Support</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">₹{technical.ema50}</div>
            </div>

            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
              <div className="text-gray-400 text-[10px]">MACD Histogram</div>
              <div className="text-lg font-bold text-purple-400 mt-1">{technical.macd.histogram}</div>
            </div>

            <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
              <div className="text-gray-400 text-[10px]">ATR Volatility</div>
              <div className="text-lg font-bold text-amber-400 mt-1">₹{technical.atr14}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
