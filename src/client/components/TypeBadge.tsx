import type { MemoryType } from "../types.ts";

export const MEMORY_TYPES: MemoryType[] = [
  "feedback",
  "project",
  "reference",
  "user",
];

export function TypeBadge({ type }: { type: MemoryType }) {
  return (
    <span className={`type-badge type-${type}`}>
      <span className="type-dot" aria-hidden="true" />
      {type}
    </span>
  );
}
