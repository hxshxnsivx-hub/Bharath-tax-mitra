/**
 * BottomNav Component
 *
 * Mobile-only bottom navigation bar (hidden on screens ≥ 768px).
 * 5 tabs: Home, Tax Filing, AI Help, Export, Settings.
 * Active tab shows blue highlight + indicator dot at top.
 * Tax Filing tab shows a badge when completeness is between 1–99%.
 */

import { Home, FileText, MessageCircle, Download, Settings } from 'lucide-react';

type Tab = 'home' | 'tax' | 'chat' | 'export' | 'settings';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  completenessScore?: number;
}

interface TabItem {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  ariaLabel: string;
}

const TABS: TabItem[] = [
  {
    id: 'home',
    label: 'Home',
    ariaLabel: 'Go to Home',
    icon: <Home className="w-6 h-6" aria-hidden="true" />,
  },
  {
    id: 'tax',
    label: 'Tax Filing',
    ariaLabel: 'Go to Tax Filing',
    icon: <FileText className="w-6 h-6" aria-hidden="true" />,
  },
  {
    id: 'chat',
    label: 'AI Help',
    ariaLabel: 'Open AI Help chat',
    icon: <MessageCircle className="w-6 h-6" aria-hidden="true" />,
  },
  {
    id: 'export',
    label: 'Export',
    ariaLabel: 'Export tax return',
    icon: <Download className="w-6 h-6" aria-hidden="true" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    ariaLabel: 'Open Settings',
    icon: <Settings className="w-6 h-6" aria-hidden="true" />,
  },
];

export function BottomNav({ activeTab, onTabChange, completenessScore = 0 }: BottomNavProps) {
  const showTaxBadge = completenessScore > 0 && completenessScore < 100;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Main navigation"
    >
      <div className="flex">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center pt-1 pb-2 px-1 transition-colors relative focus:outline-none focus-visible:bg-blue-50 ${
                isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {/* Active indicator dot at top */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full"
                  aria-hidden="true"
                />
              )}

              {/* Badge for tax tab */}
              {tab.id === 'tax' && showTaxBadge && (
                <span
                  className="absolute top-1 right-[calc(50%-14px)] w-4 h-4 bg-amber-400 rounded-full text-[10px] text-blue-900 font-bold flex items-center justify-center"
                  aria-label="Tax filing in progress"
                >
                  !
                </span>
              )}

              {tab.icon}
              <span className="text-xs mt-0.5 font-medium leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
