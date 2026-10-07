import { useMemo } from "react";
import useSWR, { type SWRConfiguration } from "swr";
import type { SortKey, SortDir, PlanMetadata } from "../types.ts";
import { searchPlanContent } from "../utils/api.ts";

export interface UsePlansParams {
  q?: string;
  sort?: SortKey;
  dir?: SortDir;
  projects?: string[];
}

interface UsePlansReturn {
  // Filtered and sorted
  plans: PlanMetadata[];
  allPlans: PlanMetadata[];
  projects: string[];
  loading: boolean;
  error: Error | undefined;
}

const EMPTY: PlanMetadata[] = [];

export const swrOptions: SWRConfiguration = {
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    // Don't retry on 4xx errors
    if (error.status >= 400 && error.status < 500) return;
    // Retry up to 5 times on network errors with exponential backoff
    if (retryCount >= 5) return;
    setTimeout(() => revalidate({ retryCount }), 500 * (retryCount + 1));
  },
  revalidateOnFocus: false,
};

const plansFetcher = async (url: string): Promise<PlanMetadata[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch plans: ${res.statusText}`);
  }
  const data = await res.json();
  return data.plans;
};

export function usePlans(params: UsePlansParams = {}): UsePlansReturn {
  const {
    data: allPlans = EMPTY,
    error,
    isLoading: loading,
  } = useSWR<PlanMetadata[]>("/api/plans", plansFetcher, swrOptions);

  const q = params.q?.trim() ?? "";

  // Content lives on the server; it returns which plans' content matches.
  // Previous matches are kept while the next query loads to avoid flicker.
  const { data: contentMatches } = useSWR(
    q ? ["/api/search", q] : null,
    ([, query]: [string, string]) => searchPlanContent(query),
    { ...swrOptions, keepPreviousData: true },
  );

  const projects = useMemo(() => {
    const names = new Set<string>();
    for (const plan of allPlans) {
      if (plan.project) names.add(plan.project);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [allPlans]);

  // Client-side filtering
  const filteredPlans = useMemo(() => {
    let filtered = allPlans;

    if (q) {
      const lowerQ = q.toLowerCase();
      const contentMatchSet = new Set(contentMatches);
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(lowerQ) ||
          p.filename.toLowerCase().includes(lowerQ) ||
          (p.project?.toLowerCase().includes(lowerQ) ?? false) ||
          contentMatchSet.has(p.filename),
      );
    }

    if (params.projects && params.projects.length > 0) {
      const projectFilterSet = new Set(params.projects);
      filtered = filtered.filter(
        (p) => p.project && projectFilterSet.has(p.project),
      );
    }

    return filtered;
  }, [allPlans, q, contentMatches, params.projects]);

  // Client-side sorting
  const sortedPlans = useMemo(() => {
    const { sort, dir } = params;
    if (!sort) return filteredPlans;

    const sorted = [...filteredPlans].sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "project":
          if (!a.project && !b.project) cmp = 0;
          else if (!a.project) return 1;
          else if (!b.project) return -1;
          else cmp = a.project.localeCompare(b.project);
          break;
        case "size":
          cmp = a.size - b.size;
          break;
        case "lines":
          cmp = a.lineCount - b.lineCount;
          break;
        case "created":
          cmp = new Date(a.created).getTime() - new Date(b.created).getTime();
          break;
        case "modified":
        default:
          cmp = new Date(a.modified).getTime() - new Date(b.modified).getTime();
          break;
      }
      return dir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [filteredPlans, params.sort, params.dir]);

  return {
    plans: sortedPlans,
    allPlans,
    projects,
    loading,
    error,
  };
}
