import type { MemoryEntry, MemorySource, PlanMetadata } from "../types.ts";
import { formatCompactDateTime, formatDate } from "../utils/formatters.ts";
import { stripFrontmatter } from "../utils/markdown.ts";
import { pluralize } from "../utils/strings.ts";
import { Markdown } from "./Markdown.tsx";
import { TypeBadge } from "./TypeBadge.tsx";
import { CopyIcon, EditIcon } from "./icons.tsx";

interface MemoryBodyProps {
  content: string | undefined;
  resolveLink: (target: string) => MemoryEntry | null;
  onNavigate: (entry: MemoryEntry) => void;
}

// Rendered memory markdown with [[wikilinks]] and .md links routed in-app
export function MemoryBody({
  content,
  resolveLink,
  onNavigate,
}: MemoryBodyProps) {
  if (content === undefined) {
    return <div className="loading">Loading content...</div>;
  }
  return (
    <Markdown
      content={stripFrontmatter(content)}
      isInternalLinkResolved={(target) => resolveLink(target) !== null}
      onInternalLink={(target) => {
        const entry = resolveLink(target);
        if (entry) onNavigate(entry);
      }}
    />
  );
}

// Type, project and file tags shared by the panel and the fullscreen overlay
export function MemoryMeta({
  entry,
  source,
  onCopyFilepath,
  onCopySession,
}: {
  entry: MemoryEntry;
  source: MemorySource;
  onCopyFilepath: (filepath: string) => void;
  onCopySession: (sessionId: string) => void;
}) {
  return (
    <>
      {entry.type && <TypeBadge type={entry.type} />}
      <span className="project-badge">{source.project}</span>
      <span title={entry.modified}>{formatDate(entry.modified)}</span>
      <span>{formatCompactDateTime(entry.modified)}</span>
      <button
        className="filename-tag"
        onClick={() => onCopyFilepath(entry.filepath)}
        title={`Click to copy: ${entry.filepath}`}
      >
        {entry.filename}
      </button>
      {entry.sessionId && (
        <button
          className="session-tag"
          onClick={() => onCopySession(entry.sessionId!)}
          title={`Written in session ${entry.sessionId}. Click to copy: claude --resume ${entry.sessionId}`}
        >
          {entry.sessionId.split("-")[0]}
        </button>
      )}
      {!source.active && (
        <span
          className="memory-flag muted"
          title="An autoMemoryDirectory setting points elsewhere, so Claude Code no longer reads this directory"
        >
          not in use
        </span>
      )}
    </>
  );
}

function Meter({
  value,
  limit,
  label,
}: {
  value: number;
  limit: number;
  label: string;
}) {
  const ratio = Math.min(value / limit, 1);
  const level = value > limit ? "over" : ratio >= 0.8 ? "near" : "ok";
  return (
    <div className={`memory-meter ${level}`}>
      <div className="memory-meter-track">
        <div
          className="memory-meter-fill"
          style={{ width: `${Math.max(ratio * 100, 1)}%` }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}

function IndexSummary({ source }: { source: MemorySource }) {
  const index = source.index;
  if (!index) return null;
  const kb = (bytes: number) => `${(bytes / 1000).toFixed(1)} KB`;
  const over = index.lines > index.lineLimit || index.bytes > index.byteLimit;

  return (
    <div className="memory-index-summary">
      <div className="memory-budget">
        <div className="memory-budget-title">
          {over
            ? "Over the session-start limit: lines past it are never loaded"
            : "Loaded at the start of every session"}
        </div>
        <Meter
          value={index.lines}
          limit={index.lineLimit}
          label={`${index.lines} of ${index.lineLimit} lines`}
        />
        <Meter
          value={index.bytes}
          limit={index.byteLimit}
          label={`${kb(index.bytes)} of ${kb(index.byteLimit)}`}
        />
      </div>
      {source.orphans.length > 0 && (
        <div className="memory-warning">
          Not linked from the index, so Claude won't find{" "}
          {source.orphans.length === 1 ? "it" : "them"}:{" "}
          {source.orphans.join(", ")}
        </div>
      )}
      {index.danglingLinks.length > 0 && (
        <div className="memory-warning">
          The index links to {pluralize(index.danglingLinks.length, "file")}{" "}
          that {index.danglingLinks.length === 1 ? "doesn't" : "don't"} exist:{" "}
          {index.danglingLinks.join(", ")}
        </div>
      )}
    </div>
  );
}

interface MemoryDetailPanelProps {
  entry: MemoryEntry | null;
  source: MemorySource | null;
  content: string | undefined;
  // Plan created in the session that wrote this memory
  originPlan: PlanMetadata | null;
  resolveLink: (target: string) => MemoryEntry | null;
  onNavigate: (entry: MemoryEntry) => void;
  onShowPlan: (plan: PlanMetadata) => void;
  onOpenEditor: () => void;
  onToggleOverlay: () => void;
  onCopySession: (sessionId: string) => void;
  onCopyFilepath: (filepath: string) => void;
  onCopy: () => void;
  copied: boolean;
}

export function MemoryDetailPanel({
  entry,
  source,
  content,
  originPlan,
  resolveLink,
  onNavigate,
  onShowPlan,
  onOpenEditor,
  onToggleOverlay,
  onCopySession,
  onCopyFilepath,
  onCopy,
  copied,
}: MemoryDetailPanelProps) {
  if (!entry || !source) {
    return (
      <div id="detail-panel" className="detail-panel">
        <div className="detail-empty">
          <p>Select a memory to view it</p>
          <p className="hint">
            Claude Code saves auto memory in ~/.claude/projects/*/memory
          </p>
        </div>
      </div>
    );
  }

  const backlinks = entry.linkedFrom
    .map((filename) => resolveLink(filename))
    .filter((e) => e !== null);

  return (
    <div id="detail-panel" className="detail-panel">
      <div className="detail-header">
        <div className="detail-header-top">
          <h2 className="detail-title">{entry.name}</h2>
          <div className="detail-actions">
            <button
              className={copied ? "action-btn copied" : "action-btn"}
              onClick={onCopy}
              title="Copy memory to clipboard"
            >
              <CopyIcon />
            </button>
            <button
              className="action-btn"
              onClick={onOpenEditor}
              title="Open in editor (Enter)"
            >
              <EditIcon />
            </button>
            <button
              className="action-btn"
              onClick={onToggleOverlay}
              title="Fullscreen (F)"
            >
              ⛶
            </button>
          </div>
        </div>

        <div className="detail-meta">
          <MemoryMeta
            entry={entry}
            source={source}
            onCopyFilepath={onCopyFilepath}
            onCopySession={onCopySession}
          />
        </div>

        {originPlan && (
          <div className="memory-origin">
            Written during plan{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onShowPlan(originPlan);
              }}
            >
              {originPlan.title}
            </a>
          </div>
        )}
      </div>

      <div className="detail-content">
        {entry.isIndex && <IndexSummary source={source} />}
        {entry.description && (
          <p className="memory-description">{entry.description}</p>
        )}
        <MemoryBody
          content={content}
          resolveLink={resolveLink}
          onNavigate={onNavigate}
        />
        {backlinks.length > 0 && (
          <div className="memory-backlinks">
            Linked from{" "}
            {backlinks.map((linked, i) => (
              <span key={linked.id}>
                {i > 0 && ", "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(linked);
                  }}
                >
                  {linked.name}
                </a>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
