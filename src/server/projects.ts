// Helpers for reading Claude Code session logs (~/.claude/projects/<dir>/*.jsonl),
// which map plan slugs to sessions and record each project's working directory.
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

// Last path segment, for / and \ separators
// e.g. "/Users/helge/code/plans-viewer" -> "plans-viewer"
// e.g. "C:\Users\name\code\my-app" -> "my-app"
export function extractProjectName(cwd: string): string {
  if (!cwd) return "";
  const normalized = cwd.replace(/\\/g, "/");
  const trimmed = normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
  const lastSlash = trimmed.lastIndexOf("/");
  return lastSlash === -1 ? trimmed : trimmed.slice(lastSlash + 1);
}

// Log lines can be huge (tool output), so fields are matched with regexes
// instead of parsing each line as JSON
const CWD_PATTERN = /"cwd":"((?:[^"\\]|\\.)*)"/;
const SLUG_PATTERN = /"slug":"([\w-]+)"/;
const SESSION_PATTERN = /"sessionId":"([^"]+)"/;

// First "cwd" in a chunk of log text, with JSON escapes decoded
export function matchCwd(text: string): string | null {
  const raw = text.match(CWD_PATTERN)?.[1];
  if (!raw) return null;
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw;
  }
}

// Plan slug and session of a log line; null unless the line has both
export function matchSlugSession(
  line: string,
): { slug: string; sessionId: string } | null {
  const slug = line.match(SLUG_PATTERN)?.[1];
  if (!slug) return null;
  // Only look for the session on the (fewer) lines that carry a slug
  const sessionId = line.match(SESSION_PATTERN)?.[1];
  return sessionId ? { slug, sessionId } : null;
}

// Stream a JSONL file line by line without loading it into memory; logs can
// be hundreds of MB. Empty lines are skipped.
export async function processJsonlLineByLine(
  path: string,
  onLine: (line: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(path, {
      encoding: "utf-8",
      highWaterMark: 64 * 1024,
    });
    const rl = createInterface({ input: stream, crlfDelay: Infinity });

    rl.on("line", (line) => {
      if (line.length > 0) onLine(line);
    });
    rl.on("close", resolve);
    // Reject before closing: close() emits "close", which would resolve first
    rl.on("error", (err) => {
      reject(err);
      rl.close();
    });
  });
}
