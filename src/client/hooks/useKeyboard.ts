import { useEffect, useCallback } from "react";
import type { PlanMetadata } from "../types.ts";

interface UseKeyboardOptions {
  plans: PlanMetadata[];
  selectedFilename: string | null;
  overlayOpen: boolean;
  helpOpen: boolean;
  onSelectPlan: (plan: PlanMetadata) => void;
  onOpenEditor: () => void;
  onToggleHelp: () => void;
  onToggleOverlay: () => void;
  onClearSearch: () => void;
}

function isTextField(el: Element | null): boolean {
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
}

// Global shortcuts. Cmd/Ctrl+K lives in SearchInput; the overlay and help
// modal handle their own Escape/F/? keys, so those are skipped while open.
export function useKeyboard({
  plans,
  selectedFilename,
  overlayOpen,
  helpOpen,
  onSelectPlan,
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
        const idx = plans.findIndex((p) => p.filename === selectedFilename);
        let newIdx = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        if (newIdx < 0) newIdx = 0;
        if (newIdx >= plans.length) newIdx = plans.length - 1;
        const plan = plans[newIdx];
        if (plan) {
          onSelectPlan(plan);
          document
            .querySelector(`tr[data-filename="${CSS.escape(plan.filename)}"]`)
            ?.scrollIntoView({ block: "nearest" });
        }
        return;
      }

      if (overlayOpen) return;

      // Enter: Open in editor
      if (e.key === "Enter" && selectedFilename) {
        if (!isTextField(activeEl) && activeEl?.tagName !== "BUTTON") {
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

      // ?: Toggle help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        if (!isTextField(activeEl)) {
          e.preventDefault();
          onToggleHelp();
        }
        return;
      }

      // F: Open fullscreen overlay
      if (
        e.key === "f" &&
        selectedFilename &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        if (!isTextField(activeEl)) {
          e.preventDefault();
          onToggleOverlay();
        }
        return;
      }
    },
    [
      plans,
      selectedFilename,
      overlayOpen,
      helpOpen,
      onSelectPlan,
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
