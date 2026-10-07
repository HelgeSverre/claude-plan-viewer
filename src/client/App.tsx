import { useState, useCallback, useEffect, useMemo } from "react";
import type { Plan, PlanMetadata } from "./types.ts";
import { usePlans } from "./hooks/usePlans.ts";
import { usePlanContent } from "./hooks/usePlanContent.ts";
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
  // Selection is a filename; metadata and content are derived from it so they
  // always reflect the latest fetched data
  const [selectedFilename, setSelectedFilename] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("plan"),
  );
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

  // Debounce search to avoid filtering (and hitting /api/search) on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300);

  const projectsArray = useMemo(
    () => Array.from(selectedProjects),
    [selectedProjects],
  );

  const { plans, projects, loading, error, refreshing, refresh } = usePlans({
    q: debouncedSearch,
    sort: sortKey,
    dir: sortDir,
    projects: projectsArray,
  });

  const selectedMeta = useMemo(
    () => plans.find((p) => p.filename === selectedFilename) ?? null,
    [plans, selectedFilename],
  );
  const content = usePlanContent(selectedMeta);
  const selectedPlan = useMemo<Plan | null>(
    () => (selectedMeta ? { ...selectedMeta, content } : null),
    [selectedMeta, content],
  );

  const handleSelectPlan = useCallback((plan: PlanMetadata) => {
    setSelectedFilename(plan.filename);
  }, []);

  // Keep ?plan= in sync with the selection
  useEffect(() => {
    if (!selectedFilename) return;
    const url = new URL(window.location.href);
    url.searchParams.set("plan", selectedFilename);
    window.history.replaceState(null, "", url);
  }, [selectedFilename]);

  // Select the first plan when nothing (or a filtered-out plan) is selected
  useEffect(() => {
    const first = plans[0];
    if (first && !selectedMeta) {
      setSelectedFilename(first.filename);
    }
  }, [plans, selectedMeta]);

  // Open in editor
  const handleOpenEditor = useCallback(async () => {
    if (selectedMeta) {
      await openInEditor(selectedMeta.filepath);
    }
  }, [selectedMeta]);

  // Copy session ID
  const handleCopySession = useCallback((sessionId: string) => {
    navigator.clipboard.writeText(`claude --resume ${sessionId}`);
  }, []);

  // Copy filepath
  const handleCopyFilepath = useCallback((filepath: string) => {
    navigator.clipboard.writeText(filepath);
  }, []);

  // Copy plan content
  const handleCopyPlan = useCallback(() => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
    }
  }, [content]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    const searchEl = document.getElementById("search") as HTMLInputElement;
    searchEl?.blur();
  }, [setSearchQuery]);

  const toggleHelp = useCallback(() => setShowHelp((prev) => !prev), []);
  const toggleOverlay = useCallback(() => setShowOverlay((prev) => !prev), []);

  // Keyboard shortcuts
  useKeyboard({
    plans,
    selectedFilename: selectedMeta?.filename ?? null,
    overlayOpen: showOverlay,
    helpOpen: showHelp,
    onSelectPlan: handleSelectPlan,
    onOpenEditor: handleOpenEditor,
    onToggleHelp: toggleHelp,
    onToggleOverlay: toggleOverlay,
    onClearSearch: handleClearSearch,
  });

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
          projects={projects}
          selectedProjects={selectedProjects}
          onToggleProject={toggleProject}
          onClearProjects={clearProjects}
          onRefresh={refresh}
          refreshing={refreshing}
        />

        {plans.length === 0 ? (
          <div className="empty-state">
            {error
              ? `Failed to load plans: ${error.message}`
              : searchQuery || selectedProjects.size > 0
                ? "No plans match your filters"
                : "No plans found"}
          </div>
        ) : (
          <PlansTable
            plans={plans}
            selectedFilename={selectedMeta?.filename ?? null}
            searchQuery={debouncedSearch}
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
        onCopyFilepath={handleCopyFilepath}
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
