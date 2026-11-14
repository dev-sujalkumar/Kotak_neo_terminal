import { create } from 'zustand';
import { QuoteData } from '../types';

interface AppState {
  selectedSymbol: string;
  activeTab: string;
  tradingMode: 'PAPER' | 'LIVE';
  isTradingModeVerified: boolean;
  isOrderModalOpen: boolean;
  orderTransactionType: 'BUY' | 'SELL';
  isKotakConnected: boolean;
  user: any | null;
  realtimeTicks: Record<string, QuoteData>;
  customNewsDraft: {
    text: string;
    company?: string;
    ticker?: string;
    autoAnalyze?: boolean;
  } | null;

  setSelectedSymbol: (symbol: string) => void;
  setActiveTab: (tab: string) => void;
  setTradingMode: (mode: 'PAPER' | 'LIVE') => void;
  setTradingModeVerified: (verified: boolean) => void;
  openOrderModal: (symbol?: string, type?: 'BUY' | 'SELL') => void;
  closeOrderModal: () => void;
  setKotakConnected: (connected: boolean) => void;
  setUser: (user: any) => void;
  updateTick: (quote: QuoteData) => void;
  setCustomNewsDraft: (draft: { text: string; company?: string; ticker?: string; autoAnalyze?: boolean } | null) => void;
}

export const useStore = create<AppState>((set) => ({
  selectedSymbol: 'TCS',
  activeTab: 'dashboard',
  tradingMode: 'PAPER',
  isTradingModeVerified: false,
  isOrderModalOpen: false,
  orderTransactionType: 'BUY',
  isKotakConnected: false,
  user: null,
  realtimeTicks: {},
  customNewsDraft: null,

  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol.toUpperCase() }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setTradingMode: (mode) => set({ tradingMode: mode }),
  setTradingModeVerified: (verified) => set({ isTradingModeVerified: verified }),
  openOrderModal: (symbol, type = 'BUY') =>
    set((state) => ({
      isOrderModalOpen: true,
      selectedSymbol: symbol ? symbol.toUpperCase() : state.selectedSymbol,
      orderTransactionType: type,
    })),
  closeOrderModal: () => set({ isOrderModalOpen: false }),
  setKotakConnected: (connected) => set({ isKotakConnected: connected }),
  setUser: (user) => set({ user, tradingMode: user?.tradingMode || 'PAPER' }),
  updateTick: (quote) =>
    set((state) => ({
      realtimeTicks: { ...state.realtimeTicks, [quote.symbol]: quote },
    })),
  setCustomNewsDraft: (draft) => set({ customNewsDraft: draft }),
}));
