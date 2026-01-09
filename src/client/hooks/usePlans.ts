import { useCallback, useRef, useMemo, useState } from "react";
import useSWR from "swr";
import type { Plan, SortKey, SortDir, PlanMetadata } from "../types.ts";
import { fetchPlanContent, refreshCache } from "../utils/api.ts";

export interface UsePlansParams {
  q?: string;
  sort?: SortKey;
  dir?: SortDir;
  projects?: string[];
}

interface UsePlansReturn {
  plans: Plan[];
  total: number;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  ensureContent: (plan: Plan) => Promise<Plan>;
}

const plansFetcher = async (url: string): Promise<PlanMetadata[]> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch plans: ${res.statusText}`);
  }
  const data = await res.json();
  return data.plans;
};

export function usePlans(params: UsePlansParams = {}): UsePlansReturn {
  // Cache content by filename to persist across filter changes
  const contentCache = useRef<Map<string, string>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: fetchedPlans,
    isLoading: loading,
    mutate,
  } = useSWR<PlanMetadata[]>("/api/plans", plansFetcher, {
    onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) return;
      // Retry up to 5 times on network errors with exponential backoff
      if (retryCount >= 5) return;
      setTimeout(() => revalidate({ retryCount }), 500 * (retryCount + 1));
    },
    revalidateOnFocus: false,
  });

  // Merge fetched plans with cached content
  const allPlans = useMemo(() => {
    if (!fetchedPlans) return [];
    return fetchedPlans.map((p) => ({
      ...p,
      content: contentCache.current.get(p.filename),
    }));
  }, [fetchedPlans]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      contentCache.current.clear();
      const { before, after } = await refreshCache();
      // Only reload if count changed
      if (before !== after) {
        await mutate();
      }
    } finally {
      setRefreshing(false);
    }
  }, [mutate]);

  const ensureContent = useCallback(async (plan: Plan): Promise<Plan> => {
    if (plan.content) return plan;

    // Check cache
    const cached = contentCache.current.get(plan.filename);
    if (cached) {
      return { ...plan, content: cached };
    }

    const content = await fetchPlanContent(plan.filename);
    contentCache.current.set(plan.filename, content);
    return { ...plan, content };
  }, []);

  // Client-side filtering
  const filteredPlans = useMemo(() => {
    let filtered = allPlans;

    if (params.q) {
      const lowerQ = params.q.toLowerCase();
      filtered = filtered.filter((p) => {
        const content = contentCache.current.get(p.filename) || "";
        return (
          p.title.toLowerCase().includes(lowerQ) ||
          content.toLowerCase().includes(lowerQ) ||
          p.filename.toLowerCase().includes(lowerQ) ||
          (p.project?.toLowerCase().includes(lowerQ) ?? false)
        );
      });
    }

    if (params.projects && params.projects.length > 0) {
      const projectFilterSet = new Set(params.projects);
      filtered = filtered.filter(
        (p) => p.project && projectFilterSet.has(p.project),
      );
    }

    return filtered;
  }, [allPlans, params.q, params.projects]);

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
    total: sortedPlans.length,
    loading,
    refreshing,
    refresh,
    ensureContent,
  };
}
