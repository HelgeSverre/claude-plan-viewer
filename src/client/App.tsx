import { useState, useCallback, useEffect, useMemo } from "react";
import type { Plan } from "./types.ts";
import { usePlans } from "./hooks/usePlans.ts";
import { useProjects } from "./hooks/useProjects.ts";
import { useFilters } from "./hooks/useFilters.ts";
import { useDebounce } from "./hooks/useDebounce.ts";
import { useKeyboard } from "./hooks/useKeyboard.ts";
import { openInEditor } from "./utils/api.ts";
import { Header } from "./components/Header.tsx";
import { PlansTable } from "./components/PlansTable.tsx";
import { DetailPanel } from "./components/DetailPanel.tsx";
import { DetailOverlay } from "./components/DetailOverlay.tsx";
import { HelpModal } from "./components/HelpModal.tsx";

export function App() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter state
  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDir,
    setSort,
    selectedProjects,
    toggleProject,
    clearProjects,
  } = useFilters();

  // Debounce search to avoid hitting API on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Convert Set to array for API
  const projectsArray = useMemo(
    () => Array.from(selectedProjects),
    [selectedProjects],
  );

  // Fetch plans with server-side filtering
  const { plans, loading, refreshing, refresh, ensureContent } = usePlans({
    q: debouncedSearch,
    sort: sortKey,
    dir: sortDir,
    projects: projectsArray,
  });

  // Fetch projects list
  const { projects: allProjects } = useProjects();

  // Load content when plan is selected
  const handleSelectPlan = useCallback(
    async (plan: Plan | null) => {
      // Update URL query parameter
      const url = new URL(window.location.href);
      if (plan) {
        url.searchParams.set("plan", plan.filename);
      } else {
        url.searchParams.delete("plan");
      }
      window.history.replaceState({}, "", url.toString());

      if (plan) {
        const withContent = await ensureContent(plan);
        setSelectedPlan(withContent);
      } else {
        setSelectedPlan(null);
      }
    },
    [ensureContent],
  );

  // Open in editor
  const handleOpenEditor = useCallback(async () => {
    if (selectedPlan) {
      await openInEditor(selectedPlan.filepath);
    }
  }, [selectedPlan]);

  // Copy session ID
  const handleCopySession = useCallback((sessionId: string) => {
    navigator.clipboard.writeText(`claude --resume ${sessionId}`);
  }, []);

  // Copy plan content
  const handleCopyPlan = useCallback(() => {
    if (selectedPlan?.content) {
      navigator.clipboard.writeText(selectedPlan.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [selectedPlan]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    const searchEl = document.getElementById("search") as HTMLInputElement;
    searchEl?.blur();
  }, [setSearchQuery]);

  // Keyboard shortcuts
  useKeyboard({
    plans,
    selectedPlan,
    onSelectPlan: handleSelectPlan,
    onOpenEditor: handleOpenEditor,
    onToggleHelp: () => setShowHelp((prev) => !prev),
    onToggleOverlay: () => setShowOverlay((prev) => !prev),
    onClearSearch: handleClearSearch,
  });

  // Select plan from URL or auto-select first plan
  useEffect(() => {
    if (plans.length === 0) return;

    // Check URL for plan parameter
    const url = new URL(window.location.href);
    const planFromUrl = url.searchParams.get("plan");

    if (planFromUrl) {
      const matchingPlan = plans.find((p) => p.filename === planFromUrl);
      if (matchingPlan && selectedPlan?.filename !== planFromUrl) {
        handleSelectPlan(matchingPlan);
        return;
      }
    }

    // Fall back to selecting first plan if nothing selected
    if (!selectedPlan) {
      handleSelectPlan(plans[0]);
    }
  }, [plans, selectedPlan, handleSelectPlan]);

  // Clear selection if selected plan is no longer in results
  useEffect(() => {
    if (
      selectedPlan &&
      !plans.find((p) => p.filename === selectedPlan.filename)
    ) {
      setSelectedPlan(null);
    }
  }, [plans, selectedPlan]);

  if (loading && plans.length === 0) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="loading">Loading plans...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div id="list-panel" className="list-panel">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          projects={allProjects}
          selectedProjects={selectedProjects}
          onToggleProject={toggleProject}
          onClearProjects={clearProjects}
          onRefresh={refresh}
          refreshing={refreshing}
        />

        {plans.length === 0 ? (
          <div className="empty-state">
            {searchQuery || selectedProjects.size > 0
              ? "No plans match your filters"
              : "No plans found"}
          </div>
        ) : (
          <PlansTable
            plans={plans}
            selectedPlan={selectedPlan}
            searchQuery={searchQuery}
            sortKey={sortKey}
            sortDir={sortDir}
            onSelectPlan={handleSelectPlan}
            onSort={setSort}
          />
        )}
      </div>

      <DetailPanel
        plan={selectedPlan}
        onOpenEditor={handleOpenEditor}
        onToggleOverlay={() => setShowOverlay(true)}
        onCopySession={handleCopySession}
        onCopyPlan={handleCopyPlan}
        copied={copied}
      />

      {showOverlay && selectedPlan && (
        <DetailOverlay
          plan={selectedPlan}
          onClose={() => setShowOverlay(false)}
          onOpenEditor={handleOpenEditor}
          onCopySession={handleCopySession}
          onCopyPlan={handleCopyPlan}
          copied={copied}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
