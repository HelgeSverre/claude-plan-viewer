import type { View } from "../types.ts";
import { SearchInput } from "./SearchInput.tsx";
import { ProjectFilter } from "./ProjectFilter.tsx";

interface HeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  planCount: number;
  memoryCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  projects: string[];
  selectedProjects: Set<string>;
  onToggleProject: (project: string) => void;
  onClearProjects: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function Header({
  view,
  onViewChange,
  planCount,
  memoryCount,
  searchQuery,
  onSearchChange,
  projects,
  selectedProjects,
  onToggleProject,
  onClearProjects,
  onRefresh,
  refreshing,
}: HeaderProps) {
  return (
    <div className="header">
      <div className="header-row">
        <h1>
          <svg
            className="icon"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          Claude Plan Viewer
        </h1>
        <div className="view-switch" role="tablist" aria-label="View">
          <button
            role="tab"
            aria-selected={view === "plans"}
            className={view === "plans" ? "active" : ""}
            onClick={() => onViewChange("plans")}
            title="Plans (1)"
          >
            Plans <span className="view-count">{planCount}</span>
          </button>
          <button
            role="tab"
            aria-selected={view === "memory"}
            className={view === "memory" ? "active" : ""}
            onClick={() => onViewChange("memory")}
            title="Memory (2)"
          >
            Memory <span className="view-count">{memoryCount}</span>
          </button>
        </div>
        <div className="header-spacer" />
        <SearchInput
          value={searchQuery}
          placeholder={
            view === "plans" ? "Search plans..." : "Search memory..."
          }
          onChange={onSearchChange}
        />
        {projects.length > 0 && (
          <ProjectFilter
            projects={projects}
            selectedProjects={selectedProjects}
            onToggle={onToggleProject}
            onClear={onClearProjects}
          />
        )}
        <button
          className={refreshing ? "action-btn loading" : "action-btn"}
          id="refresh-btn"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh"
        >
          <svg
            className="icon"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
