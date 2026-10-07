import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseFrontmatter,
  extractLinks,
  countLines,
  decodeProjectDirName,
  readCwdFromSessionLogs,
  scanMemory,
  type MemorySnapshot,
} from "../src/server/memory.ts";

describe("parseFrontmatter", () => {
  test("reads nested metadata and strips the block from the body", () => {
    const { data, body } = parseFrontmatter(
      '---\nname: claim-flow\ndescription: "Say \\"Bekreft\\""\nmetadata: \n  type: project\n  originSessionId: abc-123\n---\n\nBody text\n',
    );
    expect(data).toEqual({
      name: "claim-flow",
      description: 'Say "Bekreft"',
      metadata: { type: "project", originSessionId: "abc-123" },
    });
    expect(body).toBe("\nBody text\n");
  });

  test("returns no data and the full content without frontmatter", () => {
    const { data, body } = parseFrontmatter("# Notes\n\nText");
    expect(data).toBeNull();
    expect(body).toBe("# Notes\n\nText");
  });

  test("strips malformed frontmatter but returns no data", () => {
    const { data, body } = parseFrontmatter("---\nname: [unclosed\n---\nBody");
    expect(data).toBeNull();
    expect(body).toBe("Body");
  });

  test("handles CRLF line endings", () => {
    const { data, body } = parseFrontmatter("---\r\nname: x\r\n---\r\nBody");
    expect(data).toEqual({ name: "x" });
    expect(body).toBe("Body");
  });
});

describe("extractLinks", () => {
  test("finds relative markdown links and wikilinks", () => {
    const links = extractLinks(
      "- [Tests](testing.md) and [[zsh-gotchas]], [[other|Alias]], [[deep#Heading]]\n" +
        "[web](https://example.com/a.md) [anchor](notes.md#part)",
    );
    expect(links.files).toEqual(["testing.md", "notes.md"]);
    expect(links.wikis).toEqual(["zsh-gotchas", "other", "deep"]);
  });

  test("ignores links inside code", () => {
    const links = extractLinks(
      "```md\n[[fenced]] [a](fenced.md)\n```\nUse `[[inline]]` but [[real]]",
    );
    expect(links.wikis).toEqual(["real"]);
    expect(links.files).toEqual([]);
  });
});

describe("countLines", () => {
  test("counts lines the way an editor shows them", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a")).toBe(1);
    expect(countLines("a\nb")).toBe(2);
    expect(countLines("a\nb\n")).toBe(2);
  });
});

describe("decodeProjectDirName", () => {
  const dirs = new Set([
    "/Users",
    "/Users/demo",
    "/Users/demo/code",
    "/Users/demo/code/my-app",
    "/Users/demo/.config",
    "/Users/demo/.config/tool",
  ]);
  const exists = (p: string) => dirs.has(p);

  test("rebuilds paths whose names contain dashes", () => {
    expect(decodeProjectDirName("-Users-demo-code-my-app", exists)).toBe(
      "/Users/demo/code/my-app",
    );
  });

  test("rebuilds dot-prefixed directories", () => {
    expect(decodeProjectDirName("-Users-demo--config-tool", exists)).toBe(
      "/Users/demo/.config/tool",
    );
  });

  test("returns null when the path no longer exists", () => {
    expect(decodeProjectDirName("-Users-demo-code-gone", exists)).toBeNull();
    expect(decodeProjectDirName("C--Users-demo", exists)).toBeNull();
  });
});

describe("scanMemory", () => {
  let root: string;
  let snapshot: MemorySnapshot;

  const write = async (path: string, content: string) => {
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content);
  };

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "plan-viewer-memory-"));
    const claudeDir = join(root, ".claude");
    const projects = join(claudeDir, "projects");
    const repo = join(root, "work", "web-app");
    const repoCustom = join(root, "repo-memory");
    const userCustom = join(root, "shared-memory");

    // Project with a session log, an index, topic files, an orphan and a dangling link
    await write(
      join(projects, "-work-web-app", "s1.jsonl"),
      JSON.stringify({ cwd: repo, sessionId: "s1" }) + "\n",
    );
    const mem = join(projects, "-work-web-app", "memory");
    await write(
      join(mem, "MEMORY.md"),
      "- [No presentational tests](no-presentational-tests.md) — behaviour only\n" +
        "- [Testing strategy](testing-strategy.md)\n" +
        "- [Gone](missing-note.md)\n",
    );
    await write(
      join(mem, "no-presentational-tests.md"),
      "---\nname: no-presentational-tests\ndescription: Test behaviour only\nmetadata:\n  type: feedback\n  originSessionId: s1\n  modified: 2026-09-17T14:26:24.088Z\n---\n\nSee [[testing-strategy]].\n",
    );
    await write(
      join(mem, "testing-strategy.md"),
      "---\nname: testing-strategy\ndescription: Fixtures, not live data\ntype: project\noriginSessionId: s2\n---\n\nRelated: [[no-presentational-tests]] and [[unknown]]\n",
    );
    await write(join(mem, "old-notes.md"), "# Old deploy notes\n\nStale.\n");

    // Empty memory dir (Claude Code creates these eagerly): no source
    await mkdir(join(projects, "-work-empty", "memory"), { recursive: true });

    // Project dir without memory
    await mkdir(join(projects, "-work-no-memory"), { recursive: true });

    // Repo-level autoMemoryDirectory for web-app
    await write(
      join(repo, ".claude", "settings.json"),
      JSON.stringify({ autoMemoryDirectory: repoCustom }),
    );
    await write(join(repoCustom, "MEMORY.md"), "- [Repo note](repo-note.md)\n");
    await write(
      join(repoCustom, "repo-note.md"),
      "---\nname: repo-note\ndescription: Lives in the repo setting dir\ntype: reference\n---\nText\n",
    );

    // User-level autoMemoryDirectory
    await write(
      join(claudeDir, "settings.json"),
      JSON.stringify({ autoMemoryDirectory: userCustom }),
    );
    await write(
      join(userCustom, "user-role.md"),
      "---\nname: user-role\ndescription: Senior dev\nmetadata:\n  type: user\n---\nText\n",
    );

    snapshot = await scanMemory({
      claudeDir,
      projectsDir: projects,
      resolveCwd: (dir) => readCwdFromSessionLogs(dir),
    });
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const entry = (filename: string) => {
    const found = snapshot.entries.find((e) => e.filename === filename);
    if (!found) throw new Error(`no entry ${filename}`);
    return found;
  };

  test("finds one source per non-empty memory dir plus configured dirs", () => {
    const sources = snapshot.sources.map((s) => [s.kind, s.project]);
    expect(sources).toEqual([
      ["custom", "All projects"],
      ["project", "web-app"],
      ["custom", "web-app"],
    ]);
  });

  test("marks default dirs inactive when autoMemoryDirectory points elsewhere", () => {
    const byKind = Object.fromEntries(
      snapshot.sources.map((s) => [`${s.kind}:${s.project}`, s.active]),
    );
    expect(byKind["project:web-app"]).toBe(false);
    expect(byKind["custom:web-app"]).toBe(true);
    expect(byKind["custom:All projects"]).toBe(true);
  });

  test("reports index load budget, orphans and dangling links", () => {
    const source = snapshot.sources.find((s) => s.kind === "project")!;
    expect(source.index).toMatchObject({ lines: 3, lineLimit: 200 });
    expect(source.index!.danglingLinks).toEqual(["missing-note.md"]);
    expect(source.orphans).toEqual(["old-notes.md"]);
    expect(source.entryCount).toBe(3);
  });

  test("reads metadata from nested and top-level frontmatter", () => {
    expect(entry("no-presentational-tests.md")).toMatchObject({
      name: "no-presentational-tests",
      description: "Test behaviour only",
      type: "feedback",
      sessionId: "s1",
      modified: "2026-09-17T14:26:24.088Z",
      inIndex: true,
      isIndex: false,
    });
    expect(entry("testing-strategy.md")).toMatchObject({
      type: "project",
      sessionId: "s2",
    });
  });

  test("falls back to the heading for files without frontmatter", () => {
    expect(entry("old-notes.md")).toMatchObject({
      name: "Old deploy notes",
      description: null,
      type: null,
      inIndex: false,
    });
  });

  test("resolves links and backlinks within a source", () => {
    expect(entry("no-presentational-tests.md").links).toEqual([
      "testing-strategy.md",
    ]);
    expect(entry("testing-strategy.md").linkedFrom).toEqual([
      "MEMORY.md",
      "no-presentational-tests.md",
    ]);
    expect(entry("MEMORY.md").links).toEqual([
      "no-presentational-tests.md",
      "testing-strategy.md",
    ]);
  });

  test("keeps raw content for each entry", () => {
    const id = entry("old-notes.md").id;
    expect(snapshot.contents.get(id)).toBe("# Old deploy notes\n\nStale.\n");
  });
});
