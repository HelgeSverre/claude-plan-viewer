import { useEffect, useCallback } from "react";
import type { View } from "../types.ts";

interface UseKeyboardOptions {
  // Ids of the rows in the current view, in display order. Rows carry a
  // matching data-row-id attribute so the selection can be scrolled into view.
  itemIds: string[];
  selectedId: string | null;
  overlayOpen: boolean;
  helpOpen: boolean;
  onSelect: (id: string) => void;
  onSwitchView: (view: View) => void;
  onOpenEditor: () => void;
  onToggleHelp: () => void;
  onToggleOverlay: () => void;
  onClearSearch: () => void;
}

function isTextField(el: Element | null): boolean {
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
}

// Elements where Enter has its own meaning (follow a link, press a button)
function isInteractive(el: Element | null): boolean {
  return (
    isTextField(el) ||
    el?.closest("a, button, select, summary, [role=button], [role=tab]") != null
  );
}

// Global shortcuts. Cmd/Ctrl+K lives in SearchInput; the overlay and help
// modal handle their own Escape/F/? keys, so those are skipped while open.
export function useKeyboard({
  itemIds,
  selectedId,
  overlayOpen,
  helpOpen,
  onSelect,
  onSwitchView,
  onOpenEditor,
  onToggleHelp,
  onToggleOverlay,
  onClearSearch,
}: UseKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (helpOpen) return;
      const activeEl = document.activeElement;

      // Arrow navigation, also from the search box but not from other fields
      // (e.g. the project filter dropdown uses arrows for its own options)
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (isTextField(activeEl) && activeEl?.id !== "search") return;
        e.preventDefault();
        const idx = selectedId ? itemIds.indexOf(selectedId) : -1;
        let newIdx = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        if (newIdx < 0) newIdx = 0;
        if (newIdx >= itemIds.length) newIdx = itemIds.length - 1;
        const id = itemIds[newIdx];
        if (id) {
          onSelect(id);
          document
            .querySelector(`tr[data-row-id="${CSS.escape(id)}"]`)
            ?.scrollIntoView({ block: "nearest" });
        }
        return;
      }

      if (overlayOpen) return;
      const plainKey = !e.metaKey && !e.ctrlKey && !e.altKey;

      // Enter: Open in editor
      if (e.key === "Enter" && selectedId) {
        if (!isInteractive(activeEl)) {
          e.preventDefault();
          onOpenEditor();
        }
        return;
      }

      // Escape: Clear search
      if (e.key === "Escape") {
        onClearSearch();
        return;
      }

      if (isTextField(activeEl)) return;

      // 1 / 2: Switch between plans and memory
      if ((e.key === "1" || e.key === "2") && plainKey) {
        e.preventDefault();
        onSwitchView(e.key === "1" ? "plans" : "memory");
        return;
      }

      // ?: Toggle help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onToggleHelp();
        return;
      }

      // F: Open fullscreen overlay
      if (e.key === "f" && selectedId && plainKey) {
        e.preventDefault();
        onToggleOverlay();
      }
    },
    [
      itemIds,
      selectedId,
      overlayOpen,
      helpOpen,
      onSelect,
      onSwitchView,
      onOpenEditor,
      onToggleHelp,
      onToggleOverlay,
      onClearSearch,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
