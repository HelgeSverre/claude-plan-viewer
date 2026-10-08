import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractProjectName,
  matchCwd,
  matchSlugSession,
  processJsonlLineByLine,
} from "../src/server/projects.ts";

describe("extractProjectName", () => {
  test.each([
    ["/Users/helge/code/plans-viewer", "plans-viewer"],
    ["/home/user/dev/my-project", "my-project"],
    ["C:\\Users\\name\\code\\my-app", "my-app"],
    ["/path/to/project/", "project"],
    ["C:\\path\\project\\", "project"],
    ["/path\\mixed/separators", "separators"],
    ["/Users/test/my project (copy)", "my project (copy)"],
    ["relative-name", "relative-name"],
    ["/", ""],
    ["", ""],
  ])("%p -> %p", (cwd, name) => {
    expect(extractProjectName(cwd)).toBe(name);
  });
});

describe("matchCwd", () => {
  test("reads cwd from a log line", () => {
    const line = JSON.stringify({ type: "user", cwd: "/Users/demo/code/app" });
    expect(matchCwd(line)).toBe("/Users/demo/code/app");
  });

  test("decodes JSON escapes in Windows paths and unicode", () => {
    const line = JSON.stringify({ cwd: "C:\\Users\\name\\café" });
    expect(matchCwd(line)).toBe("C:\\Users\\name\\café");
  });

  test("returns the first cwd in multi-line text", () => {
    const text = `${JSON.stringify({ cwd: "/first" })}\n${JSON.stringify({ cwd: "/second" })}`;
    expect(matchCwd(text)).toBe("/first");
  });

  test("returns null without a cwd field", () => {
    expect(matchCwd(JSON.stringify({ type: "summary" }))).toBeNull();
    expect(matchCwd("")).toBeNull();
    expect(matchCwd('{"cwd": "/spaced/key/is/not/matched"}')).toBeNull();
  });

  test("ignores cwd text inside other string values", () => {
    // Escaped quotes in message text aren't a top-level "cwd":"…" pair
    const line = JSON.stringify({ message: 'set "cwd":"/fake"', cwd: "/real" });
    expect(matchCwd(line)).toBe("/real");
  });
});

describe("matchSlugSession", () => {
  test("returns slug and sessionId when both are present", () => {
    const line = JSON.stringify({
      sessionId: "05723b08-43ce-4ee1-a0dd-842991cad4bd",
      slug: "lets-review-the-ui-effervescent-hollerith",
    });
    expect(matchSlugSession(line)).toEqual({
      slug: "lets-review-the-ui-effervescent-hollerith",
      sessionId: "05723b08-43ce-4ee1-a0dd-842991cad4bd",
    });
  });

  test("returns null unless the line has both fields", () => {
    expect(matchSlugSession(JSON.stringify({ slug: "only-slug" }))).toBeNull();
    expect(matchSlugSession(JSON.stringify({ sessionId: "s1" }))).toBeNull();
    expect(matchSlugSession("")).toBeNull();
  });

  test("accepts slugs with numbers and hyphens", () => {
    const line = JSON.stringify({ slug: "plan-2-v3", sessionId: "s1" });
    expect(matchSlugSession(line)?.slug).toBe("plan-2-v3");
  });
});

describe("processJsonlLineByLine", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "plan-viewer-jsonl-"));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("yields each non-empty line, handling CRLF", async () => {
    const file = join(dir, "session.jsonl");
    await writeFile(file, '{"a":1}\r\n\r\n{"b":2}\n{"c":3}');
    const lines: string[] = [];
    await processJsonlLineByLine(file, (line) => lines.push(line));
    expect(lines).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
  });

  test("streams lines larger than the read buffer", async () => {
    const file = join(dir, "big.jsonl");
    const big = JSON.stringify({ output: "x".repeat(200 * 1024), slug: "s" });
    await writeFile(file, `${big}\n{"end":true}\n`);
    const lines: string[] = [];
    await processJsonlLineByLine(file, (line) => lines.push(line));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(big);
  });

  test("rejects for a missing file", async () => {
    await expect(
      processJsonlLineByLine(join(dir, "missing.jsonl"), () => {}),
    ).rejects.toThrow();
  });
});
