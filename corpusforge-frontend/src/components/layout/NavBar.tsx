import { NavLink } from 'react-router-dom';
import { Layers, Bell } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/documents', label: 'Documents' },
  { to: '/copilot', label: 'Copilot' },
  { to: '/graph', label: 'Graph' },
  { to: '/intelligence', label: 'Intelligence' },
  { to: '/alerts', label: 'Alerts' },
];

export default function NavBar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-14 bg-[#070E0D] border-b border-[#224038] flex items-center px-6 gap-8">
      <div className="flex items-center gap-2 mr-4">
        <Layers size={18} className="text-accent-teal" />
        <span className="font-semibold text-base text-primary">CorpusForge</span>
      </div>

      <div className="flex items-center gap-1">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive
                ? 'text-primary font-semibold text-sm border-b-2 border-[#14B8A6] pb-0.5 px-3 py-1.5'
                : 'text-[#93ADA8] font-medium text-sm hover:text-primary hover:bg-[#192F29] px-3 py-1.5 rounded transition-all duration-100'
            }
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Bell size={18} className="text-secondary" />
        <div className="w-6 h-6 rounded-full bg-elevated" />
      </div>
    </nav>
  );
}
