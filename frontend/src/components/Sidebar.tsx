import React, { useState } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  BrainCircuit,
  Sliders,
  Briefcase,
  BookOpenCheck,
  Bell,
  History,
  ShieldAlert,
  Eye,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  FileText,
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  group: string;
  badge?: string;
  badgeColor?: string;
  description?: string;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard',   label: 'Dashboard',          icon: LayoutDashboard, group: 'MARKET',     description: 'Market overview' },
  { id: 'detail',      label: 'Stock Analysis',      icon: TrendingUp,      group: 'MARKET',     description: 'Deep dive analysis' },
  { id: 'watchlists',  label: 'Watchlists',          icon: Eye,             group: 'MARKET',     description: 'Track instruments' },
  { id: 'sentiment',   label: 'Sentiment Engine',    icon: BrainCircuit,    group: 'AI ENGINE',  badge: 'NLP',  badgeColor: 'purple', description: 'NLP news scoring' },
  { id: 'custom-news', label: 'News Analyser',       icon: FileText,        group: 'AI ENGINE',  badge: 'PDF + AI', badgeColor: 'green',  description: 'Upload PDF & news analysis' },
  { id: 'technical',   label: 'Technical Analysis',  icon: Sliders,         group: 'AI ENGINE',  description: 'Indicators & signals' },
  { id: 'portfolio',   label: 'Portfolio',           icon: Briefcase,       group: 'PORTFOLIO',  description: 'Holdings & P&L' },
  { id: 'orders',      label: 'Orders & Trades',     icon: BookOpenCheck,   group: 'PORTFOLIO',  description: 'Order history' },
  { id: 'alerts',      label: 'Alert Manager',       icon: Bell,            group: 'TOOLS',      description: 'Price & signal alerts' },
  { id: 'backtest',    label: 'Strategy Backtest',   icon: History,         group: 'TOOLS',      badge: 'PRO',  badgeColor: 'cyan',   description: 'Historical backtesting' },
  { id: 'kotak-setup', label: 'Kotak Neo Setup',     icon: ShieldAlert,     group: 'BROKER',     description: 'Broker configuration' },
];

const groupOrder = ['MARKET', 'AI ENGINE', 'PORTFOLIO', 'TOOLS', 'BROKER'];

const badgeColors: Record<string, string> = {
  purple: 'bg-[rgba(168,85,247,0.15)] text-purple-300 border border-[rgba(168,85,247,0.3)]',
  cyan:   'bg-[rgba(84,214,207,0.12)] text-[#78dcd5] border border-[rgba(84,214,207,0.3)]',
  green:  'bg-[rgba(0,255,136,0.12)] text-green-300 border border-[rgba(0,255,136,0.3)]',
};

export const Sidebar: React.FC<{ mobileOpen: boolean; onNavigate: () => void }> = ({ mobileOpen, onNavigate }) => {
  const { activeTab, setActiveTab, isKotakConnected, user, tradingMode } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  const grouped = groupOrder.reduce((acc, g) => {
    acc[g] = menuItems.filter(m => m.group === g);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <aside
      className={`app-sidebar fixed top-[68px] bottom-0 left-0 z-40 flex w-60 flex-col border-r border-[rgba(173,190,208,0.09)] bg-[rgba(11,16,24,0.96)]
                  transition-all duration-300 ease-in-out select-none md:relative md:inset-auto md:z-auto md:shadow-none md:shrink-0
                  ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
                  ${collapsed ? 'app-sidebar-collapsed md:w-[68px]' : 'md:w-[264px]'}`}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="app-sidebar-toggle absolute -right-3.5 top-6 z-20 w-7 h-7 rounded-full
                   flex items-center justify-center
                   transition-all duration-200"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Scrollable Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {groupOrder.map(group => (
          <div key={group}>
            {/* Group Label */}
            {!collapsed && (
              <div className="app-nav-group-label px-3 mb-2 text-[9px] font-mono font-bold tracking-[0.15em] text-[#637286] uppercase flex items-center gap-2">
                <span className="flex-1">{group}</span>
                <div className="h-px flex-1 bg-[rgba(173,190,208,0.07)]" />
              </div>
            )}
            {collapsed && <div className="h-px bg-[rgba(173,190,208,0.06)] mx-2 mb-3" />}

            {/* Group Items */}
            <div className="space-y-0.5">
              {grouped[group]?.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    title={collapsed ? item.label : undefined}
                    onClick={() => {
                      setActiveTab(item.id);
                      onNavigate();
                    }}
                    className={`app-nav-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                text-xs font-medium transition-all duration-200 group relative
                                ${collapsed ? 'justify-center' : ''}
                                ${isActive ? 'app-nav-active' : ''}`}
                  >
                    {/* Active Glow Bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#54d6cf] rounded-r-full" />
                    )}

                    {/* Icon */}
                    <div className={`shrink-0 transition-all duration-200
                                    ${isActive
                                      ? 'w-7 h-7 rounded-lg bg-[rgba(84,214,207,0.12)] border border-[rgba(84,214,207,0.2)] flex items-center justify-center'
                                      : 'w-7 h-7 rounded-lg flex items-center justify-center group-hover:bg-[rgba(255,255,255,0.05)]'
                                    }`}>
                      <Icon className={`w-4 h-4 transition-colors duration-200
                                       ${isActive ? 'text-[#54d6cf]' : 'text-[#637286] group-hover:text-[#a2afbd]'}`} />
                    </div>

                    {!collapsed && (
                      <>
                        <div className="flex-1 text-left min-w-0">
                          <div className={`font-semibold text-[11px] leading-tight transition-colors
                                          ${isActive ? 'text-[#eff8f7]' : 'text-[#8c9aab] group-hover:text-[#e7edf2]'}`}>
                            {item.label}
                          </div>
                          {item.description && (
                            <div className={`text-[9px] leading-tight mt-0.5 transition-colors
                                            ${isActive ? 'text-[#54d6cf]/70' : 'text-[#4e5d6d] group-hover:text-[#637286]'}`}>
                              {item.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.badge && (
                            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-md font-mono ${badgeColors[item.badgeColor || 'cyan']}`}>
                              {item.badge}
                            </span>
                          )}
                          {isActive && (
                            <span className="w-1.5 h-1.5 bg-[#54d6cf] rounded-full animate-dot-blink
                                             shadow-[0_0_6px_rgba(84,214,207,0.9)]" />
                          )}
                        </div>
                      </>
                    )}

                    {/* Tooltip for collapsed */}
                    {collapsed && (
                      <div className="absolute left-full ml-3 px-3 py-2 bg-[rgba(11,16,24,0.98)]
                                      border border-[rgba(84,214,207,0.2)] rounded-xl text-[11px] font-mono
                                      text-white whitespace-nowrap opacity-0 pointer-events-none
                                      group-hover:opacity-100 transition-opacity duration-200
                                      shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_12px_rgba(84,214,207,0.08)] z-50">
                        <div className="font-semibold">{item.label}</div>
                        {item.badge && (
                          <span className={`ml-2 text-[8px] font-bold px-1 py-0.5 rounded ${badgeColors[item.badgeColor || 'cyan']}`}>
                            {item.badge}
                          </span>
                        )}
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3
                                        bg-[rgba(11,16,24,0.98)] border-l border-t border-[rgba(84,214,207,0.2)]
                                        rotate-[-45deg]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Status Panel */}
      {!collapsed && (
        <div className="app-sidebar-footer px-3 pb-4 pt-2 space-y-2">
          {/* User Profile Card */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-mono font-bold text-xs text-white shadow-sm shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'T'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-slate-200 truncate font-sans">
                {user?.name || 'Institutional Desk'}
              </div>
              <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tradingMode === 'LIVE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="truncate">{tradingMode === 'LIVE' ? 'Live Broker Mode' : 'Paper Sandbox Mode'}</span>
              </div>
            </div>
          </div>

          {/* Broker Status */}
          <div className="relative overflow-hidden flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5
                          hover:border-[rgba(84,214,207,0.15)] transition-all duration-200">
            {isKotakConnected && (
              <div className="absolute inset-0 rounded-xl bg-[rgba(46,179,131,0.03)] pointer-events-none" />
            )}
            <div className="relative">
              {isKotakConnected
                ? <Wifi className="w-4 h-4 text-[#65d5a8]" />
                : <WifiOff className="w-4 h-4 text-slate-500" />}
              <span className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${isKotakConnected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-dot-blink' : 'bg-slate-500'}`} />
            </div>
            <div className="min-w-0 relative">
              <div className="text-[10px] font-semibold text-slate-200">Kotak Neo API</div>
              <div className="mt-0.5 text-[9px] text-slate-500">{isKotakConnected ? 'Gateway active' : 'Gateway offline'}</div>
            </div>
            <span className={`ml-auto text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-md border relative
                              ${isKotakConnected
                                ? 'text-[#65d5a8] bg-[rgba(46,179,131,0.1)] border-[rgba(46,179,131,0.25)]'
                                : 'text-slate-500 bg-white/[0.03] border-white/[0.07]'}`}>
              {isKotakConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>
      )}

      {/* Collapsed mini-status */}
      {collapsed && (
        <div className="pb-4 pt-3 flex flex-col items-center gap-2 border-t border-[rgba(173,190,208,0.06)]">
          {isKotakConnected
            ? <span title="Kotak connected"><Wifi className="w-4 h-4 text-[#65d5a8]" /></span>
            : <span title="Kotak disconnected"><WifiOff className="w-4 h-4 text-slate-500" /></span>}
          <div className={`w-1.5 h-1.5 rounded-full ${isKotakConnected ? 'bg-emerald-400 animate-dot-blink' : 'bg-slate-500'}`} />
        </div>
      )}
    </aside>
  );
};
