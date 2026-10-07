export interface PlanMetadata {
  filename: string;
  filepath: string;
  title: string;
  size: number;
  modified: string;
  created: string;
  lineCount: number;
  wordCount: number;
  project: string | null;
  sessionId: string | null;
}

export interface Plan extends PlanMetadata {
  content?: string; // Lazy-loaded on demand
}

export type SortKey =
  "title" | "project" | "modified" | "size" | "lines" | "created";
export type SortDir = "asc" | "desc";

export type {
  MemoryEntry,
  MemoryIndexStats,
  MemorySource,
  MemoryType,
} from "../server/memory.ts";

export type View = "plans" | "memory";
