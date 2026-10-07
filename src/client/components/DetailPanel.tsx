import type { Plan } from "../types.ts";
import {
  formatDate,
  formatCompactDateTime,
  formatCreatedShort,
  isSameDay,
} from "../utils/formatters.ts";
import { pluralize } from "../utils/strings.ts";
import { Markdown } from "./Markdown.tsx";
import { CopyIcon, EditIcon } from "./icons.tsx";

interface DetailPanelProps {
  plan: Plan | null;
  // Topic files in the plan's project memory
  memoryCount: number;
  onShowMemory: (project: string) => void;
  onOpenEditor: () => void;
  onToggleOverlay: () => void;
  onCopySession: (sessionId: string) => void;
  onCopyFilepath: (filepath: string) => void;
  onCopyPlan: () => void;
  copied: boolean;
}

export function DetailPanel({
  plan,
  memoryCount,
  onShowMemory,
  onOpenEditor,
  onToggleOverlay,
  onCopySession,
  onCopyFilepath,
  onCopyPlan,
  copied,
}: DetailPanelProps) {
  if (!plan) {
    return (
      <div id="detail-panel" className="detail-panel">
        <div className="detail-empty">
          <p>Select a plan to view details</p>
          <p className="hint">
            Use ↑↓ arrows to navigate, Enter to open in editor
          </p>
        </div>
      </div>
    );
  }

  const project = plan.project;

  return (
    <div id="detail-panel" className="detail-panel">
      <div className="detail-header">
        <div className="detail-header-top">
          <h2 className="detail-title">{plan.title}</h2>
          <div className="detail-actions">
            <button
              className={copied ? "action-btn copied" : "action-btn"}
              onClick={onCopyPlan}
              title="Copy plan to clipboard"
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
          <span title={plan.modified}>{formatDate(plan.modified)}</span>
          <span>{formatCompactDateTime(plan.modified)}</span>
          {!isSameDay(plan.modified, plan.created) && (
            <span className="created-date">
              (created {formatCreatedShort(plan.created)})
            </span>
          )}
          <span>{plan.wordCount} words</span>
          <button
            className="filename-tag"
            onClick={() => onCopyFilepath(plan.filepath)}
            title={`Click to copy: ${plan.filepath}`}
          >
            {plan.filename}
          </button>
          {project && <span className="project-badge">{project}</span>}
          {project && memoryCount > 0 && (
            <button
              className="memory-tag"
              onClick={() => onShowMemory(project)}
              title={`Show ${project} memory (2)`}
            >
              {pluralize(memoryCount, "memory")}
            </button>
          )}
          {plan.sessionId && (
            <button
              className="session-tag"
              onClick={() => onCopySession(plan.sessionId!)}
              title={`Click to copy: claude --resume ${plan.sessionId}`}
            >
              {plan.sessionId.split("-")[0]}
            </button>
          )}
        </div>
      </div>

      <div className="detail-content">
        {plan.content !== undefined ? (
          <Markdown content={plan.content} />
        ) : (
          <div className="loading">Loading content...</div>
        )}
      </div>
    </div>
  );
}
