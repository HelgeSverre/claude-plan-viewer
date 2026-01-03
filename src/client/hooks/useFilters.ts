import { useState, useCallback } from "react";
import type { SortKey, SortDir } from "../types.ts";

// Natural default sort direction per column type
const SORT_DEFAULTS: Record<SortKey, SortDir> = {
  title: "asc",      // A → Z
  project: "asc",    // A → Z
  size: "desc",      // Biggest first
  lines: "desc",     // Biggest first
  modified: "desc",  // Newest first
  created: "desc",   // Newest first
};

interface UseFiltersReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortKey: SortKey;
  sortDir: SortDir;
  setSort: (key: SortKey, dir?: SortDir) => void;
  selectedProjects: Set<string>;
  toggleProject: (project: string) => void;
  clearProjects: () => void;
}

export function useFilters(): UseFiltersReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("modified");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set()
  );

  const setSort = useCallback((key: SortKey, dir?: SortDir) => {
    if (dir) {
      // Explicit direction provided
      setSortKey(key);
      setSortDir(dir);
    } else {
      setSortKey((prevKey) => {
        if (prevKey === key) {
          // Same column: toggle direction
          setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
          // New column: use its natural default
          setSortDir(SORT_DEFAULTS[key]);
        }
        return key;
      });
    }
  }, []);

  const toggleProject = useCallback((project: string) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(project)) {
        next.delete(project);
      } else {
        next.add(project);
      }
      return next;
    });
  }, []);

  const clearProjects = useCallback(() => {
    setSelectedProjects(new Set());
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    sortKey,
    sortDir,
    setSort,
    selectedProjects,
    toggleProject,
    clearProjects,
  };
}
