import { useEffect, useCallback, useRef, type ReactNode } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { CloseIcon, CopyIcon, EditIcon } from "./icons.tsx";

interface DetailOverlayProps {
  title: string;
  // Metadata shown in the top bar
  meta: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onOpenEditor: () => void;
  onCopy: () => void;
  copied: boolean;
}

export function DetailOverlay({
  title,
  meta,
  children,
  onClose,
  onOpenEditor,
  onCopy,
  copied,
}: DetailOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "f") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
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
      <div
        ref={panelRef}
        className="detail-overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-overlay-bar">
          <div className="detail-meta detail-overlay-meta">{meta}</div>
          <button
            className={copied ? "action-btn copied" : "action-btn"}
            onClick={onCopy}
            title="Copy to clipboard"
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
            className="modal-close"
            onClick={onClose}
            title="Close fullscreen (Esc or F)"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="detail-overlay-content">{children}</div>
      </div>
    </div>
  );
}
