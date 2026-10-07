// Claude Code auto memory: ~/.claude/projects/<project>/memory/ holds a
// MEMORY.md index plus one topic file per memory, or a directory configured
// with the autoMemoryDirectory setting.
// See https://code.claude.com/docs/en/memory#auto-memory
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, isAbsolute, join } from "node:path";
import { homedir } from "node:os";

export const MEMORY_INDEX = "MEMORY.md";
// Claude Code loads the first 200 lines or 25KB of MEMORY.md at session
// start, whichever comes first; the rest is dropped.
export const INDEX_LINE_LIMIT = 200;
export const INDEX_BYTE_LIMIT = 25_000;

export type MemoryType = "user" | "feedback" | "project" | "reference";
const MEMORY_TYPES: ReadonlySet<string> = new Set([
  "user",
  "feedback",
  "project",
  "reference",
]);

export interface MemoryIndexStats {
  lines: number;
  bytes: number;
  lineLimit: number;
  byteLimit: number;
  // Index links to files that don't exist in the directory
  danglingLinks: string[];
}

export interface MemorySource {
  id: string;
  // "project": ~/.claude/projects/<project>/memory; "custom": autoMemoryDirectory
  kind: "project" | "custom";
  project: string;
  cwd: string | null;
  dir: string;
  // False when an autoMemoryDirectory setting means Claude Code no longer uses it
  active: boolean;
  index: MemoryIndexStats | null;
  // Topic files the index doesn't link to, so Claude won't discover them
  orphans: string[];
  entryCount: number;
  modified: string;
}

export interface MemoryEntry {
  id: string;
  sourceId: string;
  filename: string;
  filepath: string;
  isIndex: boolean;
  name: string;
  description: string | null;
  type: MemoryType | null;
  sessionId: string | null;
  modified: string;
  size: number;
  lineCount: number;
  // Filenames in the same directory this entry links to / is linked from
  links: string[];
  linkedFrom: string[];
  inIndex: boolean;
}

export interface MemorySnapshot {
  sources: MemorySource[];
  entries: MemoryEntry[];
  contents: Map<string, string>; // entry id -> raw markdown
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseFrontmatter(content: string): {
  data: Record<string, unknown> | null;
  body: string;
} {
  const match = content.match(FRONTMATTER);
  if (!match) return { data: null, body: content };

  const body = content.slice(match[0].length);
  try {
    const data = Bun.YAML.parse(match[1] ?? "");
    const isObject =
      data !== null && typeof data === "object" && !Array.isArray(data);
    return { data: isObject ? (data as Record<string, unknown>) : null, body };
  } catch {
    return { data: null, body };
  }
}

function stripCode(markdown: string): string {
  return markdown
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "")
    .replace(/`[^`\n]*`/g, "");
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

// Relative links to .md files and [[wikilinks]], ignoring code
export function extractLinks(markdown: string): {
  files: string[];
  wikis: string[];
} {
  const text = stripCode(markdown);
  const files: string[] = [];
  const wikis: string[] = [];

  for (const match of text.matchAll(/\[[^\]]*\]\(<?([^)\s>]+)>?\)/g)) {
    const target = (match[1] ?? "").split("#")[0] ?? "";
    const isUrl = /^[a-z][a-z0-9+.-]*:/i.test(target);
    if (!target || isUrl || !target.toLowerCase().endsWith(".md")) continue;
    let file = target.replace(/^\.\//, "");
    try {
      file = decodeURIComponent(file);
    } catch {
      // Keep the raw target
    }
    files.push(file);
  }

  for (const match of text.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
    const target = (match[1] ?? "").trim();
    if (target) wikis.push(target);
  }

  return { files: unique(files), wikis: unique(wikis) };
}

export function countLines(content: string): number {
  if (!content) return 0;
  const lines = content.split("\n").length;
  return content.endsWith("\n") ? lines - 1 : lines;
}

// Claude Code names project dirs by replacing "/" and "." in the path with
// "-", which is lossy. Rebuild the path by probing which candidates exist.
export function decodeProjectDirName(
  name: string,
  exists: (path: string) => boolean = existsSync,
): string | null {
  if (!name.startsWith("-")) return null;
  const parts = name.slice(1).split("-");

  const walk = (path: string, i: number): string | null => {
    if (i === parts.length) return path;
    // Longest run first: "my-app" is one segment, not "my/app"
    for (let j = parts.length; j > i; j--) {
      const run = parts.slice(i, j);
      const candidates = [run.join("-")];
      // An empty part comes from a "." ("/.config" -> "--config")
      if (run[0] === "" && run.length > 1) {
        candidates.push("." + run.slice(1).join("-"));
      }
      for (const segment of candidates) {
        if (!segment) continue;
        const next = `${path}/${segment}`;
        if (!exists(next)) continue;
        const decoded = walk(next, j);
        if (decoded) return decoded;
      }
    }
    return null;
  };

  return walk("", 0);
}

const CWD_PATTERN = /"cwd":"((?:[^"\\]|\\.)*)"/;
const CWD_SCAN_LIMIT = 4 * 1024 * 1024;

// First "cwd" recorded in a project dir's session logs. Streams each log and
// stops at the first match; logs can be hundreds of MB.
export async function readCwdFromSessionLogs(
  projectDir: string,
): Promise<string | null> {
  let files: string[];
  try {
    files = (await readdir(projectDir)).filter((f) => f.endsWith(".jsonl"));
  } catch {
    return null;
  }

  for (const file of files) {
    const reader = Bun.file(join(projectDir, file)).stream().getReader();
    const decoder = new TextDecoder();
    let text = "";
    try {
      while (text.length < CWD_SCAN_LIMIT) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const match = text.match(CWD_PATTERN);
        if (match) {
          try {
            return JSON.parse(`"${match[1]}"`) as string;
          } catch {
            return match[1] ?? null;
          }
        }
        // Keep a tail so a match split across chunks is still found
        if (text.length > 64 * 1024) text = text.slice(-4096);
      }
    } catch {
      // Unreadable log; try the next one
    } finally {
      reader.cancel().catch(() => {});
    }
  }
  return null;
}

function expandHome(path: string): string | null {
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return isAbsolute(path) ? path : null;
}

// autoMemoryDirectory from one settings file; must be absolute or start with ~/
export async function readAutoMemoryDirectory(
  settingsPath: string,
): Promise<string | null> {
  try {
    const settings = await Bun.file(settingsPath).json();
    const value = settings?.autoMemoryDirectory;
    return typeof value === "string" ? expandHome(value) : null;
  } catch {
    return null;
  }
}

async function listMarkdown(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

function projectName(cwd: string | null, dirName: string): string {
  if (!cwd) return dirName.replace(/^-/, "");
  return basename(cwd.replace(/\\/g, "/").replace(/\/$/, "")) || cwd;
}

function frontmatterString(
  data: Record<string, unknown> | null,
  key: string,
): string | null {
  const metadata = data?.metadata;
  const nested =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)[key]
      : undefined;
  const value = nested ?? data?.[key];
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type SourceMeta = Omit<
  MemorySource,
  "index" | "orphans" | "entryCount" | "modified"
>;

async function readSource(
  meta: SourceMeta,
  filenames: string[],
): Promise<{
  source: MemorySource;
  entries: MemoryEntry[];
  contents: Map<string, string>;
}> {
  const files = (
    await Promise.all(
      filenames.map(async (filename) => {
        const filepath = join(meta.dir, filename);
        try {
          const [content, stats] = await Promise.all([
            Bun.file(filepath).text(),
            stat(filepath),
          ]);
          const { data, body } = parseFrontmatter(content);
          return {
            filename,
            filepath,
            content,
            stats,
            data,
            body,
            links: extractLinks(body),
          };
        } catch {
          return null; // Deleted between readdir and read
        }
      }),
    )
  ).filter((f) => f !== null);

  const present = new Set(files.map((f) => f.filename));
  const byName = new Map<string, string>();
  for (const file of files) {
    const name = frontmatterString(file.data, "name");
    if (name) byName.set(name, file.filename);
  }
  const resolveWiki = (target: string) =>
    present.has(`${target}.md`)
      ? `${target}.md`
      : present.has(target)
        ? target
        : (byName.get(target) ?? null);

  const outgoing = new Map<string, string[]>();
  for (const file of files) {
    const targets = [
      ...file.links.files.filter((f) => present.has(f)),
      ...file.links.wikis.map(resolveWiki).filter((f) => f !== null),
    ];
    outgoing.set(
      file.filename,
      unique(targets).filter((t) => t !== file.filename),
    );
  }

  const incoming = new Map<string, string[]>();
  for (const [from, targets] of outgoing) {
    for (const target of targets) {
      incoming.set(target, [...(incoming.get(target) ?? []), from]);
    }
  }

  const indexFile = files.find((f) => f.filename === MEMORY_INDEX);
  const indexTargets = new Set(indexFile ? outgoing.get(MEMORY_INDEX) : []);
  const index: MemoryIndexStats | null = indexFile
    ? {
        lines: countLines(indexFile.content),
        bytes: Buffer.byteLength(indexFile.content),
        lineLimit: INDEX_LINE_LIMIT,
        byteLimit: INDEX_BYTE_LIMIT,
        danglingLinks: [
          ...indexFile.links.files.filter((f) => !present.has(f)),
          ...indexFile.links.wikis
            .filter((w) => resolveWiki(w) === null)
            .map((w) => (w.endsWith(".md") ? w : `${w}.md`)),
        ],
      }
    : null;

  const contents = new Map<string, string>();
  const entries: MemoryEntry[] = files.map((file) => {
    const id = `${meta.id}/${file.filename}`;
    const isIndex = file.filename === MEMORY_INDEX;
    const type = frontmatterString(file.data, "type");
    const modified = frontmatterString(file.data, "modified");
    const heading = file.body.match(/^#\s+(.+)$/m)?.[1]?.trim();
    contents.set(id, file.content);

    return {
      id,
      sourceId: meta.id,
      filename: file.filename,
      filepath: file.filepath,
      isIndex,
      name: isIndex
        ? MEMORY_INDEX
        : (frontmatterString(file.data, "name") ??
          heading ??
          file.filename.replace(/\.md$/, "")),
      description: frontmatterString(file.data, "description"),
      type: type && MEMORY_TYPES.has(type) ? (type as MemoryType) : null,
      sessionId: frontmatterString(file.data, "originSessionId"),
      modified:
        modified && !Number.isNaN(Date.parse(modified))
          ? new Date(modified).toISOString()
          : file.stats.mtime.toISOString(),
      size: file.stats.size,
      lineCount: countLines(file.content),
      links: outgoing.get(file.filename) ?? [],
      linkedFrom: (incoming.get(file.filename) ?? []).sort((a, b) =>
        a.localeCompare(b),
      ),
      inIndex: isIndex || indexTargets.has(file.filename),
    };
  });

  const topics = entries.filter((e) => !e.isIndex);
  const source: MemorySource = {
    ...meta,
    index,
    orphans: index
      ? topics.filter((e) => !e.inIndex).map((e) => e.filename)
      : [],
    entryCount: topics.length,
    modified: entries.reduce(
      (latest, e) => (e.modified > latest ? e.modified : latest),
      new Date(0).toISOString(),
    ),
  };

  return { source, entries, contents };
}

export interface ScanMemoryOptions {
  claudeDir: string;
  projectsDir: string;
  // Working directory of a ~/.claude/projects/<dir> entry, if known
  resolveCwd: (projectDir: string) => Promise<string | null>;
  exists?: (path: string) => boolean;
}

function customSourceId(dir: string): string {
  return `custom-${Bun.hash(dir).toString(36)}`;
}

export async function scanMemory(
  options: ScanMemoryOptions,
): Promise<MemorySnapshot> {
  const exists = options.exists ?? existsSync;
  const metas: { meta: SourceMeta; files: string[] }[] = [];
  const seenDirs = new Set<string>();

  const add = async (meta: SourceMeta) => {
    if (seenDirs.has(meta.dir)) return;
    seenDirs.add(meta.dir);
    const files = await listMarkdown(meta.dir);
    if (files.length > 0) metas.push({ meta, files });
  };

  // User-level setting replaces every project's default memory dir
  const userDir = await readAutoMemoryDirectory(
    join(options.claudeDir, "settings.json"),
  );
  if (userDir) {
    await add({
      id: customSourceId(userDir),
      kind: "custom",
      project: "All projects",
      cwd: null,
      dir: userDir,
      active: true,
    });
  }

  let projectDirs: string[] = [];
  try {
    projectDirs = await readdir(options.projectsDir);
  } catch {
    // No projects dir
  }

  const projectMetas: SourceMeta[] = [];
  for (const dirName of projectDirs) {
    const projectDir = join(options.projectsDir, dirName);
    const cwd =
      (await options.resolveCwd(projectDir)) ??
      decodeProjectDirName(dirName, exists);
    const project = projectName(cwd, dirName);

    // Project and local settings override the user-level directory
    const repoDir = cwd
      ? ((await readAutoMemoryDirectory(
          join(cwd, ".claude", "settings.local.json"),
        )) ??
        (await readAutoMemoryDirectory(join(cwd, ".claude", "settings.json"))))
      : null;

    projectMetas.push({
      id: dirName,
      kind: "project",
      project,
      cwd,
      dir: join(projectDir, "memory"),
      active: !userDir && !repoDir,
    });
    if (repoDir) {
      projectMetas.push({
        id: customSourceId(repoDir),
        kind: "custom",
        project,
        cwd,
        dir: repoDir,
        active: true,
      });
    }
  }

  projectMetas.sort(
    (a, b) =>
      a.project.localeCompare(b.project) ||
      (a.kind === b.kind ? 0 : a.kind === "project" ? -1 : 1),
  );
  for (const meta of projectMetas) await add(meta);

  const sources: MemorySource[] = [];
  const entries: MemoryEntry[] = [];
  const contents = new Map<string, string>();
  for (const { meta, files } of metas) {
    const result = await readSource(meta, files);
    sources.push(result.source);
    entries.push(...result.entries);
    for (const [id, content] of result.contents) contents.set(id, content);
  }

  return { sources, entries, contents };
}
