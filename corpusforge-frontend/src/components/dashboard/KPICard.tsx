import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import RadialProgress from './RadialProgress';

interface KPICardProps {
  title: string;
  value: string | number;
  caption?: ReactNode;
  icon: LucideIcon;
  /** 0-100: renders value inside a radial progress ring instead of plain KPI text. */
  ring?: number;
  /** Tints the number and icon when this metric represents an active problem — 'critical' recedes to
   *  'default' when there's nothing to flag, matching the compliance verdict color convention. */
  valueTone?: 'default' | 'critical';
}

export default function KPICard({ title, value, caption, icon: Icon, ring, valueTone = 'default' }: KPICardProps) {
  const isCritical = valueTone === 'critical';
  return (
    <div
      className={`bg-bg-surface rounded-lg p-5 border ${
        isCritical ? 'border-red-500/40' : 'border-border-default'
      }`}
    >
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        <Icon size={16} className={isCritical ? 'text-red-500' : 'text-text-muted'} />
      </div>
      {ring !== undefined ? (
        <div className="mt-2 flex justify-center">
          <RadialProgress percent={ring} label={String(value)} />
        </div>
      ) : (
        <p className={`text-kpi font-bold mt-2 ${isCritical ? 'text-red-500' : 'text-text-primary'}`}>{value}</p>
      )}
      {caption && <p className="text-xs text-text-muted mt-3">{caption}</p>}
    </div>
  );
}
