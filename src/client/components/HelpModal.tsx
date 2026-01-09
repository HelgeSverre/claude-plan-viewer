import { useEffect, useCallback, useRef } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface HelpModalProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: "↑ / ↓", description: "Navigate plans" },
  { keys: "Enter", description: "Open in editor" },
  { keys: "F", description: "Toggle fullscreen" },
  { keys: "⌘K", description: "Focus search" },
  { keys: "Esc", description: "Clear search / Close" },
  { keys: "?", description: "Toggle help" },
];

export function HelpModal({ onClose }: HelpModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="modal help-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="help-modal-title">Keyboard Shortcuts</h3>
          <button className="modal-close" onClick={onClose} title="Close (Esc)">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <table className="shortcuts-table">
            <tbody>
              {SHORTCUTS.map((shortcut) => (
                <tr key={shortcut.keys}>
                  <td className="shortcut-keys">
                    <kbd>{shortcut.keys}</kbd>
                  </td>
                  <td className="shortcut-desc">{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
