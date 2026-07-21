// The Cast Number (Visual_Identity.md, signature element 8) — a permanent, referenceable
// short ID per record, the way an engineer cites a work order. Backend-issued and unique
// (Document.cast_number / Entity.cast_number — see corpusforge-backend/models), so two
// records can never render the same code. This only formats the number for the compact,
// stamped hex look; it does not derive or hash anything itself.
export function castNumber(n: number, prefix = 'DOC'): string {
  return `${prefix}-${n.toString(16).toUpperCase().padStart(4, '0')}`;
}
