import useSWR from "swr";
import type { PlanMetadata } from "../types.ts";
import { fetchPlanContent } from "../utils/api.ts";
import { swrOptions } from "./usePlans.ts";

// Content of the given plan. Keyed on `modified` so an edited plan refetches,
// and SWR only ever returns data for the current key, so fast selection
// changes can't show a previous plan's content.
export function usePlanContent(plan: PlanMetadata | null): string | undefined {
  const { data } = useSWR(
    plan ? ["/api/plans/content", plan.filename, plan.modified] : null,
    ([, filename]: [string, string, string]) => fetchPlanContent(filename),
    swrOptions,
  );
  return data;
}
