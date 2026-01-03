import type { Plan } from "../types.ts";
import { formatFullDate, formatDateISO, formatSize } from "../utils/formatters.ts";
import { Markdown } from "./Markdown.tsx";

interface DetailPanelProps {
  plan: Plan | null;
  onOpenEditor: () => void;
  onToggleOverlay: () => void;
  onCopySession: (sessionId: string) => void;
}

export function DetailPanel({
  plan,
  onOpenEditor,
  onToggleOverlay,
  onCopySession,
}: DetailPanelProps) {
  if (!plan) {
    return (
      <div id="detail-panel" className="detail-panel">
        <div className="detail-empty">
          <p>Select a plan to view details</p>
          <p className="hint">Use ↑↓ arrows to navigate, Enter to open in editor</p>
        </div>
      </div>
    );
  }

  return (
    <div id="detail-panel" className="detail-panel">
      <div className="detail-header">
        <div className="detail-header-top">
          <h2 className="detail-title">{plan.title}</h2>
          <div className="detail-actions">
            <button
              className="action-btn"
              onClick={onOpenEditor}
              title="Open in editor (Enter)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
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
          <span title={plan.modified}>
            Modified: {formatFullDate(plan.modified)}
          </span>
          <span>Created: {formatDateISO(plan.created)}</span>

          <span>{plan.wordCount} words</span>
          {plan.project && <span className="project-badge">{plan.project}</span>}
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
        {plan.content ? (
          <Markdown content={plan.content} />
        ) : (
          <div className="loading">Loading content...</div>
        )}
      </div>
    </div>
  );
}
