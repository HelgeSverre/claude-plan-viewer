import { useState, useCallback, useEffect, useMemo } from "react";
import type { MemoryEntry, Plan, PlanMetadata, View } from "./types.ts";
import { usePlans } from "./hooks/usePlans.ts";
import { usePlanContent } from "./hooks/usePlanContent.ts";
import { useMemory } from "./hooks/useMemory.ts";
import { useMemoryContent } from "./hooks/useMemoryContent.ts";
import { useRefresh } from "./hooks/useRefresh.ts";
import { useFilters } from "./hooks/useFilters.ts";
import { useDebounce } from "./hooks/useDebounce.ts";
import { useKeyboard } from "./hooks/useKeyboard.ts";
import { openInEditor } from "./utils/api.ts";
import { formatFullDate, formatSize } from "./utils/formatters.ts";
import { Header } from "./components/Header.tsx";
import { PlansTable } from "./components/PlansTable.tsx";
import { DetailPanel } from "./components/DetailPanel.tsx";
import { DetailOverlay } from "./components/DetailOverlay.tsx";
import { HelpModal } from "./components/HelpModal.tsx";
import { Markdown } from "./components/Markdown.tsx";
import { MemoryTable } from "./components/MemoryTable.tsx";
import { MemoryTypeFilter } from "./components/MemoryTypeFilter.tsx";
import {
  MemoryBody,
  MemoryDetailPanel,
  MemoryMeta,
} from "./components/MemoryDetailPanel.tsx";

function setUrlParam(name: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(name, value);
  else url.searchParams.delete(name);
  window.history.replaceState(null, "", url);
}

export function App() {
  const initialParams = useMemo(
    () => new URLSearchParams(window.location.search),
    [],
  );
  const [view, setView] = useState<View>(
    initialParams.get("view") === "memory" ? "memory" : "plans",
  );
  // Selections are ids; metadata and content are derived from them so they
  // always reflect the latest fetched data
  const [selectedFilename, setSelectedFilename] = useState<string | null>(
    initialParams.get("plan"),
  );
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(
    initialParams.get("memory"),
  );
  const [showOverlay, setShowOverlay] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDir,
    setSort,
    selectedProjects,
    toggleProject,
    setProjects,
    clearProjects,
    selectedTypes,
    toggleType,
    clearTypes,
  } = useFilters();

  // Debounce search to avoid filtering (and hitting the search APIs) on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300);
  // Don't auto-select while the list still reflects the previous query
  const searchPending = searchQuery !== debouncedSearch;

  const projectsArray = useMemo(
    () => Array.from(selectedProjects),
    [selectedProjects],
  );
  const typesArray = useMemo(() => Array.from(selectedTypes), [selectedTypes]);

  const {
    plans,
    allPlans,
    projects: planProjects,
    loading,
    error,
  } = usePlans({
    q: debouncedSearch,
    sort: sortKey,
    dir: sortDir,
    projects: projectsArray,
  });

  const memory = useMemory({
    q: debouncedSearch,
    projects: projectsArray,
    types: typesArray,
  });

  const { refresh, refreshing } = useRefresh();

  // Plans selection
  const selectedMeta = useMemo(
    () => plans.find((p) => p.filename === selectedFilename) ?? null,
    [plans, selectedFilename],
  );
  const planContent = usePlanContent(selectedMeta);
  const selectedPlan = useMemo<Plan | null>(
    () => (selectedMeta ? { ...selectedMeta, content: planContent } : null),
    [selectedMeta, planContent],
  );

  // Memory selection
  const selectedEntry = useMemo(
    () => memory.visibleEntries.find((e) => e.id === selectedMemoryId) ?? null,
    [memory.visibleEntries, selectedMemoryId],
  );
  const selectedSource = useMemo(
    () => memory.sources.find((s) => s.id === selectedEntry?.sourceId) ?? null,
    [memory.sources, selectedEntry],
  );
  const memoryContent = useMemoryContent(selectedEntry);
  const originPlan = useMemo(
    () =>
      selectedEntry?.sessionId
        ? (allPlans.find((p) => p.sessionId === selectedEntry.sessionId) ??
          null)
        : null,
    [allPlans, selectedEntry],
  );

  // Resolve a wikilink name or filename within the selected entry's directory
  const resolveMemoryLink = useCallback(
    (target: string): MemoryEntry | null => {
      if (!selectedEntry) return null;
      const siblings = memory.entries.filter(
        (e) => e.sourceId === selectedEntry.sourceId,
      );
      return (
        siblings.find((e) => e.filename === target) ??
        siblings.find((e) => e.filename === `${target}.md`) ??
        siblings.find((e) => e.name === target) ??
        null
      );
    },
    [memory.entries, selectedEntry],
  );

  // URL state: ?view=memory&plan=…&memory=…
  useEffect(() => {
    setUrlParam("view", view === "memory" ? "memory" : null);
  }, [view]);

  useEffect(() => {
    if (selectedFilename) setUrlParam("plan", selectedFilename);
  }, [selectedFilename]);

  useEffect(() => {
    if (selectedMemoryId) setUrlParam("memory", selectedMemoryId);
  }, [selectedMemoryId]);

  // Select the first row when nothing (or a filtered-out row) is selected
  useEffect(() => {
    const first = plans[0];
    if (view === "plans" && !searchPending && first && !selectedMeta) {
      setSelectedFilename(first.filename);
    }
  }, [view, searchPending, plans, selectedMeta]);

  useEffect(() => {
    const first = memory.visibleEntries[0];
    if (view === "memory" && !searchPending && first && !selectedEntry) {
      setSelectedMemoryId(first.id);
    }
  }, [view, searchPending, memory.visibleEntries, selectedEntry]);

  const switchView = useCallback((next: View) => {
    setShowOverlay(false);
    setView(next);
  }, []);

  // Plan -> its project's memory
  const showProjectMemory = useCallback(
    (project: string) => {
      setSearchQuery("");
      clearTypes();
      setProjects([project]);
      setSelectedMemoryId(null);
      switchView("memory");
    },
    [setSearchQuery, clearTypes, setProjects, switchView],
  );

  // Memory -> the plan written in the same session
  const showPlan = useCallback(
    (plan: PlanMetadata) => {
      setSearchQuery("");
      clearProjects();
      setSelectedFilename(plan.filename);
      switchView("plans");
    },
    [setSearchQuery, clearProjects, switchView],
  );

  const handleSelectPlan = useCallback((plan: PlanMetadata) => {
    setSelectedFilename(plan.filename);
  }, []);

  const handleSelectMemory = useCallback((entry: MemoryEntry) => {
    setSelectedMemoryId(entry.id);
  }, []);

  const handleSelectId = useCallback(
    (id: string) =>
      view === "plans" ? setSelectedFilename(id) : setSelectedMemoryId(id),
    [view],
  );

  const currentFilepath =
    view === "plans" ? selectedMeta?.filepath : selectedEntry?.filepath;
  const currentContent = view === "plans" ? planContent : memoryContent;

  const handleOpenEditor = useCallback(async () => {
    if (currentFilepath) {
      await openInEditor(currentFilepath);
    }
  }, [currentFilepath]);

  const handleCopySession = useCallback((sessionId: string) => {
    navigator.clipboard.writeText(`claude --resume ${sessionId}`);
  }, []);

  const handleCopyFilepath = useCallback((filepath: string) => {
    navigator.clipboard.writeText(filepath);
  }, []);

  const handleCopyContent = useCallback(() => {
    if (currentContent) {
      navigator.clipboard.writeText(currentContent);
      setCopied(true);
    }
  }, [currentContent]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    const searchEl = document.getElementById("search") as HTMLInputElement;
    searchEl?.blur();
  }, [setSearchQuery]);

  const toggleHelp = useCallback(() => setShowHelp((prev) => !prev), []);
  const toggleOverlay = useCallback(() => setShowOverlay((prev) => !prev), []);

  const itemIds = useMemo(
    () =>
      view === "plans"
        ? plans.map((p) => p.filename)
        : memory.visibleEntries.map((e) => e.id),
    [view, plans, memory.visibleEntries],
  );

  useKeyboard({
    itemIds,
    selectedId:
      view === "plans"
        ? (selectedMeta?.filename ?? null)
        : (selectedEntry?.id ?? null),
    overlayOpen: showOverlay,
    helpOpen: showHelp,
    onSelect: handleSelectId,
    onSwitchView: switchView,
    onOpenEditor: handleOpenEditor,
    onToggleHelp: toggleHelp,
    onToggleOverlay: toggleOverlay,
    onClearSearch: handleClearSearch,
  });

  if (loading && allPlans.length === 0) {
    return (
      <div className="container">
        <div className="loading-container">
          <div className="loading">Loading plans...</div>
        </div>
      </div>
    );
  }

  const hasFilters = searchQuery !== "" || selectedProjects.size > 0;

  return (
    <div className="container">
      <div id="list-panel" className="list-panel">
        <Header
          view={view}
          onViewChange={switchView}
          planCount={allPlans.length}
          memoryCount={memory.topicCount}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          projects={view === "plans" ? planProjects : memory.projects}
          selectedProjects={selectedProjects}
          onToggleProject={toggleProject}
          onClearProjects={clearProjects}
          onRefresh={refresh}
          refreshing={refreshing}
        />

        {view === "plans" ? (
          plans.length === 0 ? (
            <div className="empty-state">
              {error
                ? `Failed to load plans: ${error.message}`
                : hasFilters
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
          )
        ) : (
          <>
            <MemoryTypeFilter
              counts={memory.typeCounts}
              selected={selectedTypes}
              onToggle={toggleType}
              onClear={clearTypes}
            />
            {memory.groups.length === 0 ? (
              <div className="empty-state">
                {memory.error
                  ? `Failed to load memory: ${memory.error.message}`
                  : memory.loading
                    ? "Loading memory..."
                    : hasFilters || selectedTypes.size > 0
                      ? "No memories match your filters"
                      : "No auto memory found in ~/.claude/projects"}
              </div>
            ) : (
              <MemoryTable
                groups={memory.groups}
                selectedId={selectedEntry?.id ?? null}
                searchQuery={debouncedSearch}
                onSelect={handleSelectMemory}
              />
            )}
          </>
        )}
      </div>

      {view === "plans" ? (
        <DetailPanel
          plan={selectedPlan}
          memoryCount={
            selectedPlan?.project
              ? (memory.countByProject.get(selectedPlan.project) ?? 0)
              : 0
          }
          onShowMemory={showProjectMemory}
          onOpenEditor={handleOpenEditor}
          onToggleOverlay={() => setShowOverlay(true)}
          onCopySession={handleCopySession}
          onCopyFilepath={handleCopyFilepath}
          onCopyPlan={handleCopyContent}
          copied={copied}
        />
      ) : (
        <MemoryDetailPanel
          entry={selectedEntry}
          source={selectedSource}
          content={memoryContent}
          originPlan={originPlan}
          resolveLink={resolveMemoryLink}
          onNavigate={handleSelectMemory}
          onShowPlan={showPlan}
          onOpenEditor={handleOpenEditor}
          onToggleOverlay={() => setShowOverlay(true)}
          onCopySession={handleCopySession}
          onCopyFilepath={handleCopyFilepath}
          onCopy={handleCopyContent}
          copied={copied}
        />
      )}

      {showOverlay && view === "plans" && selectedPlan && (
        <DetailOverlay
          title={selectedPlan.title}
          meta={
            <>
              {selectedPlan.project && (
                <span className="project-tag">{selectedPlan.project}</span>
              )}
              <span>{selectedPlan.filename}</span>
              <span>{formatFullDate(selectedPlan.modified)}</span>
              <span>{formatSize(selectedPlan.size)}</span>
              <span>{selectedPlan.lineCount} lines</span>
              {selectedPlan.sessionId && (
                <button
                  className="session-tag"
                  onClick={() => handleCopySession(selectedPlan.sessionId!)}
                  title={`Click to copy: claude --resume ${selectedPlan.sessionId}`}
                >
                  {selectedPlan.sessionId.split("-")[0]}
                </button>
              )}
            </>
          }
          onClose={() => setShowOverlay(false)}
          onOpenEditor={handleOpenEditor}
          onCopy={handleCopyContent}
          copied={copied}
        >
          <Markdown content={selectedPlan.content || ""} />
        </DetailOverlay>
      )}

      {showOverlay && view === "memory" && selectedEntry && selectedSource && (
        <DetailOverlay
          title={selectedEntry.name}
          meta={
            <MemoryMeta
              entry={selectedEntry}
              source={selectedSource}
              onCopyFilepath={handleCopyFilepath}
              onCopySession={handleCopySession}
            />
          }
          onClose={() => setShowOverlay(false)}
          onOpenEditor={handleOpenEditor}
          onCopy={handleCopyContent}
          copied={copied}
        >
          <MemoryBody
            content={memoryContent}
            resolveLink={resolveMemoryLink}
            onNavigate={handleSelectMemory}
          />
        </DetailOverlay>
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
