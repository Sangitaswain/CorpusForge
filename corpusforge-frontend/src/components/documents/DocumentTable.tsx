import type { Document } from '../../types/document';
import DocumentRow from './DocumentRow';

interface DocumentTableProps {
  documents: Document[];
  onDelete: (doc: Document) => void;
}

const HEADERS = ['Cast No.', 'Filename', 'Type', 'Status', 'Pages', 'Entities', ''];

export default function DocumentTable({ documents, onDelete }: DocumentTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border-default">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="bg-bg-void border-b border-border-default">
            {HEADERS.map((header, i) => (
              <th
                key={i}
                className={`text-2xs font-medium text-text-muted uppercase tracking-wider px-4 py-3 ${i === HEADERS.length - 1 ? 'text-right' : 'text-left'}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <DocumentRow key={doc.id} document={doc} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
