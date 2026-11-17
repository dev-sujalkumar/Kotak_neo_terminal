import React, { useState, useEffect } from 'react';
import { BookOpenCheck, History, Wifi, WifiOff, Eye, X, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { OrderItem, TradeItem } from '../types';
import { useStore } from '../store/useStore';

export const OrdersView: React.FC = () => {
  const { isKotakConnected, tradingMode } = useStore();
  const [activeSubTab, setActiveSubTab] = useState<'ORDERS' | 'TRADES'>('ORDERS');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedStatus, setFeedStatus] = useState('Disconnected');
  const [lastFeedMessage, setLastFeedMessage] = useState<string | null>(null);
  const [feedUpdatedAt, setFeedUpdatedAt] = useState<Date | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Order History Inspection Modal State
  const [selectedOrderHistory, setSelectedOrderHistory] = useState<OrderItem[] | null>(null);
  const [historyOrderNumber, setHistoryOrderNumber] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [oData, tData] = await Promise.all([api.getOrders(), api.getTrades()]);
      setOrders(oData);
      setTrades(tData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isKotakConnected || tradingMode !== 'LIVE') {
      setFeedStatus('Available in LIVE mode with Kotak connected');
      return;
    }

    setFeedStatus('Connecting…');
    const socket = api.connectKotakOrderFeed(event => {
      setLastFeedMessage(event.data);
      setFeedUpdatedAt(new Date());
    }, () => setFeedStatus('Connection error'));
    socket.addEventListener('open', () => setFeedStatus('Connected'));
    socket.addEventListener('close', () => setFeedStatus('Disconnected'));
    return () => socket.close();
  }, [isKotakConnected, tradingMode]);

  const viewOrderHistory = async (orderNumber: string) => {
    setHistoryOrderNumber(orderNumber);
    setSelectedOrderHistory(null);
    setHistoryLoading(true);
    try {
      const history = await api.getOrderHistory(orderNumber);
      setSelectedOrderHistory(history);
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Unable to retrieve order history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const cancelOrder = async (order: OrderItem) => {
    const orderClass = order.product === 'CO' ? 'COVER' : order.product === 'BO' ? 'BRACKET' : 'REGULAR';
    if (!window.confirm(`Cancel ${order.transactionType} ${order.quantity} ${order.tradingSymbol} order ${order.orderNumber} (${orderClass})?`)) return;
    setActionError(null);
    try {
      await api.cancelLiveOrder(order.orderNumber, {
        orderClass,
        verifyStatus: true,
        amo: order.isAmo,
        tradingSymbol: order.tradingSymbol,
      }, true);
      await loadData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Order cancellation failed.');
    }
  };

  const modifyOrder = async (order: OrderItem) => {
    const quantityInput = window.prompt('Enter the new total order quantity:', String(order.quantity));
    if (quantityInput === null) return;
    const quantity = Number(quantityInput);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setActionError('Order quantity must be a positive whole number.');
      return;
    }
    const price = order.orderType === 'MARKET'
      ? 0
      : Number(window.prompt('Enter the new order price:', String(order.price)));
    if (order.orderType !== 'MARKET' && (!Number.isFinite(price) || price <= 0)) {
      setActionError('Enter a valid positive order price.');
      return;
    }
    if (!window.confirm(`Modify live order ${order.orderNumber} to ${quantity} × ${order.tradingSymbol} @ ₹${price || 'MKT'}?`)) return;
    setActionError(null);
    try {
      await api.modifyLiveOrder(order.orderNumber, {
        tradingSymbol: order.tradingSymbol,
        exchangeSegment: order.exchangeSegment,
        transactionType: order.transactionType,
        product: order.product,
        quantity,
        price,
        orderType: order.orderType,
        validity: order.validity,
        isAmo: order.isAmo,
      }, true);
      await loadData();
    } catch (err: any) {
      setActionError(err.response?.data?.error || err.message || 'Order modification failed.');
    }
  };

  const canManageLiveOrders = isKotakConnected && tradingMode === 'LIVE';

  return (
    <div className="space-y-6 font-mono text-xs">
      {actionError && (
        <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Order Feed Status */}
      <section aria-label="Live Kotak order feed" className="rounded-xl border border-cyan-500/20 bg-slate-900/70 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          {feedStatus === 'Connected' ? <Wifi className="h-4 w-4 text-emerald-400" /> : <WifiOff className="h-4 w-4 text-slate-500" />}
          <span>Kotak Neo Order Feed (HSI WebSocket)</span>
          <span className={`ml-auto ${feedStatus === 'Connected' ? 'text-emerald-300' : 'text-slate-400'}`}>{feedStatus}</span>
        </div>
        {lastFeedMessage && (
          <div className="mt-3 rounded-lg bg-slate-950 p-3 text-[11px] text-cyan-200">
            <pre className="whitespace-pre-wrap break-all">{lastFeedMessage}</pre>
            {feedUpdatedAt && <p className="mt-2 text-[10px] text-slate-500">Updated {feedUpdatedAt.toLocaleTimeString()}</p>}
          </div>
        )}
      </section>

      {/* Sub Tabs */}
      <div className="flex space-x-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveSubTab('ORDERS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'ORDERS'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          <span>ORDER BOOK ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('TRADES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeSubTab === 'TRADES'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>TRADE BOOK ({trades.length})</span>
        </button>
      </div>

      {activeSubTab === 'ORDERS' ? (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Order #</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">History</th>
                  {canManageLiveOrders && <th className="py-2.5 px-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {orders.map((ord, i) => (
                  <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-cyan-400 text-[11px] font-semibold">{ord.orderNumber}</td>
                    <td className="py-3 px-3 text-gray-400">{ord.orderTime ? new Date(ord.orderTime).toLocaleTimeString() : '—'}</td>
                    <td className="py-3 px-3 font-bold text-white">{ord.symbol}</td>
                    <td className={`py-3 px-3 font-bold ${ord.transactionType === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {ord.transactionType} ({ord.orderType})
                    </td>
                    <td className="py-3 px-3 text-gray-300">{ord.product}</td>
                    <td className="py-3 px-3 text-gray-200">{ord.quantity}</td>
                    <td className="py-3 px-3 text-white font-semibold">₹{ord.price.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {canManageLiveOrders ? (
                        <button
                          onClick={() => viewOrderHistory(ord.orderNumber)}
                          className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-200 px-2 py-1 rounded bg-gray-950 border border-gray-800"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Timeline</span>
                        </button>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    {canManageLiveOrders && (
                      <td className="py-3 px-3">
                        {!['rejected', 'cancelled', 'complete', 'traded'].includes(ord.status.toLowerCase()) && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => void modifyOrder(ord)}
                              className="rounded border border-cyan-700/50 px-2 py-1 text-[10px] text-cyan-300 hover:bg-cyan-950/60"
                            >
                              MODIFY
                            </button>
                            <button
                              type="button"
                              onClick={() => void cancelOrder(ord)}
                              className="rounded border border-rose-700/50 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-950/60"
                            >
                              CANCEL
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Trade ID</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Symbol</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Avg Exec Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {trades.map((trd, i) => (
                  <tr key={i} className="hover:bg-gray-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-cyan-400 text-[11px]">{trd.tradeId || trd.orderNumber}</td>
                    <td className="py-3 px-3 text-gray-400">{trd.tradeTime ? new Date(trd.tradeTime).toLocaleTimeString() : '—'}</td>
                    <td className="py-3 px-3 font-bold text-white">{trd.symbol}</td>
                    <td className={`py-3 px-3 font-bold ${trd.transactionType === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {trd.transactionType}
                    </td>
                    <td className="py-3 px-3 text-gray-200">{trd.quantity}</td>
                    <td className="py-3 px-3 text-white font-semibold">₹{(trd.price || trd.averagePrice || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order History Timeline Modal */}
      {historyOrderNumber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl p-6 border border-gray-700 bg-gray-900 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Order Status Lifecycle</h3>
                <p className="text-[11px] text-cyan-400 font-mono">Order #{historyOrderNumber}</p>
              </div>
              <button
                onClick={() => setHistoryOrderNumber(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="py-8 text-center text-cyan-300">Loading order lifecycle events…</div>
            ) : !selectedOrderHistory || selectedOrderHistory.length === 0 ? (
              <div className="py-6 text-center text-gray-400">No status transitions recorded yet.</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {selectedOrderHistory.map((item, idx) => (
                  <div key={idx} className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white uppercase">{item.status}</span>
                      <span className="text-[10px] text-gray-400">{item.orderTime}</span>
                    </div>
                    <div className="text-[11px] text-gray-300">
                      {item.transactionType} {item.quantity} × {item.tradingSymbol} @ ₹{item.price || item.averagePrice || 0}
                    </div>
                    {item.rejectionReason && (
                      <div className="text-[11px] text-rose-400 font-medium">
                        Reason: {item.rejectionReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
