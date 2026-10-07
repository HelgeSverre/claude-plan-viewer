import { Fragment } from "react";
import type { MemoryEntry, MemorySource } from "../types.ts";
import type { MemoryGroup } from "../hooks/useMemory.ts";
import { formatDate } from "../utils/formatters.ts";
import { abbreviateHome, pluralize } from "../utils/strings.ts";
import { Highlight } from "./Highlight.tsx";
import { TypeBadge } from "./TypeBadge.tsx";

interface MemoryTableProps {
  groups: MemoryGroup[];
  selectedId: string | null;
  searchQuery: string;
  onSelect: (entry: MemoryEntry) => void;
}

function GroupRow({ source }: { source: MemorySource }) {
  return (
    <tr className="memory-group-row">
      <td colSpan={3}>
        <span className="memory-group-name">{source.project}</span>
        <span className="memory-group-path" title={source.dir}>
          {abbreviateHome(source.cwd ?? source.dir)}
        </span>
        {source.kind === "custom" && (
          <span className="memory-flag" title={source.dir}>
            autoMemoryDirectory
          </span>
        )}
        {!source.active && (
          <span
            className="memory-flag muted"
            title="An autoMemoryDirectory setting points elsewhere, so Claude Code no longer reads this directory"
          >
            not in use
          </span>
        )}
        <span className="memory-group-count">
          {source.entryCount === 0 && source.index
            ? "index only"
            : pluralize(source.entryCount, "memory")}
        </span>
      </td>
    </tr>
  );
}

function EntryRow({
  entry,
  source,
  selected,
  searchQuery,
  onSelect,
}: {
  entry: MemoryEntry;
  source: MemorySource;
  selected: boolean;
  searchQuery: string;
  onSelect: (entry: MemoryEntry) => void;
}) {
  const subline = entry.isIndex
    ? `${source.project} index${source.index ? ` · ${source.index.lines} of ${source.index.lineLimit} lines` : ""}`
    : (entry.description ?? "");

  return (
    <tr
      className={selected ? "selected" : ""}
      data-memory-id={entry.id}
      data-row-id={entry.id}
      onMouseDown={() => onSelect(entry)}
    >
      <td className="memory-name-cell">
        <div className="memory-name">
          <Highlight text={entry.name} query={searchQuery} />
          {!entry.inIndex && (
            <span
              className="memory-flag warn"
              title="MEMORY.md doesn't link to this file, so Claude won't find it"
            >
              not in index
            </span>
          )}
        </div>
        {subline && (
          <div className="memory-subline">
            <Highlight text={subline} query={searchQuery} />
          </div>
        )}
      </td>
      <td className="type-cell">
        {entry.isIndex ? (
          <span className="memory-flag">index</span>
        ) : (
          entry.type && <TypeBadge type={entry.type} />
        )}
      </td>
      <td className="meta-cell" title={entry.modified}>
        {formatDate(entry.modified)}
      </td>
    </tr>
  );
}

export function MemoryTable({
  groups,
  selectedId,
  searchQuery,
  onSelect,
}: MemoryTableProps) {
  return (
    <div className="table-container">
      <table id="memory-table">
        <thead>
          <tr>
            <th className="no-sort">Memory</th>
            <th className="no-sort type-col">Type</th>
            <th className="no-sort date-col">Modified</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ source, entries }) => (
            <Fragment key={source.id}>
              <GroupRow source={source} />
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  source={source}
                  selected={entry.id === selectedId}
                  searchQuery={searchQuery}
                  onSelect={onSelect}
                />
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
