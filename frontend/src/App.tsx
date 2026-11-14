import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { api } from './services/api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OrderPlacementModal } from './components/OrderPlacementModal';

import { DashboardView } from './views/DashboardView';
import { StockDetailView } from './views/StockDetailView';
import { PortfolioView } from './views/PortfolioView';
import { OrdersView } from './views/OrdersView';
import { SentimentView } from './views/SentimentView';
import { CustomNewsView } from './views/CustomNewsView';
import { TechnicalView } from './views/TechnicalView';
import { WatchlistView } from './views/WatchlistView';
import { BacktestView } from './views/BacktestView';
import { KotakSetupView } from './views/KotakSetupView';
import { AlertsView } from './views/AlertsView';

export const App: React.FC = () => {
  const {
    activeTab,
    isTradingModeVerified,
    setKotakConnected,
    setUser,
    setTradingModeVerified,
  } = useStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [modeVerificationFailed, setModeVerificationFailed] = useState(false);

  useEffect(() => {
    // 1. Load User Profile & Kotak Broker Status
    const initApp = async () => {
      try {
        const [user, kStatus] = await Promise.all([api.getMe(), api.getKotakStatus()]);
        setKotakConnected(kStatus.connected);
        if (user?.tradingMode === 'LIVE' && !kStatus.connected) {
          await api.switchTradingMode('PAPER');
          setUser({ ...user, tradingMode: 'PAPER' });
        } else {
          setUser(user);
        }
        setTradingModeVerified(true);
        setModeVerificationFailed(false);
      } catch (err) {
        console.error('App init error:', err);
        setModeVerificationFailed(true);
      }
    };
    initApp();

  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'detail':
        return <StockDetailView />;
      case 'portfolio':
        return <PortfolioView />;
      case 'orders':
        return <OrdersView />;
      case 'sentiment':
        return <SentimentView />;
      case 'custom-news':
        return <CustomNewsView />;
      case 'technical':
        return <TechnicalView />;
      case 'watchlists':
        return <WatchlistView />;
      case 'backtest':
        return <BacktestView />;
      case 'kotak-setup':
        return <KotakSetupView />;
      case 'alerts':
        return <AlertsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-shell min-h-screen h-screen text-gray-100 flex flex-col antialiased">
      <Header onMenuClick={() => setMobileNavOpen(open => !open)} />
      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
            className="app-mobile-scrim fixed bottom-0 left-0 right-0 top-[68px] z-30 bg-black/60 md:hidden"
          />
        )}
        <Sidebar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
        <main className="app-main min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 xl:p-8">
          <div className="app-content mx-auto w-full max-w-[1500px]">
            {!isTradingModeVerified && modeVerificationFailed && (
              <div role="alert" className="mb-5 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-200">
                Trading mode could not be verified. Trading actions are disabled for safety; check the API connection and reload.
              </div>
            )}
            {renderActiveView()}
          </div>
        </main>
      </div>
      <OrderPlacementModal />
    </div>
  );
};
