const STORES = [
  { label: 'ChromaDB', detail: 'Vector search' },
  { label: 'SQLite', detail: 'Documents, entities, patterns, gaps' },
  { label: 'NetworkX', detail: 'Knowledge Graph' },
  { label: 'Gemini Flash', detail: 'Generation & extraction' },
  { label: 'Supabase', detail: 'Signed file storage' },
];

const PIPELINE = [
  '1. Upload & validate',
  '2. Extract text',
  '3. Chunk & embed locally',
  '4. Extract entities',
  '5. Update graph',
  '6. Run alert checks',
];

function Box({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`border rounded-md px-3 py-2 text-xs font-medium text-center whitespace-nowrap ${
        accent ? 'border-accent-teal text-accent-teal' : 'border-border-default text-text-primary'
      }`}
    >
      {children}
    </div>
  );
}

export default function ArchitectureDiagram() {
  return (
    <div className="max-w-3xl mx-auto bg-bg-surface border border-border-default rounded-lg p-6 flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Box>Field Technician</Box>
          <span className="text-text-muted" aria-hidden="true">→</span>
          <Box>React Frontend</Box>
          <span className="text-text-muted" aria-hidden="true">→</span>
          <Box accent>FastAPI Backend</Box>
        </div>
        <div className="flex items-center justify-center gap-2 flex-wrap mt-3">
          {STORES.map(({ label, detail }) => (
            <div key={label} className="border border-dashed border-border-strong rounded-md px-2.5 py-1.5 text-center">
              <p className="text-2xs font-semibold text-text-primary">{label}</p>
              <p className="text-2xs text-text-muted">{detail}</p>
            </div>
          ))}
        </div>
        <p className="text-2xs text-text-muted text-center mt-2">
          The backend is the single coordination point. No store talks directly to another.
        </p>
      </div>

      <div className="border-t border-border-subtle pt-5">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {PIPELINE.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <Box accent={i === 3}>{step}</Box>
              {i < PIPELINE.length - 1 && <span className="text-text-muted" aria-hidden="true">→</span>}
            </div>
          ))}
        </div>
        <p className="text-2xs text-text-muted text-center mt-2">
          A failure at any step marks the document with a clear error — never a silent, partial
          success.
        </p>
      </div>
    </div>
  );
}
