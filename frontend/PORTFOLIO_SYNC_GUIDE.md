# Portfolio Sync - Frontend Integration Guide

## What Changed?

Your portfolio now automatically syncs with Kotak broker when you connect. No more empty holdings/positions! 🎉

## Updated Endpoints

### 1. GET `/api/portfolio/holdings` (IMPROVED)
**Now automatically syncs from Kotak on each request**

```typescript
// Before: Could return empty if not synced
// After: Always returns synced data from database

const response = await api.getHoldings();
// Response: [
//   {
//     symbol: 'TCS',
//     quantity: 10,
//     averagePrice: 3800,
//     currentPrice: 3950,
//     investedValue: 38000,
//     currentValue: 39500,
//     unrealizedPnL: 1500,
//     unrealizedPnLPct: 3.95
//   },
//   ...
// ]
```

**Key Point**: This endpoint now calls `sync` internally, so you get fresh data every time.

---

### 2. GET `/api/portfolio/positions` (IMPROVED)
**Now automatically syncs intraday positions from Kotak**

```typescript
const response = await api.getPositions();
// Response: [
//   {
//     symbol: 'INFY',
//     product: 'MIS',
//     netQuantity: 10,
//     buyQty: 10,
//     buyValue: 18000,
//     sellQty: 0,
//     sellValue: 0,
//     averagePrice: 1800,
//     realizedPnL: 0
//   },
//   ...
// ]
```

---

### 3. POST `/api/portfolio/sync` (NEW)
**Manually trigger portfolio sync**

```typescript
const response = await fetch('/api/portfolio/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Response:
// {
//   "success": true,
//   "message": "Portfolio synced: 5 holdings, 3 positions",
//   "data": {
//     "holdings": 5,
//     "positions": 3
//   }
// }
```

**Use Case**: User clicks "Refresh Portfolio" button → Sync is triggered manually

---

### 4. GET `/api/portfolio/sync-status` (NEW)
**Check current sync status**

```typescript
const response = await fetch('/api/portfolio/sync-status', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Response:
// {
//   "holdingsCount": 5,
//   "positionsCount": 3,
//   "lastHoldingsUpdate": "2026-10-06T20:48:30.000Z",
//   "lastPositionsUpdate": "2026-10-06T20:48:30.000Z",
//   "isKotakConnected": true,
//   "message": "Sync status retrieved"
// }
```

**Use Case**: Show user when portfolio was last synced

---

## Frontend Integration Examples

### Update PortfolioView to show sync status

```typescript
// frontend/src/views/PortfolioView.tsx

const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

useEffect(() => {
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/portfolio/sync-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setLastSyncTime(data.lastHoldingsUpdate);
    } catch (err) {
      console.error(err);
    }
  };

  fetchSyncStatus();
}, [token]);

// In render:
<div className="text-xs text-gray-400">
  Last synced: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}
</div>
```

### Add Manual Sync Button

```typescript
const [isSyncing, setIsSyncing] = useState(false);

const handleManualSync = async () => {
  setIsSyncing(true);
  try {
    const response = await fetch('/api/portfolio/sync', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      alert(`✓ Synced ${data.data.holdings} holdings, ${data.data.positions} positions`);
      // Reload portfolio
      loadPortfolioData();
    }
  } catch (err) {
    alert('Sync failed: ' + err.message);
  } finally {
    setIsSyncing(false);
  }
};

// In render:
<button
  onClick={handleManualSync}
  disabled={isSyncing}
  className="px-4 py-2 bg-cyan-600 rounded-lg text-white"
>
  {isSyncing ? 'Syncing...' : '🔄 Sync Portfolio'}
</button>
```

### Enhanced Holdings View with Sync Info

```typescript
// frontend/src/views/PortfolioView.tsx

export const PortfolioView: React.FC = () => {
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadPortfolioData = async () => {
    setLoading(true);
    try {
      // Get holdings (auto-synced)
      const holdingsData = await api.getHoldings();
      setHoldings(holdingsData);

      // Get sync status
      const statusData = await api.getSyncStatus?.() || {};
      setSyncStatus(statusData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolioData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border border-cyan-500/40 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              <span className="font-bold">{holdings.length}</span> Holdings | 
              <span className="font-bold ml-2">{syncStatus.positionsCount}</span> Positions
            </div>
            <div className="text-xs text-cyan-400">
              Last synced: {syncStatus.lastHoldingsUpdate 
                ? new Date(syncStatus.lastHoldingsUpdate).toLocaleTimeString() 
                : 'Never'}
            </div>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      {/* ... existing table code ... */}
    </div>
  );
};
```

---

## API Service Updates

Update your `api.ts` service to use the new endpoints:

```typescript
// frontend/src/services/api.ts

export const api = {
  // ... existing methods ...

  // Updated: Auto-syncs now
  getHoldings: async () => {
    const res = await axios.get('/api/portfolio/holdings', { 
      headers: getAuthHeaders() 
    });
    return res.data;
  },

  // Updated: Auto-syncs now
  getPositions: async () => {
    const res = await axios.get('/api/portfolio/positions', { 
      headers: getAuthHeaders() 
    });
    return res.data;
  },

  // NEW: Manual sync trigger
  syncPortfolio: async () => {
    const res = await axios.post('/api/portfolio/sync', {}, { 
      headers: getAuthHeaders() 
    });
    return res.data;
  },

  // NEW: Check sync status
  getSyncStatus: async () => {
    const res = await axios.get('/api/portfolio/sync-status', { 
      headers: getAuthHeaders() 
    });
    return res.data;
  },
};
```

---

## Auto-Sync On Connection

When user connects to Kotak broker, portfolio is automatically synced!

**Flow**:
1. User enters MPIN
2. Backend validates MPIN
3. 🔄 Backend auto-syncs portfolio
4. Response includes sync results
5. User sees populated holdings immediately ✓

**Frontend handling**:
```typescript
const handleKotakConnect = async (mpin: string) => {
  try {
    const response = await api.connectKotakBroker(mpin);
    
    // Response now includes sync data:
    // { success: true, sync: { holdings: 5, positions: 2 } }
    
    if (response.sync) {
      setSelectedSymbol('');
      setActiveTab('portfolio'); // Auto-navigate to portfolio
      showNotification(`✓ Connected! Synced ${response.sync.holdings} holdings`);
    }
  } catch (err) {
    showError(err.message);
  }
};
```

---

## Troubleshooting

### Issue: Still seeing 0 holdings
**Solution**:
1. Check Kotak connection status: `GET /api/broker/kotak/status`
2. Check sync status: `GET /api/portfolio/sync-status`
3. Try manual sync: `POST /api/portfolio/sync`
4. Check browser console for errors
5. Check server logs for sync failures

### Issue: Sync taking too long
**Reason**: First sync can take 3-5 seconds with retries
**Solution**: Retry logic handles this automatically

### Issue: Holdings not updating after trade
**Reason**: Sync only runs on endpoint call
**Solution**: Implement periodic sync or WebSocket updates (coming soon)

---

## Performance Tips

### 1. Don't Call getHoldings() Too Frequently
```typescript
// ❌ Bad: Hits sync on every keystroke
input.onChange(() => api.getHoldings());

// ✅ Good: Debounce API calls
const debouncedFetch = debounce(async () => {
  const holdings = await api.getHoldings();
}, 1000);
```

### 2. Cache Sync Status Locally
```typescript
// Store last sync time, update every 60 seconds
const [syncTime, setSyncTime] = useState<Date | null>(null);

useEffect(() => {
  const interval = setInterval(async () => {
    const status = await api.getSyncStatus();
    setSyncTime(new Date(status.lastHoldingsUpdate));
  }, 60000); // Every 60 seconds
  
  return () => clearInterval(interval);
}, []);
```

### 3. Use Sync Status to Show Loading State
```typescript
// Show spinner if holdings not recently synced
const isStale = !syncTime || Date.now() - syncTime.getTime() > 120000;

return (
  <div>
    {isStale && <Spinner />}
    {holdings.length === 0 && !isStale && <Empty />}
    {holdings.length > 0 && <HoldingsTable />}
  </div>
);
```

---

## What's Coming Next

### Phase 2: Real-Time Updates
- WebSocket for live position updates
- P&L streaming every second
- Order fill notifications

### Phase 3: Sync History
- Audit log of all syncs
- Reconciliation reports
- Mismatch alerts

### Phase 4: Smart Scheduling
- Periodic auto-sync every 60 seconds
- Market hours optimization
- Offline handling

---

## Summary

✅ Holdings now sync automatically from Kotak  
✅ Positions sync with intraday data  
✅ Manual sync available via `/api/portfolio/sync`  
✅ Sync status trackable via `/api/portfolio/sync-status`  
✅ Auto-sync on Kotak connection  
✅ Retry logic handles network issues  
✅ No breaking changes to existing API  

**Result**: Your portfolio data is now always up-to-date! 🚀
