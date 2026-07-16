import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Finding } from '../../utils/dashboardStats';
import SeverityBadge from '../shared/SeverityBadge';

const ICONS = { pattern: AlertTriangle, gap: ShieldAlert } as const;
const ICON_TONE: Record<Finding['kind'], string> = {
  pattern: 'text-accent-orange',
  gap: 'text-red-500',
};

export default function AiInsightsPanel({ findings }: { findings: Finding[] }) {
  const navigate = useNavigate();

  if (findings.length === 0) {
    return (
      <p className="text-sm text-text-muted py-6 text-center">
        Run pattern analysis and a compliance check on the Intelligence page to see AI insights here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {findings.map((finding) => {
        const Icon = ICONS[finding.kind];
        return (
          <li key={finding.id}>
            <button
              onClick={() => navigate('/intelligence')}
              className="w-full flex items-start gap-3 text-left p-3 rounded-md hover:bg-bg-elevated transition-fast min-h-[44px]"
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_TONE[finding.kind]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{finding.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <SeverityBadge severity={finding.severity} />
                  <span className="text-xs text-text-muted">{finding.detail}</span>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
