// The Cast Number (Visual_Identity.md, signature element 8) — a permanent, referenceable
// short ID per record, the way an engineer cites a work order. Derived deterministically from
// the record's own database ID so it never changes across reloads or re-sorts, unlike a
// positional row index would. Not a substitute for a real backend-issued sequential number —
// this is a frontend-only stand-in until one exists.
export function castNumber(id: string, prefix = 'DOC'): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return `${prefix}-${hash.toString(16).toUpperCase().padStart(4, '0').slice(0, 4)}`;
}
