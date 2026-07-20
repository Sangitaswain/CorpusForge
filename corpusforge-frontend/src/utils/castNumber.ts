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
  // XOR-fold the full 32-bit hash into 16 bits rather than truncating to the top 4 hex
  // digits — a plain slice discards the lower half of the hash's entropy outright, doubling
  // the collision rate for no reason, at no cost to the 4-character display format.
  const folded = (hash ^ (hash >>> 16)) & 0xffff;
  return `${prefix}-${folded.toString(16).toUpperCase().padStart(4, '0')}`;
}
