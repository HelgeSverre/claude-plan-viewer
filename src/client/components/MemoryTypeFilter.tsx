import type { MemoryType } from "../types.ts";
import { MEMORY_TYPES } from "./TypeBadge.tsx";

interface MemoryTypeFilterProps {
  counts: Record<MemoryType, number>;
  selected: Set<string>;
  onToggle: (type: MemoryType) => void;
  onClear: () => void;
}

export function MemoryTypeFilter({
  counts,
  selected,
  onToggle,
  onClear,
}: MemoryTypeFilterProps) {
  return (
    <div className="memory-filters" role="group" aria-label="Memory type">
      {MEMORY_TYPES.map((type) => (
        <button
          key={type}
          className={`type-chip type-${type}${selected.has(type) ? " active" : ""}`}
          aria-pressed={selected.has(type)}
          onClick={() => onToggle(type)}
        >
          <span className="type-dot" aria-hidden="true" />
          {type}
          <span className="type-chip-count">{counts[type]}</span>
        </button>
      ))}
      {selected.size > 0 && (
        <button className="type-chip-clear" onClick={onClear}>
          Clear
        </button>
      )}
    </div>
  );
}
