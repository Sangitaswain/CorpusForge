import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  Layers,
  LayoutDashboard,
  MessageSquare,
  Moon,
  Share2,
  Sun,
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAlertCount } from '../../hooks/useAlerts';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/ask-forge', label: 'Ask Forge', icon: MessageSquare },
  { to: '/graph', label: 'Graph', icon: Share2 },
  { to: '/intelligence', label: 'Intelligence', icon: Cpu },
  { to: '/alerts', label: 'Alerts', icon: Bell },
];

const STORAGE_KEY = 'cf-sidebar-collapsed';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1');
  const { theme, toggleTheme } = useTheme();
  const { data: alertCount } = useAlertCount();
  const unreadCount = alertCount?.unread_count ?? 0;

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <nav
      className={`sticky top-0 h-dvh shrink-0 bg-bg-surface border-r border-border-default flex flex-col transition-[width] duration-base ${
        collapsed ? 'w-16' : 'w-60'
      } max-sm:!w-16`}
    >
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border-subtle shrink-0">
        <Layers size={20} className="text-accent-teal shrink-0" />
        <span className={`font-semibold text-base text-text-primary whitespace-nowrap ${collapsed ? 'hidden' : 'inline'} max-sm:hidden`}>
          CorpusForge
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-fast min-h-[44px] ${
                isActive
                  ? 'bg-accent-teal text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              }`
            }
          >
            <span className="relative shrink-0">
              <Icon size={18} />
              {to === '/alerts' && unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-semibold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className={`whitespace-nowrap ${collapsed ? 'hidden' : 'inline'} max-sm:hidden`}>{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="border-t border-border-subtle p-2 flex flex-col gap-1">
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-fast min-h-[44px]"
        >
          {theme === 'dark' ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
          <span className={`whitespace-nowrap ${collapsed ? 'hidden' : 'inline'} max-sm:hidden`}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </span>
        </button>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden sm:flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-fast min-h-[44px]"
        >
          {collapsed ? <ChevronRight size={18} className="shrink-0" /> : <ChevronLeft size={18} className="shrink-0" />}
          <span className={`whitespace-nowrap ${collapsed ? 'hidden' : 'inline'}`}>Collapse</span>
        </button>
      </div>
    </nav>
  );
}
