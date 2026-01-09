import { useEffect, useCallback } from "react";
import type { Plan } from "../types.ts";

interface UseKeyboardOptions {
  plans: Plan[];
  selectedPlan: Plan | null;
  onSelectPlan: (plan: Plan | null) => void;
  onOpenEditor: () => void;
  onToggleHelp: () => void;
  onToggleOverlay: () => void;
  onClearSearch: () => void;
}

export function useKeyboard({
  plans,
  selectedPlan,
  onSelectPlan,
  onOpenEditor,
  onToggleHelp,
  onToggleOverlay,
  onClearSearch,
}: UseKeyboardOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const search = document.getElementById("search") as HTMLInputElement;
        search?.focus();
        search?.select();
        return;
      }

      // Arrow navigation
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = plans.findIndex(
          (p) => p.filename === selectedPlan?.filename,
        );
        let newIdx = e.key === "ArrowDown" ? idx + 1 : idx - 1;
        if (newIdx < 0) newIdx = 0;
        if (newIdx >= plans.length) newIdx = plans.length - 1;
        const plan = plans[newIdx];
        if (plan) {
          onSelectPlan(plan);
          document
            .querySelector(`tr[data-filename="${plan.filename}"]`)
            ?.scrollIntoView({ block: "nearest" });
        }
        return;
      }

      // Enter: Open in editor
      if (e.key === "Enter" && selectedPlan) {
        const activeEl = document.activeElement;
        if (
          activeEl?.tagName !== "INPUT" &&
          activeEl?.tagName !== "TEXTAREA" &&
          activeEl?.tagName !== "BUTTON"
        ) {
          e.preventDefault();
          onOpenEditor();
        }
        return;
      }

      // Escape: Clear search or close modal
      if (e.key === "Escape") {
        onClearSearch();
        return;
      }

      // ?: Toggle help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const activeEl = document.activeElement;
        if (activeEl?.tagName !== "INPUT" && activeEl?.tagName !== "TEXTAREA") {
          e.preventDefault();
          onToggleHelp();
        }
        return;
      }

      // F: Toggle fullscreen overlay
      if (
        e.key === "f" &&
        selectedPlan &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        const activeEl = document.activeElement;
        if (activeEl?.tagName !== "INPUT" && activeEl?.tagName !== "TEXTAREA") {
          e.preventDefault();
          onToggleOverlay();
        }
        return;
      }
    },
    [
      plans,
      selectedPlan,
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
