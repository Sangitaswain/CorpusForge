import { useNavigate } from 'react-router-dom';
import { FileUp, MessageSquare, ShieldCheck } from 'lucide-react';
import { useRunComplianceCheck } from '../../hooks/useIntelligence';

const ACTIONS = [
  { label: 'Upload Documents', description: 'Add PDFs, SOPs, or reports', to: '/documents', icon: FileUp },
  { label: 'Ask Forge a Question', description: 'Query your plant documents', to: '/ask-forge', icon: MessageSquare },
];

export default function QuickActions() {
  const navigate = useNavigate();
  const runCheck = useRunComplianceCheck();

  const handleComplianceCheck = () => {
    runCheck.mutate();
    navigate('/intelligence');
  };

  return (
    <div className="flex flex-col gap-2">
      {ACTIONS.map(({ label, description, to, icon: Icon }) => (
        <button
          key={label}
          onClick={() => navigate(to)}
          className="flex items-center gap-3 bg-bg-surface border border-border-default rounded-lg p-3 text-left hover:border-accent-teal hover:bg-bg-elevated transition-fast min-h-[44px]"
        >
          <Icon size={18} className="text-accent-teal shrink-0" />
          <span>
            <span className="block text-sm font-medium text-text-primary">{label}</span>
            <span className="block text-xs text-text-muted">{description}</span>
          </span>
        </button>
      ))}
      <button
        onClick={handleComplianceCheck}
        className="flex items-center gap-3 bg-bg-surface border border-border-default rounded-lg p-3 text-left hover:border-accent-teal hover:bg-bg-elevated transition-fast min-h-[44px]"
      >
        <ShieldCheck size={18} className="text-accent-teal shrink-0" />
        <span>
          <span className="block text-sm font-medium text-text-primary">Run Compliance Check</span>
          <span className="block text-xs text-text-muted">Compare procedures against regulations</span>
        </span>
      </button>
    </div>
  );
}
