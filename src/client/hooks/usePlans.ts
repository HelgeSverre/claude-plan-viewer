import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Plan, SortKey, SortDir } from "../types.ts";
import { fetchPlans, fetchPlanContent, refreshCache } from "../utils/api.ts";

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
  refresh: () => Promise<void>;
  ensureContent: (plan: Plan) => Promise<Plan>;
}

export function usePlans(
  params: UsePlansParams = {},
): UsePlansReturn {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cache content by filename to persist across filter changes
  const contentCache = useRef<Map<string, string>>(new Map());

  const loadAllPlans = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const fetchedPlans = await fetchPlans(abortControllerRef.current.signal);

      // Restore cached content
      const plansWithContent = fetchedPlans.map((p) => ({
        ...p,
        content: contentCache.current.get(p.filename),
      }));

      setAllPlans(plansWithContent);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Failed to load plans:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all plans on mount and when parameters change
  useEffect(() => {
    loadAllPlans();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [loadAllPlans]);

  const refresh = useCallback(async () => {
    contentCache.current.clear();
    await refreshCache(); // Invalidate backend cache too
    await loadAllPlans();
  }, [loadAllPlans]);

  const ensureContent = useCallback(
    async (plan: Plan): Promise<Plan> => {
      if (plan.content) return plan;

      // Check cache
      const cached = contentCache.current.get(plan.filename);
      if (cached) {
        const updatedPlan = { ...plan, content: cached };
        setAllPlans((prev) =>
          prev.map((p) => (p.filename === plan.filename ? updatedPlan : p))
        );
        return updatedPlan;
      }

      const content = await fetchPlanContent(plan.filename);
      contentCache.current.set(plan.filename, content);
      const updatedPlan = { ...plan, content };

      // Update in state
      setAllPlans((prev) =>
        prev.map((p) => (p.filename === plan.filename ? updatedPlan : p))
      );

      return updatedPlan;
    },
    []
  );

  // Client-side filtering
  const filteredPlans = useMemo(() => {
    let filtered = allPlans;

    if (params.q) {
      const lowerQ = params.q.toLowerCase();
      filtered = filtered.filter(p => {
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
      filtered = filtered.filter(p => p.project && projectFilterSet.has(p.project));
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
    refresh,
    ensureContent,
  };
}
