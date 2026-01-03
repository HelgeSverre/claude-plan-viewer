import { useEffect, useCallback } from "react";
import type { Plan } from "../types.ts";
import { formatFullDate, formatSize } from "../utils/formatters.ts";
import { Markdown } from "./Markdown.tsx";

interface DetailOverlayProps {
  plan: Plan;
  onClose: () => void;
  onOpenEditor: () => void;
  onCopySession: (sessionId: string) => void;
}

export function DetailOverlay({
  plan,
  onClose,
  onOpenEditor,
  onCopySession,
}: DetailOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "f") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="detail-overlay is-open"
      id="detail-overlay"
      aria-hidden="false"
      onClick={onClose}
    >
      <div className="detail-overlay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-overlay-bar">
          <div className="detail-meta detail-overlay-meta">
            {plan.project && <span className="project-tag">{plan.project}</span>}
            <span>{plan.filename}</span>
            <span>{formatFullDate(plan.modified)}</span>
            <span>{formatSize(plan.size)}</span>
            <span>{plan.lineCount} lines</span>
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
            className="modal-close"
            onClick={onClose}
            title="Close fullscreen (Esc or F)"
          >
            ×
          </button>
        </div>
        <div className="detail-overlay-content">
          <Markdown content={plan.content || ""} />
        </div>
      </div>
    </div>
  );
}
