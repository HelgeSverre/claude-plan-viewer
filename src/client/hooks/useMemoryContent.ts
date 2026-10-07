import useSWR from "swr";
import type { MemoryEntry } from "../types.ts";
import { fetchMemoryContent } from "../utils/api.ts";
import { swrOptions } from "./usePlans.ts";

// Content of the given memory entry, refetched when it changes on disk
export function useMemoryContent(
  entry: MemoryEntry | null,
): string | undefined {
  const { data } = useSWR(
    entry
      ? ["/api/memory/content", entry.id, entry.modified, entry.size]
      : null,
    ([, id]: [string, string, string, number]) => fetchMemoryContent(id),
    swrOptions,
  );
  return data;
}
