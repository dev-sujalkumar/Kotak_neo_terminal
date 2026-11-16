import React, { useCallback, useState, useEffect } from 'react';
import { Activity, ArrowDownUp, ArrowUpRight, Briefcase, RefreshCw, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { api } from '../services/api';
import { AccountFunds, HoldingItem, PositionItem } from '../types';
import { useStore } from '../store/useStore';

const MetricCard = ({
  label, value, sub, colorClass = 'text-[#8ba5c8]', borderClass = 'border-[rgba(0,212,255,0.1)]',
  topLine = 'rgba(0,212,255,0.4)', index = 0
}: any) => (
  <div className={`metric-card border ${borderClass}`}
       style={{ animationDelay: `${index * 0.07}s` }}>
    <div className={`absolute top-0 left-0 right-0 h-px`}
         style={{ background: `linear-gradient(90deg, transparent, ${topLine}, transparent)` }} />
    <div className="text-[9px] font-mono text-[#4a6285] uppercase tracking-wider mb-2">{label}</div>
    <div className={`text-2xl font-bold font-mono ${colorClass}`}>{value}</div>
    {sub && <div className="text-[11px] font-mono text-[#4a6285] mt-1">{sub}</div>}
  </div>
);

export const PortfolioView: React.FC = () => {
  const { setSelectedSymbol, setActiveTab, isKotakConnected, setKotakConnected, tradingMode } = useStore();
  const [holdings, setHoldings]   = useState<HoldingItem[]>([]);
  const [positions, setPositions] = useState<PositionItem[]>([]);
  const [holdingsError, setHoldingsError] = useState<string | null>(null);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [limits, setLimits]       = useState<AccountFunds | null>(null);
  const [fundsError, setFundsError] = useState<string | null>(null);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [fundsUpdatedAt, setFundsUpdatedAt] = useState<Date | null>(null);
  const [fundsSegment, setFundsSegment] = useState('ALL');
  const [fundsExchange, setFundsExchange] = useState('ALL');
  const [fundsProduct, setFundsProduct] = useState('ALL');
  const [holdingsSearch, setHoldingsSearch] = useState('');
  const [holdingsSort, setHoldingsSort] = useState('value');
  const [loading, setLoading]     = useState(true);

  const refreshFunds = useCallback(async () => {
    setFundsLoading(true);
    setFundsError(null);
    try {
      const brokerStatus = await api.getKotakStatus();
      setKotakConnected(Boolean(brokerStatus.connected));
      if (!brokerStatus.connected) {
        setLimits(null);
        setFundsError('Reconnect Kotak Neo to retrieve live account funds.');
        return;
      }

      const data = await api.getLimits({
        segment: fundsSegment,
        exchange: fundsExchange,
        product: fundsProduct,
      });
      setLimits(data);
      setFundsUpdatedAt(new Date());
    } catch (err: any) {
      console.error('Account funds refresh failed:', err);
      if (err.response?.status === 503) setKotakConnected(false);
      setLimits(null);
      setFundsError(err.response?.data?.error || 'Unable to retrieve live funds from Kotak Neo.');
    } finally {
      setFundsLoading(false);
    }
  }, [fundsExchange, fundsProduct, fundsSegment, setKotakConnected]);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    try {
      const [holdingsResult, positionsResult] = await Promise.allSettled([
        api.getHoldings(),
        api.getPositions(),
      ]);

      if (holdingsResult.status === 'fulfilled') {
        setHoldings(holdingsResult.value);
        setHoldingsError(null);
      } else {
        console.error('Portfolio holdings refresh failed:', holdingsResult.reason);
        setHoldings([]);
        setHoldingsError(holdingsResult.reason?.response?.data?.error || 'Unable to retrieve portfolio holdings.');
      }
      if (positionsResult.status === 'fulfilled') {
        setPositions(positionsResult.value);
        setPositionsError(null);
      } else {
        console.error('Portfolio positions refresh failed:', positionsResult.reason);
        setPositions([]);
        setPositionsError(positionsResult.reason?.response?.data?.error || 'Unable to retrieve portfolio positions.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadPortfolio(), refreshFunds()]);
  }, [loadPortfolio, refreshFunds]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    void refreshFunds();
  }, [refreshFunds]);

  useEffect(() => {
    const interval = window.setInterval(() => void refreshFunds(), 30_000);
    return () => window.clearInterval(interval);
  }, [refreshFunds]);

  const totalInvested = holdings.reduce((s, h) => s + h.investedValue, 0);
  const currentValue  = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalPnL      = currentValue - totalInvested;
  const totalPnLPct   = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const isLivePortfolio = tradingMode === 'LIVE';
  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const holdingsUnavailable = loading || Boolean(holdingsError);
  const visibleHoldings = holdings
    .filter(holding => `${holding.symbol} ${holding.tradingSymbol}`.toLowerCase().includes(holdingsSearch.trim().toLowerCase()))
    .sort((first, second) => {
      if (holdingsSort === 'pnl') return second.unrealizedPnL - first.unrealizedPnL;
      if (holdingsSort === 'pnl-low') return first.unrealizedPnL - second.unrealizedPnL;
      if (holdingsSort === 'symbol') return first.symbol.localeCompare(second.symbol);
      return second.currentValue - first.currentValue;
    });

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Header */}
      <div className="dashboard-hero glass-panel p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: 'radial-gradient(ellipse at 88% 15%, rgba(0,212,255,0.09) 0%, transparent 42%)' }} />
        <div className="relative min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`badge ${isLivePortfolio ? 'badge-live' : 'badge-paper'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isLivePortfolio ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {isLivePortfolio ? 'LIVE ACCOUNT' : 'PAPER ACCOUNT'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">PORTFOLIO OVERVIEW</span>
          </div>
          <h2 className="dashboard-hero-title text-xl sm:text-2xl font-bold text-white flex flex-wrap items-center gap-3">
            Portfolio & Holdings
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-mono font-medium text-slate-300">
              {holdingsError ? '—' : holdings.length} {holdings.length === 1 ? 'stock' : 'stocks'}
            </span>
          </h2>
          <p className="mt-1.5 text-xs text-slate-400">
            {isLivePortfolio ? 'Your broker-reported Demat holdings and account activity.' : 'Your simulated holdings, positions, and account funds.'}
          </p>
        </div>
        <button type="button" onClick={() => void refreshAll()} disabled={loading || fundsLoading} className="btn-ghost flex items-center gap-2 px-4 py-2.5 relative disabled:cursor-not-allowed disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading || fundsLoading ? 'animate-spin' : ''}`} />
          <span className="text-[10px] font-semibold tracking-wider">{loading || fundsLoading ? 'UPDATING' : 'REFRESH ALL'}</span>
        </button>
      </div>

      <section className="glass-panel inner-glow p-5 sm:p-6 space-y-4" aria-label="Kotak Neo account funds">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Account funds</h3>
              <p className="mt-0.5 text-[11px] text-slate-400">Balance and margin reported by Kotak Neo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isKotakConnected && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Funds segment"
                  value={fundsSegment}
                  onChange={event => setFundsSegment(event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[10px] text-slate-200"
                >
                  <option value="ALL">All segments</option>
                  <option value="CASH">Cash</option>
                  <option value="FO">F&amp;O</option>
                  <option value="CUR">Currency</option>
                </select>
                <select
                  aria-label="Funds exchange"
                  value={fundsExchange}
                  onChange={event => setFundsExchange(event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[10px] text-slate-200"
                >
                  <option value="ALL">All exchanges</option>
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                </select>
                <select
                  aria-label="Funds product"
                  value={fundsProduct}
                  onChange={event => setFundsProduct(event.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[10px] text-slate-200"
                >
                  <option value="ALL">All products</option>
                  <option value="CNC">CNC</option>
                  <option value="MIS">MIS</option>
                  <option value="NRML">NRML</option>
                </select>
              </div>
            )}
            <span className={`badge ${isKotakConnected ? 'badge-live' : 'badge-paper'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isKotakConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {isKotakConnected ? 'BROKER CONNECTED' : 'BROKER DISCONNECTED'}
            </span>
            <button
              type="button"
              onClick={() => void refreshFunds()}
              disabled={fundsLoading || !isKotakConnected}
              className="btn-ghost flex items-center gap-2 px-3 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${fundsLoading ? 'animate-spin' : ''}`} />
              UPDATE FUNDS
            </button>
          </div>
        </div>

        {fundsLoading && !limits ? (
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map(item => <div key={item} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : fundsError ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <div className="flex items-start gap-3">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-medium text-slate-200">
                  {isKotakConnected ? 'Funds could not be loaded' : 'Connect your broker to view live funds'}
                </p>
                <p className="mt-1 text-xs text-slate-400">{fundsError}</p>
              </div>
            </div>
            {isKotakConnected ? (
              <button type="button" onClick={() => void refreshFunds()} className="btn-ghost px-3 py-2 text-[10px]">
                TRY AGAIN
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('kotak-setup')}
                className="btn-ghost flex items-center gap-2 px-3 py-2 text-[10px]"
              >
                CONNECT KOTAK NEO
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : limits ? (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard label="Net Funds" value={`₹${fmt(limits.netFunds)}`} sub="Kotak RMS net balance" colorClass="text-emerald-300" borderClass="border-emerald-400/15" topLine="rgba(52,211,153,0.55)" />
              <MetricCard label="Margin Used" value={limits.marginUsed == null ? '—' : `₹${fmt(limits.marginUsed)}`} sub="Currently utilized" colorClass="text-cyan-300" borderClass="border-cyan-400/15" topLine="rgba(34,211,238,0.55)" />
              <MetricCard label="Collateral Value" value={limits.collateralValue == null ? '—' : `₹${fmt(limits.collateralValue)}`} sub="Kotak RMS reported" colorClass="text-amber-300" borderClass="border-amber-400/15" topLine="rgba(251,191,36,0.55)" />
              <MetricCard label="Exposure Margin" value={limits.exposureMargin == null ? '—' : `₹${fmt(limits.exposureMargin)}`} sub="Current exposure" colorClass="text-purple-300" borderClass="border-purple-400/15" topLine="rgba(192,132,252,0.55)" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
              <span>Funds refresh automatically every 30 seconds while this page is open.</span>
              <span>{fundsUpdatedAt ? `Last updated ${fundsUpdatedAt.toLocaleTimeString('en-IN')}` : ''}</span>
            </div>
          </>
        ) : null}
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard index={0} label="Total Invested" value={holdingsUnavailable ? '—' : `₹${fmt(totalInvested)}`}
                    colorClass="text-[#00d4ff]" borderClass="border-[rgba(0,212,255,0.15)]"
                    topLine="rgba(0,212,255,0.5)" />
        <MetricCard index={1} label="Current Value"  value={holdingsUnavailable ? '—' : `₹${fmt(currentValue)}`}
                    colorClass="text-[#00ff88]" borderClass="border-[rgba(0,255,136,0.15)]"
                    topLine="rgba(0,255,136,0.5)" />
        <MetricCard index={2}
                    label="Unrealized P&L"
                    value={holdingsUnavailable ? '—' : `${totalPnL >= 0 ? '+' : ''}₹${fmt(Math.abs(totalPnL))}`}
                    sub={holdingsUnavailable ? undefined : `${totalPnL >= 0 ? '+' : ''}${totalPnLPct.toFixed(2)}%`}
                    colorClass={totalPnL >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}
                    borderClass={totalPnL >= 0 ? 'border-[rgba(0,255,136,0.15)]' : 'border-[rgba(255,51,102,0.15)]'}
                    topLine={totalPnL >= 0 ? 'rgba(0,255,136,0.5)' : 'rgba(255,51,102,0.5)'} />
      </div>

      {/* Holdings Table */}
      <div className="glass-panel p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Briefcase className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{isLivePortfolio ? 'Demat holdings' : 'Paper holdings'}</h3>
              <p className="mt-0.5 text-[11px] text-slate-400">{isLivePortfolio ? 'Broker-reported delivery investments' : 'Simulated portfolio investments'}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                aria-label="Search holdings"
                placeholder="Search symbol"
                value={holdingsSearch}
                onChange={event => setHoldingsSearch(event.target.value)}
                className="w-36 rounded-lg border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/40 sm:w-44"
              />
            </label>
            <label className="relative">
              <ArrowDownUp className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <select
                aria-label="Sort holdings"
                value={holdingsSort}
                onChange={event => setHoldingsSort(event.target.value)}
                className="rounded-lg border border-white/10 bg-slate-950/60 py-2 pl-8 pr-2 text-xs text-slate-300 outline-none focus:border-cyan-400/40"
              >
                <option value="value">Largest value</option>
                <option value="pnl">Best P&amp;L</option>
                <option value="pnl-low">Lowest P&amp;L</option>
                <option value="symbol">Symbol A–Z</option>
              </select>
            </label>
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>{holdingsError ? 'HOLDINGS STATUS' : `${visibleHoldings.length} OF ${holdings.length} HOLDINGS`}</span>
          {isLivePortfolio && <span className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-emerald-400" /> BROKER DATA</span>}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-12 w-full rounded-xl animate-pulse" />
            ))}
          </div>
        ) : holdingsError ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-slate-300">
            <p className="font-semibold text-amber-200">{isLivePortfolio ? 'Live Demat holdings unavailable' : 'Holdings unavailable'}</p>
            <p className="mt-1 text-slate-400">{holdingsError}</p>
          </div>
        ) : visibleHoldings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-12 text-center space-y-2">
            <Briefcase className="mx-auto h-9 w-9 text-slate-600" />
            <p className="text-sm font-medium text-slate-300">
              {holdingsSearch ? 'No holdings match your search' : isLivePortfolio ? 'No Demat holdings found' : 'Your paper portfolio is empty'}
            </p>
            <p className="text-xs text-slate-500">
              {holdingsSearch ? 'Try another symbol or clear the search.' : isLivePortfolio ? 'Kotak Neo did not return any live holdings.' : 'Place a paper BUY order to start tracking a position.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-x -mx-1 px-1">
            <table className="data-table">
              <thead>
                <tr>
                  {['Symbol', 'Qty', 'Avg Price', 'LTP', 'Invested', 'Curr Value', 'P&L', '% Return'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleHoldings.map((h, i) => (
                  <tr
                    key={`${h.exchangeSegment}-${h.tradingSymbol}`}
                    className="cursor-pointer"
                    onClick={() => { setSelectedSymbol(h.symbol); setActiveTab('detail'); }}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[rgba(0,102,255,0.2)] to-[rgba(0,212,255,0.1)]
                                        border border-[rgba(0,212,255,0.2)] flex items-center justify-center
                                        text-[8px] font-bold text-[#00d4ff]">
                          {h.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-[11px] hover:text-[#00d4ff] transition-colors">{h.symbol}</div>
                          <div className="text-[9px] text-[#4a6285]">{h.tradingSymbol} · {h.exchangeSegment.replace('_', ' ').toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-[#8ba5c8] font-bold">{h.quantity}</td>
                    <td className="text-[#8ba5c8]">₹{h.averagePrice.toFixed(2)}</td>
                    <td className="text-white font-bold">₹{h.currentPrice.toFixed(2)}</td>
                    <td className="text-[#8ba5c8]">₹{fmt(h.investedValue)}</td>
                    <td className="text-white font-bold">₹{fmt(h.currentValue)}</td>
                    <td className={`font-bold ${h.unrealizedPnL >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                      {h.unrealizedPnL >= 0 ? '+' : '-'}₹{fmt(Math.abs(h.unrealizedPnL))}
                    </td>
                    <td>
                      <div className={`badge ${h.unrealizedPnLPct >= 0 ? 'badge-positive' : 'badge-negative'} text-[9px]`}>
                        {h.unrealizedPnLPct >= 0 ? '+' : ''}{h.unrealizedPnLPct.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Positions Table */}
      {(positions.length > 0 || (isLivePortfolio && positionsError)) && (
        <div className="glass-panel p-5 space-y-4">
          <div className="section-header">
            <div className="w-8 h-8 rounded-xl bg-[rgba(245,158,11,0.1)] flex items-center justify-center border border-[rgba(245,158,11,0.2)]">
              <TrendingUp className="w-4 h-4 text-[#f59e0b]" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-mono text-white">Intraday Positions (MIS)</h3>
              <p className="text-[9px] font-mono text-[#4a6285]">Open F&O and intraday positions</p>
            </div>
          </div>
          {positionsError ? (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-slate-300">
              <p className="font-semibold text-amber-200">Live positions unavailable</p>
              <p className="mt-1 text-slate-400">{positionsError}</p>
            </div>
          ) : <div className="overflow-x-auto scroll-x">
            <table className="data-table">
              <thead>
                <tr>
                  {['Symbol', 'Product', 'Net Qty', 'Buy Qty', 'Sell Qty', 'Avg Price', 'Realized P&L'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={i}>
                    <td className="font-bold text-white">{p.symbol}</td>
                    <td><span className="badge badge-cyan text-[8px]">{p.product}</span></td>
                    <td className={`font-bold ${p.netQuantity >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>{p.netQuantity}</td>
                    <td className="text-[#8ba5c8]">{p.buyQty}</td>
                    <td className="text-[#8ba5c8]">{p.sellQty}</td>
                    <td className="text-white">₹{p.averagePrice.toFixed(2)}</td>
                    <td className={`font-bold ${p.realizedPnL >= 0 ? 'text-[#00ff88]' : 'text-[#ff3366]'}`}>
                      {p.realizedPnL >= 0 ? '+' : ''}₹{p.realizedPnL.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      )}
    </div>
  );
};
