import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Upload } from 'lucide-react';

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.txt';
const ACCEPT_EXTENSIONS = ACCEPT.split(',');
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

// The backend is the real gate (SO-04/SO-05); this only saves the user a round trip for the
// two things checkable client-side without reading file content — extension and size. Both
// the drag-and-drop and native picker paths go through this so neither can bypass it.
function filterValidFiles(files: File[]): File[] {
  return files.filter((file) => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    return ACCEPT_EXTENSIONS.includes(ext) && file.size <= MAX_SIZE_BYTES;
  });
}

export default function UploadZone({ onFiles }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onFiles(filterValidFiles(Array.from(e.dataTransfer.files)));
  };

  const activate = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-xl p-10 text-center cursor-pointer transition-base border-2 ${
        dragOver
          ? 'border-solid border-accent-teal bg-accent-teal-wash'
          : 'border-dashed border-border-default bg-bg-surface'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          onFiles(filterValidFiles(Array.from(e.target.files ?? [])));
          e.target.value = '';
        }}
      />
      <Upload size={32} className="mx-auto text-text-muted" />
      <p className="text-base font-medium text-text-secondary mt-3">
        Drag and drop files here <span className="text-accent-teal hover:underline">or click to browse</span>
      </p>
      <p className="text-xs text-text-muted mt-1">PDF · PNG · JPG · XLSX · CSV · TXT — Max 50MB per file</p>
    </div>
  );
}
