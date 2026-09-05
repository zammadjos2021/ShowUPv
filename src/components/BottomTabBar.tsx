import React from 'react';
import { Clock, History, MessageSquareText, BarChart3 } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomTabBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  recordCount: number;
  remarksCount: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  setActiveTab,
  recordCount,
  remarksCount,
}) => {
  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    {
      id: 'clock',
      label: 'Time Clock',
      icon: Clock,
    },
    {
      id: 'records',
      label: 'Logs / DTR',
      icon: History,
      badge: recordCount > 0 ? recordCount : undefined,
    },
    {
      id: 'remarks',
      label: 'Remarks Tab',
      icon: MessageSquareText,
      badge: remarksCount > 0 ? remarksCount : undefined,
    },
    {
      id: 'summary',
      label: 'Summary',
      icon: BarChart3,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center relative rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-indigo-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <div
                  className={`p-1 rounded-lg transition-colors ${
                    isActive ? 'bg-indigo-500/20' : 'bg-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                </div>
                {tab.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-600 text-white min-w-[16px] text-center shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{tab.label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 absolute bottom-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
