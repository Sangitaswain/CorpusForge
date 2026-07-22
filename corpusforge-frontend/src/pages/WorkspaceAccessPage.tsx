import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Layers, Loader2, Lock } from 'lucide-react';

// Honest version of an enterprise login: there is no auth backend behind CorpusForge today (no
// users/sessions table, zero budget for an identity provider), so this deliberately doesn't
// pretend SSO works. It gives the workspace-gate *shape* enterprise evaluators expect without
// making a promise the product can't keep on camera.
export default function WorkspaceAccessPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const enterWorkspace = () => {
    setSubmitting(true);
    setTimeout(() => navigate('/dashboard'), 450);
  };

  return (
    <div className="min-h-dvh bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Layers size={22} className="text-accent-teal" />
          <span className="font-semibold text-lg text-text-primary">CorpusForge</span>
        </div>

        <div
          className={`bg-bg-surface border border-border-default rounded-lg shadow-card dark:shadow-none p-6 transition-all duration-300 ${
            submitting ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'
          }`}
        >
          <h1 className="text-lg font-semibold text-text-primary">Workspace access</h1>
          <p className="text-sm text-text-muted mt-1">Bharat Refineries Ltd. — Demo Workspace</p>

          <label className="block mt-6">
            <span className="text-xs font-medium text-text-secondary">Company</span>
            <input
              value="Bharat Refineries Ltd."
              disabled
              className="w-full mt-1.5 bg-bg-elevated border border-border-default rounded-md px-3 py-2.5 text-md text-text-secondary"
            />
          </label>

          <button
            onClick={enterWorkspace}
            disabled={submitting}
            className="w-full mt-5 inline-flex items-center justify-center gap-2 h-11 rounded-md bg-accent-teal text-white text-sm font-semibold hover:bg-accent-teal-bright transition-fast disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Launching workspace…
              </>
            ) : (
              <>
                Launch Workspace
                <ArrowRight size={15} />
              </>
            )}
          </button>

          <div className="flex items-center gap-2 mt-5 pt-5 border-t border-border-subtle text-text-disabled">
            <Lock size={13} />
            <span className="text-xs">Enterprise SSO (Azure AD / Google Workspace) — not enabled for this demo</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full text-center text-xs text-text-muted hover:text-text-primary mt-4 transition-fast"
        >
          ← Back to overview
        </button>
      </div>
    </div>
  );
}
