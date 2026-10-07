import { useState, useCallback, useEffect } from "react";
import type { SortKey, SortDir } from "../types.ts";

// Natural default sort direction per column type
const SORT_DEFAULTS: Record<SortKey, SortDir> = {
  title: "asc", // A → Z
  project: "asc", // A → Z
  size: "desc", // Biggest first
  lines: "desc", // Biggest first
  modified: "desc", // Newest first
  created: "desc", // Newest first
};

const DEFAULT_SORT_KEY: SortKey = "modified";

interface SortState {
  key: SortKey;
  dir: SortDir;
}

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

function isSortKey(value: string | null): value is SortKey {
  return value !== null && value in SORT_DEFAULTS;
}

// Filters persist in the URL (?q=…&sort=…&dir=…&project=…) so views can be
// bookmarked and survive reloads.
function readFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const sortParam = params.get("sort");
  const key = isSortKey(sortParam) ? sortParam : DEFAULT_SORT_KEY;
  const dirParam = params.get("dir");
  const dir =
    dirParam === "asc" || dirParam === "desc" ? dirParam : SORT_DEFAULTS[key];

  return {
    searchQuery: params.get("q") ?? "",
    sort: { key, dir } as SortState,
    projects: new Set(params.getAll("project")),
  };
}

export function useFilters(): UseFiltersReturn {
  const [initial] = useState(readFiltersFromUrl);
  const [searchQuery, setSearchQuery] = useState(initial.searchQuery);
  const [sort, setSortState] = useState<SortState>(initial.sort);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    initial.projects,
  );

  // Debounced: Safari throttles history.replaceState calls
  useEffect(() => {
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      const params = url.searchParams;

      if (searchQuery) params.set("q", searchQuery);
      else params.delete("q");

      const isDefaultSort =
        sort.key === DEFAULT_SORT_KEY && sort.dir === SORT_DEFAULTS[sort.key];
      if (isDefaultSort) {
        params.delete("sort");
        params.delete("dir");
      } else {
        params.set("sort", sort.key);
        params.set("dir", sort.dir);
      }

      params.delete("project");
      for (const project of selectedProjects) {
        params.append("project", project);
      }

      window.history.replaceState(null, "", url);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, sort, selectedProjects]);

  const setSort = useCallback((key: SortKey, dir?: SortDir) => {
    setSortState((prev) => {
      if (dir) return { key, dir };
      // Same column toggles direction; a new column starts at its natural default
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: SORT_DEFAULTS[key] };
    });
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
    sortKey: sort.key,
    sortDir: sort.dir,
    setSort,
    selectedProjects,
    toggleProject,
    clearProjects,
  };
}
