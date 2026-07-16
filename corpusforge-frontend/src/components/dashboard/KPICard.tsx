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
}

export default function KPICard({ title, value, caption, icon: Icon, ring }: KPICardProps) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5">
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-text-secondary">{title}</span>
        <Icon size={16} className="text-text-muted" />
      </div>
      {ring !== undefined ? (
        <div className="mt-2 flex justify-center">
          <RadialProgress percent={ring} label={String(value)} />
        </div>
      ) : (
        <p className="text-kpi font-bold text-text-primary mt-2">{value}</p>
      )}
      {caption && <p className="text-xs text-text-muted mt-3">{caption}</p>}
    </div>
  );
}
