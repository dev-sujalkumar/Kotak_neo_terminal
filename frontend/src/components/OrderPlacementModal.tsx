import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, Layers, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../services/api';

export const OrderPlacementModal: React.FC = () => {
  const {
    isOrderModalOpen,
    closeOrderModal,
    selectedSymbol,
    orderTransactionType,
    tradingMode,
    isTradingModeVerified,
    isKotakConnected
  } = useStore();

  const [exchangeSegment, setExchangeSegment] = useState('nse_cm');
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>(orderTransactionType);
  const [product, setProduct] = useState<'CNC' | 'MIS' | 'NRML' | 'CO' | 'BO' | 'MTF'>('CNC');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'SL' | 'SL-M' | 'SP' | '2L' | '3L'>('LIMIT');
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(0);
  const [triggerPrice, setTriggerPrice] = useState(0);
  const [marketProtection, setMarketProtection] = useState(0);
  const [isAmo, setIsAmo] = useState(false);
  const [tag, setTag] = useState('');
  const [squareOffType, setSquareOffType] = useState<'Absolute' | 'Ticks'>('Absolute');
  const [stopLossType, setStopLossType] = useState<'Absolute' | 'Ticks'>('Absolute');
  const [squareOffValue, setSquareOffValue] = useState(0);
  const [stopLossValue, setStopLossValue] = useState(0);
  const [trailingStopLoss, setTrailingStopLoss] = useState<'Y' | 'N'>('N');
  const [trailingStopLossValue, setTrailingStopLossValue] = useState(0);
  const [symbolQuery, setSymbolQuery] = useState(selectedSymbol);
  const [scripResults, setScripResults] = useState<Record<string, unknown>[]>([]);
  const [selectedScrip, setSelectedScrip] = useState<Record<string, unknown> | null>(null);
  const [scripSearchStatus, setScripSearchStatus] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string | null>(null);
  const [validity, setValidity] = useState<'DAY' | 'IOC'>('DAY');

  const [step, setStep] = useState<'FORM' | 'CONFIRM'>('FORM');
  const [marginValidation, setMarginValidation] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setTransactionType(orderTransactionType);
    setStep('FORM');
    setErrorMsg(null);
    setSuccessMsg(null);
    if (isOrderModalOpen) {
      setPrice(0);
      setQuoteStatus('Loading current market price…');
      const quoteRequest = selectedScrip && isKotakConnected && selectedScrip.pSymbol != null
        ? api.getKotakQuotes([{
            exchangeSegment,
            instrumentToken: String(selectedScrip.pSymbol),
          }], 'all').then(quotes => {
            const ltp = Number(quotes[0]?.ltp || quotes[0]?.iv || quotes[0]?.lastPrice);
            if (!Number.isFinite(ltp) || ltp <= 0) throw new Error('Kotak did not return a valid live price.');
            return { ltp, source: 'Kotak Neo live quote', updatedAt: new Date().toLocaleTimeString() };
          })
        : api.getQuote(String(selectedScrip?.pTrdSymbol || selectedSymbol), exchangeSegment)
            .then(quote => ({
              ltp: quote.ltp,
              source: quote.dataSource || 'market data',
              updatedAt: new Date(quote.lastUpdated).toLocaleTimeString(),
            }));
      quoteRequest.then(quote => {
          setPrice(quote.ltp);
          setQuoteStatus(`Indicative price from ${quote.source} · ${quote.updatedAt}`);
        })
        .catch(err => {
          setQuoteStatus(err.response?.data?.error || 'Current market price is unavailable. Enter a limit price manually.');
        });
    }
  }, [exchangeSegment, isKotakConnected, isOrderModalOpen, orderTransactionType, selectedScrip, selectedSymbol]);

  useEffect(() => {
    if (!isOrderModalOpen) return;
    setSymbolQuery(selectedSymbol);
    setSelectedScrip(null);
  }, [isOrderModalOpen, selectedSymbol]);

  useEffect(() => {
    if (!isOrderModalOpen || !isKotakConnected || !symbolQuery.trim()) {
      setScripResults([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      setScripSearchStatus('Searching Kotak instruments…');
      api.searchKotakScrips({
        exchangeSegment: exchangeSegment as 'nse_cm' | 'bse_cm' | 'nse_fo' | 'bse_fo' | 'cde_fo' | 'mcx_fo' | 'bcs-fo',
        symbol: symbolQuery,
      })
        .then(results => {
          setScripResults(results);
          setScripSearchStatus(results.length ? `${results.length} matching instruments` : 'No matching Kotak instruments');
        })
        .catch(err => {
          setScripResults([]);
          setScripSearchStatus(err.response?.data?.error || 'Kotak instrument search is unavailable.');
        });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [exchangeSegment, isKotakConnected, isOrderModalOpen, symbolQuery]);

  const buildOrderParams = () => ({
    symbol: String(selectedScrip?.pSymbolName || selectedSymbol),
    tradingSymbol: String(selectedScrip?.pTrdSymbol || `${selectedSymbol}-EQ`),
    exchangeSegment,
    transactionType,
    orderType,
    product,
    quantity: Number(quantity),
    price: orderType === 'MARKET' ? 0 : Number(price),
    validity,
    triggerPrice: Number(triggerPrice),
    marketProtection: Number(marketProtection),
    isAmo,
    tag: tag || undefined,
    scripToken: selectedScrip?.pSymbol == null ? undefined : String(selectedScrip.pSymbol),
    squareOffType,
    stopLossType,
    stopLossValue: Number(stopLossValue),
    squareOffValue: Number(squareOffValue),
    trailingStopLoss,
    trailingStopLossValue: Number(trailingStopLossValue),
  });

  if (!isOrderModalOpen) return null;

  const handleValidateMargin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (['SL', 'SL-M'].includes(orderType) && triggerPrice <= 0) {
        throw new Error('Stop-loss orders require a positive trigger price.');
      }
      if (product === 'CO' && (stopLossValue <= 0 || triggerPrice <= 0)) {
        throw new Error('Cover orders require a positive trigger price and stop-loss value.');
      }
      if (product === 'BO' && (stopLossValue <= 0 || squareOffValue <= 0)) {
        throw new Error('Bracket orders require positive stop-loss and square-off values.');
      }
      const orderParams = buildOrderParams();

      const res = await api.validateOrder(orderParams);
      if (!res.valid) {
        setErrorMsg(res.errorReason || 'Pre-order margin check failed.');
      } else {
        setMarginValidation(res);
        setStep('CONFIRM');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteOrder = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const orderParams = buildOrderParams();

      const res = await api.placeOrder(orderParams, true);
      setSuccessMsg(`Order ${res.orderNumber} executed successfully in ${tradingMode} mode!`);
      setTimeout(() => {
        closeOrderModal();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const estimatedValue = quantity * price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-lg bg-[#0f172a] border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900/60">
          <div className="flex items-center space-x-2">
            <span
              className={`px-2.5 py-0.5 rounded text-[11px] font-bold border flex items-center gap-1 ${
                tradingMode === 'LIVE'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600/50'
                  : 'bg-amber-950/80 text-amber-400 border-amber-600/50'
              }`}
            >
              {tradingMode === 'LIVE' ? <Zap className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
              {tradingMode} MODE
            </span>
            <h3 className="text-sm font-bold text-white">
              {transactionType} {String(selectedScrip?.pSymbolName || selectedSymbol)}
            </h3>
          </div>
          <button onClick={closeOrderModal} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="bg-rose-950/50 border border-rose-500/50 text-rose-300 p-3 rounded-lg text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 p-3 rounded-lg text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isTradingModeVerified && (
            <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200">
              Trading mode verification is unavailable. Close this ticket and restore the API connection before placing orders.
            </div>
          )}

          {step === 'FORM' ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block text-gray-400">Exchange segment</span>
                  <select
                    value={exchangeSegment}
                    onChange={event => {
                      setExchangeSegment(event.target.value);
                      setSelectedScrip(null);
                    }}
                    className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  >
                    <option value="nse_cm">NSE Cash</option>
                    <option value="bse_cm">BSE Cash</option>
                    <option value="nse_fo">NSE F&amp;O</option>
                    <option value="bse_fo">BSE F&amp;O</option>
                    <option value="cde_fo">Currency F&amp;O</option>
                    <option value="mcx_fo">MCX F&amp;O</option>
                    <option value="bcs-fo">BSE Currency F&amp;O</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-gray-400">Search Kotak instruments</span>
                  <input
                    value={symbolQuery}
                    onChange={event => {
                      setSymbolQuery(event.target.value);
                      setSelectedScrip(null);
                    }}
                    placeholder="Symbol or trading symbol"
                    className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  />
                </label>
              </div>
              {isKotakConnected && scripResults.length > 0 && (
                <select
                  aria-label="Kotak instrument"
                  value={selectedScrip ? String(scripResults.indexOf(selectedScrip)) : ''}
                  onChange={event => {
                    const scrip = scripResults[Number(event.target.value)];
                    if (!scrip) return;
                    setSelectedScrip(scrip);
                  }}
                  className="w-full rounded border border-cyan-900/60 bg-gray-950 px-3 py-2 text-cyan-200"
                >
                  <option value="">Choose the exact broker instrument…</option>
                  {scripResults.slice(0, 100).map((scrip, index) => (
                    <option key={`${String(scrip.pSymbol)}-${index}`} value={index}>
                      {String(scrip.pTrdSymbol || scrip.pSymbolName || 'Unnamed instrument')}
                      {scrip.pDesc ? ` — ${String(scrip.pDesc)}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {scripSearchStatus && (
                <p role="status" className="text-[10px] text-gray-500">
                  {isKotakConnected ? scripSearchStatus : 'Connect Kotak Neo to search its instrument master.'}
                </p>
              )}

              {/* Buy / Sell Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-950 rounded-lg border border-gray-800">
                <button
                  onClick={() => setTransactionType('BUY')}
                  className={`py-2 rounded-md font-bold text-xs transition-all ${
                    transactionType === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setTransactionType('SELL')}
                  className={`py-2 rounded-md font-bold text-xs transition-all ${
                    transactionType === 'SELL'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  SELL
                </button>
              </div>

              {/* Product & Order Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Product Code (pc)</label>
                  <select
                    value={product}
                    onChange={event => setProduct(event.target.value as typeof product)}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CNC">CNC (Delivery)</option>
                    <option value="MIS">MIS (Intraday)</option>
                    <option value="NRML">NRML (Normal F&O)</option>
                    <option value="CO">CO (Cover Order)</option>
                    <option value="BO">BO (Bracket Order)</option>
                    <option value="MTF">MTF</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Order Type (pt)</label>
                  <select
                    value={orderType}
                    onChange={event => setOrderType(event.target.value as typeof orderType)}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LIMIT">LIMIT</option>
                    <option value="MARKET">MARKET</option>
                    <option value="SL">STOP LOSS</option>
                    <option value="SL-M">STOP LOSS MARKET</option>
                    <option value="SP">SPREAD</option>
                    <option value="2L">TWO LEG</option>
                    <option value="3L">THREE LEG</option>
                  </select>
                </div>
              </div>

              {/* Quantity & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Quantity (qt)</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Limit Price ₹ (pr)</label>
                  <input
                    type="number"
                    min="0.05"
                    step="0.05"
                    disabled={orderType === 'MARKET'}
                    value={price || ''}
                    placeholder="Current market quote"
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-bold disabled:opacity-50"
                  />
                </div>
              </div>
              {quoteStatus && (
                <p role="status" className={`text-[10px] ${price > 0 ? 'text-gray-500' : 'text-amber-300'}`}>{quoteStatus}</p>
              )}

              {(orderType === 'SL' || orderType === 'SL-M' || product === 'CO') && (
                <label className="block">
                  <span className="mb-1 block text-gray-400">Trigger price ₹ (tp)</span>
                  <input
                    type="number"
                    min="0.05"
                    step="0.05"
                    value={triggerPrice || ''}
                    onChange={event => setTriggerPrice(Number(event.target.value) || 0)}
                    className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  />
                </label>
              )}

              {(product === 'CO' || product === 'BO') && (
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-700/30 bg-amber-950/20 p-3">
                  <label>
                    <span className="mb-1 block text-gray-400">Stop-loss type</span>
                    <select
                      value={stopLossType}
                      onChange={event => setStopLossType(event.target.value as typeof stopLossType)}
                      className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                    >
                      <option value="Absolute">Absolute</option>
                      <option value="Ticks">Ticks</option>
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-gray-400">Stop-loss value</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={stopLossValue || ''}
                      onChange={event => setStopLossValue(Number(event.target.value) || 0)}
                      className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                    />
                  </label>
                  {product === 'BO' && (
                    <>
                      <label>
                        <span className="mb-1 block text-gray-400">Square-off type</span>
                        <select
                          value={squareOffType}
                          onChange={event => setSquareOffType(event.target.value as typeof squareOffType)}
                          className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                        >
                          <option value="Absolute">Absolute</option>
                          <option value="Ticks">Ticks</option>
                        </select>
                      </label>
                      <label>
                        <span className="mb-1 block text-gray-400">Square-off value</span>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={squareOffValue || ''}
                          onChange={event => setSquareOffValue(Number(event.target.value) || 0)}
                          className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-gray-400">Trailing stop-loss</span>
                        <select
                          value={trailingStopLoss}
                          onChange={event => setTrailingStopLoss(event.target.value as typeof trailingStopLoss)}
                          className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                        >
                          <option value="N">Disabled</option>
                          <option value="Y">Enabled</option>
                        </select>
                      </label>
                      {trailingStopLoss === 'Y' && (
                        <label>
                          <span className="mb-1 block text-gray-400">Trailing stop-loss value</span>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={trailingStopLossValue || ''}
                            onChange={event => setTrailingStopLossValue(Number(event.target.value) || 0)}
                            className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                          />
                        </label>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 block text-gray-400">Validity</span>
                  <select
                    value={validity}
                    onChange={event => setValidity(event.target.value as typeof validity)}
                    className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  >
                    <option value="DAY">DAY</option>
                    <option value="IOC">IOC</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-gray-400">Order tag (optional)</span>
                  <input
                    maxLength={20}
                    value={tag}
                    onChange={event => setTag(event.target.value)}
                    className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  />
                </label>
              </div>
              {orderType === 'MARKET' && (
                <label className="block">
                  <span className="mb-1 block text-gray-400">Market protection (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marketProtection}
                    onChange={event => setMarketProtection(Number(event.target.value) || 0)}
                    className="w-full rounded border border-gray-800 bg-gray-900 px-3 py-2 text-white"
                  />
                </label>
              )}
              <label className="flex items-center gap-2 text-gray-300">
                <input type="checkbox" checked={isAmo} onChange={event => setIsAmo(event.target.checked)} />
                Place as after-market order (AMO)
              </label>

              {/* Estimated Summary */}
              <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 space-y-1 text-gray-400">
                <div className="flex justify-between">
                  <span>Exchange Segment:</span>
                  <span className="text-white">{exchangeSegment}</span>
                </div>
                <div className="flex justify-between font-bold text-white pt-1 border-t border-gray-800/80">
                  <span>Estimated Total Value:</span>
                  <span className="text-cyan-400">₹{estimatedValue.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleValidateMargin}
                disabled={loading || !isTradingModeVerified || price <= 0}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-lg shadow-lg transition-all"
              >
                {loading ? 'RUNNING PRE-ORDER MARGIN CHECK...' : 'CHECK MARGIN & PROCEED →'}
              </button>
            </div>
          ) : (
            /* Confirmation Step */
            <div className="space-y-4 text-xs">
              <div className="bg-cyan-950/30 border border-cyan-500/40 p-4 rounded-xl space-y-2">
                <h4 className="text-sm font-bold text-cyan-300 border-b border-cyan-800/60 pb-2">
                  CONFIRM LIVE ORDER DETAILS
                </h4>

                <div className="grid grid-cols-2 gap-y-1.5 text-gray-300">
                  <div>Stock: <span className="text-white font-bold">{String(selectedScrip?.pSymbolName || selectedSymbol)}</span></div>
                  <div>Exchange: <span className="text-white font-bold">{exchangeSegment}</span></div>
                  <div>Transaction: <span className={transactionType === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{transactionType}</span></div>
                  <div>Quantity: <span className="text-white font-bold">{quantity}</span></div>
                  <div>Order Type: <span className="text-white font-bold">{orderType}</span></div>
                  <div>Limit Price: <span className="text-white font-bold">₹{price.toFixed(2)}</span></div>
                  <div>Product: <span className="text-white font-bold">{product}</span></div>
                  <div>Validity: <span className="text-white font-bold">{validity}</span></div>
                  {triggerPrice > 0 && <div>Trigger Price: <span className="text-white font-bold">₹{triggerPrice.toFixed(2)}</span></div>}
                  {isAmo && <div>After-market order: <span className="text-white font-bold">YES</span></div>}
                </div>

                {marginValidation && (
                  <div className="pt-2 border-t border-cyan-800/60 text-[11px] space-y-1 text-gray-400">
                    <div className="flex justify-between">
                      <span>Available Margin:</span>
                      <span className="text-emerald-400 font-bold">₹{marginValidation.marginCheck.availableMargin.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Required Margin:</span>
                      <span className="text-cyan-400 font-bold">₹{marginValidation.marginCheck.requiredMargin.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('FORM')}
                  className="w-1/3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2.5 rounded-lg"
                >
                  ← BACK
                </button>
                <button
                  onClick={handleExecuteOrder}
                  disabled={loading || !isTradingModeVerified}
                  className={`w-2/3 font-bold py-2.5 rounded-lg shadow-lg text-white transition-all ${
                    transactionType === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {loading ? 'EXECUTING ORDER...' : `CONFIRM ${transactionType} ORDER`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
