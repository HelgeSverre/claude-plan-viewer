import { useEffect, useCallback } from "react";

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
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="btn btn-secondary" onClick={onClose}>
            ✕
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
