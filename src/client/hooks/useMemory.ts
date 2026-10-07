import { useMemo } from "react";
import useSWR from "swr";
import type { MemoryEntry, MemorySource, MemoryType } from "../types.ts";
import { searchMemoryContent } from "../utils/api.ts";
import { swrOptions } from "./usePlans.ts";

export interface UseMemoryParams {
  q?: string;
  projects?: string[];
  types?: string[];
}

export interface MemoryGroup {
  source: MemorySource;
  entries: MemoryEntry[];
}

interface MemoryData {
  sources: MemorySource[];
  entries: MemoryEntry[];
}

interface UseMemoryReturn {
  sources: MemorySource[];
  entries: MemoryEntry[];
  // Filtered, in display order
  groups: MemoryGroup[];
  visibleEntries: MemoryEntry[];
  projects: string[];
  topicCount: number;
  // Topic files per project, for links from plans
  countByProject: Map<string, number>;
  // Per type, after the project filter
  typeCounts: Record<MemoryType, number>;
  loading: boolean;
  error: Error | undefined;
}

export const MEMORY_SEARCH_KEY = "/api/memory/search";
const EMPTY: MemoryData = { sources: [], entries: [] };

const memoryFetcher = async (url: string): Promise<MemoryData> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch memory: ${res.statusText}`);
  }
  return res.json();
};

// Index first, then most recently modified
function compareEntries(a: MemoryEntry, b: MemoryEntry): number {
  if (a.isIndex !== b.isIndex) return a.isIndex ? -1 : 1;
  return b.modified.localeCompare(a.modified);
}

export function useMemory(params: UseMemoryParams = {}): UseMemoryReturn {
  const {
    data = EMPTY,
    error,
    isLoading: loading,
  } = useSWR<MemoryData>("/api/memory", memoryFetcher, swrOptions);
  const { sources, entries } = data;

  const q = params.q?.trim() ?? "";
  const { data: contentMatches } = useSWR(
    q ? [MEMORY_SEARCH_KEY, q] : null,
    ([, query]: [string, string]) => searchMemoryContent(query),
    { ...swrOptions, keepPreviousData: true },
  );

  const sourceById = useMemo(
    () => new Map(sources.map((s) => [s.id, s])),
    [sources],
  );

  const projects = useMemo(
    () =>
      [...new Set(sources.map((s) => s.project))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [sources],
  );

  const countByProject = useMemo(() => {
    const counts = new Map<string, number>();
    for (const source of sources) {
      counts.set(
        source.project,
        (counts.get(source.project) ?? 0) + source.entryCount,
      );
    }
    return counts;
  }, [sources]);

  const projectFiltered = useMemo(() => {
    if (!params.projects?.length) return entries;
    const selected = new Set(params.projects);
    return entries.filter((e) => {
      const project = sourceById.get(e.sourceId)?.project;
      return project !== undefined && selected.has(project);
    });
  }, [entries, sourceById, params.projects]);

  const typeCounts = useMemo(() => {
    const counts: Record<MemoryType, number> = {
      feedback: 0,
      project: 0,
      reference: 0,
      user: 0,
    };
    for (const entry of projectFiltered) {
      if (entry.type) counts[entry.type]++;
    }
    return counts;
  }, [projectFiltered]);

  const groups = useMemo(() => {
    let filtered = projectFiltered;

    if (params.types?.length) {
      const types = new Set(params.types);
      filtered = filtered.filter((e) => e.type !== null && types.has(e.type));
    }

    if (q) {
      const lowerQ = q.toLowerCase();
      const contentMatchSet = new Set(contentMatches);
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(lowerQ) ||
          e.filename.toLowerCase().includes(lowerQ) ||
          (e.description?.toLowerCase().includes(lowerQ) ?? false) ||
          (sourceById.get(e.sourceId)?.project.toLowerCase().includes(lowerQ) ??
            false) ||
          contentMatchSet.has(e.id),
      );
    }

    const bySource = new Map<string, MemoryEntry[]>();
    for (const entry of filtered) {
      bySource.set(entry.sourceId, [
        ...(bySource.get(entry.sourceId) ?? []),
        entry,
      ]);
    }

    // Sources arrive in display order from the server
    return sources
      .filter((s) => bySource.has(s.id))
      .map((source) => ({
        source,
        entries: (bySource.get(source.id) ?? []).sort(compareEntries),
      }));
  }, [projectFiltered, params.types, q, contentMatches, sources, sourceById]);

  const visibleEntries = useMemo(
    () => groups.flatMap((g) => g.entries),
    [groups],
  );

  const topicCount = useMemo(
    () => sources.reduce((sum, s) => sum + s.entryCount, 0),
    [sources],
  );

  return {
    sources,
    entries,
    groups,
    visibleEntries,
    projects,
    topicCount,
    countByProject,
    typeCounts,
    loading,
    error,
  };
}
