import React, { useState } from 'react';
import { History, Play, Award, TrendingUp, TrendingDown, Percent, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { BacktestResult } from '../types';

export const BacktestView: React.FC = () => {
  const [symbol, setSymbol] = useState('TCS');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [rsiBuy, setRsiBuy] = useState(45);
  const [rsiSell, setRsiSell] = useState(70);
  const [stopLoss, setStopLoss] = useState(2.0);
  const [takeProfit, setTakeProfit] = useState(5.0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.runBacktest({
        symbol,
        initialCapital,
        rsiBuyThreshold: rsiBuy,
        rsiSellThreshold: rsiSell,
        stopLossPct: stopLoss,
        takeProfitPct: takeProfit,
      });
      setResult(res);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
        <History className="w-6 h-6 text-purple-400" />
        <div>
          <h2 className="text-lg font-bold text-white">RSI + EMA Price Strategy Backtester</h2>
          <p className="text-xs text-gray-400">
            Simulated trades use Yahoo Finance daily price history. Historical sentiment and transaction costs are not included.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Form */}
        <form onSubmit={handleRunBacktest} className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 space-y-4 shadow-lg">
          <h3 className="text-sm font-bold text-white border-b border-gray-800 pb-2">Strategy Parameters</h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-gray-400 mb-1">Target Stock Symbol</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1">Initial Capital (₹)</label>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 mb-1">RSI Buy Level</label>
                <input
                  type="number"
                  value={rsiBuy}
                  onChange={(e) => setRsiBuy(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">RSI Sell Level</label>
                <input
                  type="number"
                  value={rsiSell}
                  onChange={(e) => setRsiSell(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 mb-1">Stop Loss %</label>
                <input
                  type="number"
                  step="0.5"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-rose-400 font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Take Profit %</label>
                <input
                  type="number"
                  step="0.5"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-emerald-400 font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{loading ? 'SIMULATING BACKTEST...' : 'EXECUTE STRATEGY BACKTEST'}</span>
            </button>
          </div>
        </form>

        {/* Right 2 Cols: Backtest Results Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <>
              {/* Executive Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl">
                  <div className="text-gray-400 text-[10px]">Total Cumulative Return</div>
                  <div className={`text-lg font-bold mt-1 ${result.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.totalReturn >= 0 ? `+${result.totalReturn}%` : `${result.totalReturn}%`}
                  </div>
                </div>

                <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl">
                  <div className="text-gray-400 text-[10px]">Win Rate %</div>
                  <div className="text-lg font-bold text-cyan-400 mt-1">{result.winRate}%</div>
                </div>

                <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl">
                  <div className="text-gray-400 text-[10px]">Max Drawdown</div>
                  <div className="text-lg font-bold text-rose-400 mt-1">-{result.maxDrawdown}%</div>
                </div>

                <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl">
                  <div className="text-gray-400 text-[10px]">Sharpe Ratio</div>
                  <div className="text-lg font-bold text-purple-400 mt-1">{result.sharpeRatio}</div>
                </div>
              </div>

              {/* Trade Logs Table */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 shadow-lg space-y-3">
                <h3 className="text-xs font-bold text-white">Simulated Trade History Logs ({result.tradeLogs.length})</h3>
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 font-semibold uppercase text-[10px]">
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Action</th>
                        <th className="py-2 px-2">Date</th>
                        <th className="py-2 px-2">Price</th>
                        <th className="py-2 px-2">Qty</th>
                        <th className="py-2 px-2">PnL %</th>
                        <th className="py-2 px-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-[11px]">
                      {result.tradeLogs.map((t, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/40">
                          <td className="py-2 px-2 text-gray-500">{t.tradeNumber || idx + 1}</td>
                          <td className={`py-2 px-2 font-bold ${t.type === 'ENTRY' ? 'text-cyan-400' : 'text-purple-400'}`}>
                            {t.type}
                          </td>
                          <td className="py-2 px-2 text-gray-400">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="py-2 px-2 text-white">₹{(t.price || t.exitPrice || 0).toFixed(2)}</td>
                          <td className="py-2 px-2 text-gray-300">{t.quantity}</td>
                          <td className={`py-2 px-2 font-bold ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.pnlPct !== undefined ? `${t.pnlPct >= 0 ? '+' : ''}${t.pnlPct}%` : '-'}
                          </td>
                          <td className="py-2 px-2 text-gray-400">{t.reason || 'Strategy Entry'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-12 text-center text-gray-500 font-mono space-y-2">
              <Award className="w-12 h-12 text-purple-400/40 mx-auto" />
              <div className="text-sm font-bold text-gray-300">No Backtest Results Yet</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Configure your strategy parameters on the left and click "EXECUTE STRATEGY BACKTEST" to analyze performance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
