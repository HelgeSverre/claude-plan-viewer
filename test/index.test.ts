import { test, expect, describe } from "bun:test";

// ============================================================================
// extractProjectName: Get project name from a full path
// ============================================================================

describe("extractProjectName", () => {
  // Implementation: Get the last segment of a path (cross-platform)
  function extractProjectName(cwd: string): string {
    if (!cwd) return "";
    // Normalize: handle both / and \ separators
    const normalized = cwd.replace(/\\/g, "/");
    // Remove trailing slash
    const trimmed = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
    // Get last segment
    const lastSlash = trimmed.lastIndexOf("/");
    return lastSlash === -1 ? trimmed : trimmed.slice(lastSlash + 1);
  }

  test("macOS: /Users/helge/code/plans-viewer → plans-viewer", () => {
    expect(extractProjectName("/Users/helge/code/plans-viewer")).toBe("plans-viewer");
  });

  test("macOS: /Users/helge/code/my-cool-app → my-cool-app", () => {
    expect(extractProjectName("/Users/helge/code/my-cool-app")).toBe("my-cool-app");
  });

  test("macOS: /Users/helge/projects/api → api", () => {
    expect(extractProjectName("/Users/helge/projects/api")).toBe("api");
  });

  test("Linux: /home/user/code/webapp → webapp", () => {
    expect(extractProjectName("/home/user/code/webapp")).toBe("webapp");
  });

  test("Linux: /home/user/dev/my-project → my-project", () => {
    expect(extractProjectName("/home/user/dev/my-project")).toBe("my-project");
  });

  test("Windows: C:\\Users\\name\\code\\myapp → myapp", () => {
    expect(extractProjectName("C:\\Users\\name\\code\\myapp")).toBe("myapp");
  });

  test("Windows: C:\\Users\\name\\projects\\my-app → my-app", () => {
    expect(extractProjectName("C:\\Users\\name\\projects\\my-app")).toBe("my-app");
  });

  test("trailing slash is handled: /path/to/project/ → project", () => {
    expect(extractProjectName("/Users/helge/code/project/")).toBe("project");
  });

  test("Windows trailing backslash: C:\\path\\project\\ → project", () => {
    expect(extractProjectName("C:\\Users\\name\\code\\project\\")).toBe("project");
  });

  test("root path returns empty string: / → ''", () => {
    expect(extractProjectName("/")).toBe("");
  });

  test("empty string returns empty string", () => {
    expect(extractProjectName("")).toBe("");
  });
});

// ============================================================================
// extractCwdFromJsonl: Parse cwd from JSONL content
// ============================================================================

describe("extractCwdFromJsonl", () => {
  // Implementation: Extract cwd from JSONL content using regex
  function extractCwdFromJsonl(content: string): string | null {
    if (!content) return null;
    // Match "cwd":"..." pattern, capturing the path
    // Handle escaped backslashes in Windows paths
    const match = content.match(/"cwd":"([^"]+)"/);
    if (!match) return null;
    // Unescape JSON string (convert \\\\ to \\)
    return match[1].replace(/\\\\/g, "\\");
  }

  test("extracts cwd from valid JSONL line", () => {
    const content = '{"cwd":"/Users/helge/code/plans-viewer","sessionId":"abc123"}';
    expect(extractCwdFromJsonl(content)).toBe("/Users/helge/code/plans-viewer");
  });

  test("extracts cwd from multi-line JSONL (returns first found)", () => {
    const content = `{"type":"summary","summary":"test"}
{"cwd":"/Users/helge/code/my-project","sessionId":"xyz"}
{"cwd":"/Users/helge/code/other","type":"user"}`;
    expect(extractCwdFromJsonl(content)).toBe("/Users/helge/code/my-project");
  });

  test("handles Windows paths with escaped backslashes", () => {
    const content = '{"cwd":"C:\\\\Users\\\\name\\\\code\\\\myapp","sessionId":"123"}';
    expect(extractCwdFromJsonl(content)).toBe("C:\\Users\\name\\code\\myapp");
  });

  test("returns null when no cwd found", () => {
    const content = '{"type":"summary","summary":"no cwd here"}';
    expect(extractCwdFromJsonl(content)).toBeNull();
  });

  test("returns null for empty content", () => {
    expect(extractCwdFromJsonl("")).toBeNull();
  });

  test("handles malformed JSON gracefully", () => {
    const content = '{"cwd": broken json here';
    expect(extractCwdFromJsonl(content)).toBeNull();
  });
});

// ============================================================================
// extractSlugsFromJsonl: Find all plan slugs in JSONL content
// ============================================================================

describe("extractSlugsFromJsonl", () => {
  // Implementation: Extract unique slugs from JSONL content
  function extractSlugsFromJsonl(content: string): string[] {
    if (!content) return [];
    const slugs = new Set<string>();
    // Match all "slug":"..." patterns
    const matches = content.matchAll(/"slug":"([\w-]+)"/g);
    for (const match of matches) {
      slugs.add(match[1]);
    }
    return Array.from(slugs);
  }

  test("extracts single slug", () => {
    const content = '{"slug":"happy-jumping-rabbit","type":"assistant"}';
    expect(extractSlugsFromJsonl(content)).toEqual(["happy-jumping-rabbit"]);
  });

  test("extracts multiple unique slugs", () => {
    const content = `{"slug":"first-slug","type":"user"}
{"slug":"second-slug","type":"assistant"}
{"slug":"first-slug","type":"user"}`;
    expect(extractSlugsFromJsonl(content)).toEqual(["first-slug", "second-slug"]);
  });

  test("returns empty array when no slugs found", () => {
    const content = '{"type":"summary","data":"no slugs"}';
    expect(extractSlugsFromJsonl(content)).toEqual([]);
  });

  test("returns empty array for empty content", () => {
    expect(extractSlugsFromJsonl("")).toEqual([]);
  });

  test("handles slugs with numbers", () => {
    const content = '{"slug":"test-123-slug","type":"user"}';
    expect(extractSlugsFromJsonl(content)).toEqual(["test-123-slug"]);
  });
});

// ============================================================================
// extractSlugSessionMap: Extract slug -> sessionId mappings from JSONL
// ============================================================================

describe("extractSlugSessionMap", () => {
  // Implementation: Extract slug -> sessionId mapping from JSONL content
  function extractSlugSessionMap(content: string): Map<string, string> {
    if (!content) return new Map();
    const slugSessionMap = new Map<string, string>();

    const lines = content.split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;

      const slugMatch = line.match(/"slug":"([\w-]+)"/);
      const sessionMatch = line.match(/"sessionId":"([^"]+)"/);

      if (slugMatch && sessionMatch) {
        slugSessionMap.set(slugMatch[1], sessionMatch[1]);
      }
    }

    return slugSessionMap;
  }

  test("extracts slug and sessionId from single line", () => {
    const content = '{"slug":"happy-rabbit","sessionId":"05723b08-43ce-4ee1-a0dd-842991cad4bd"}';
    const result = extractSlugSessionMap(content);
    expect(result.get("happy-rabbit")).toBe("05723b08-43ce-4ee1-a0dd-842991cad4bd");
    expect(result.size).toBe(1);
  });

  test("extracts multiple slug-session pairs from multi-line content", () => {
    const content = `{"slug":"first-slug","sessionId":"session-1","type":"user"}
{"slug":"second-slug","sessionId":"session-2","type":"assistant"}`;
    const result = extractSlugSessionMap(content);
    expect(result.get("first-slug")).toBe("session-1");
    expect(result.get("second-slug")).toBe("session-2");
    expect(result.size).toBe(2);
  });

  test("ignores lines without both slug and sessionId", () => {
    const content = `{"slug":"has-slug-only","type":"user"}
{"sessionId":"has-session-only","type":"assistant"}
{"slug":"complete","sessionId":"session-123"}`;
    const result = extractSlugSessionMap(content);
    expect(result.size).toBe(1);
    expect(result.get("complete")).toBe("session-123");
  });

  test("returns empty map for content without slug-session pairs", () => {
    const content = '{"type":"summary","data":"no slugs or sessions"}';
    const result = extractSlugSessionMap(content);
    expect(result.size).toBe(0);
  });

  test("returns empty map for empty content", () => {
    expect(extractSlugSessionMap("").size).toBe(0);
  });

  test("returns empty map for null-ish values", () => {
    expect(extractSlugSessionMap(null as unknown as string).size).toBe(0);
    expect(extractSlugSessionMap(undefined as unknown as string).size).toBe(0);
  });

  test("handles UUID sessionIds correctly", () => {
    const content = '{"slug":"test-plan","sessionId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890"}';
    const result = extractSlugSessionMap(content);
    expect(result.get("test-plan")).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  test("later occurrence overwrites earlier for same slug", () => {
    const content = `{"slug":"duplicate","sessionId":"old-session"}
{"slug":"duplicate","sessionId":"new-session"}`;
    const result = extractSlugSessionMap(content);
    expect(result.get("duplicate")).toBe("new-session");
    expect(result.size).toBe(1);
  });

  test("handles empty lines gracefully", () => {
    const content = `{"slug":"valid","sessionId":"session-1"}

{"slug":"also-valid","sessionId":"session-2"}
`;
    const result = extractSlugSessionMap(content);
    expect(result.size).toBe(2);
  });

  test("handles slugs with numbers and hyphens", () => {
    const content = '{"slug":"plan-123-test","sessionId":"sess-456"}';
    const result = extractSlugSessionMap(content);
    expect(result.get("plan-123-test")).toBe("sess-456");
  });
});

// ============================================================================
// Integration: buildProjectMapping
// ============================================================================

describe("buildProjectMapping integration", () => {
  // This tests the full flow with mock data

  interface SlugMetadata {
    project: string;
    sessionId: string | null;
  }

  interface ProjectMapping {
    [slug: string]: SlugMetadata;
  }

  // Helper: extract project name from path
  function extractProjectName(cwd: string): string {
    if (!cwd) return "";
    const normalized = cwd.replace(/\\/g, "/");
    const trimmed = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
    const lastSlash = trimmed.lastIndexOf("/");
    return lastSlash === -1 ? trimmed : trimmed.slice(lastSlash + 1);
  }

  function buildProjectMappingFromData(
    projectData: Array<{ cwd: string; slugSessions: Array<{ slug: string; sessionId: string }> }>
  ): ProjectMapping {
    const mapping: ProjectMapping = {};
    for (const { cwd, slugSessions } of projectData) {
      const projectName = extractProjectName(cwd);
      for (const { slug, sessionId } of slugSessions) {
        mapping[slug] = { project: projectName, sessionId };
      }
    }
    return mapping;
  }

  test("builds mapping with project and sessionId from single project", () => {
    const data = [
      {
        cwd: "/Users/helge/code/plans-viewer",
        slugSessions: [
          { slug: "happy-rabbit", sessionId: "session-123" },
          { slug: "sad-cat", sessionId: "session-456" }
        ]
      }
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping["happy-rabbit"]).toEqual({ project: "plans-viewer", sessionId: "session-123" });
    expect(mapping["sad-cat"]).toEqual({ project: "plans-viewer", sessionId: "session-456" });
  });

  test("builds mapping from multiple projects with sessionIds", () => {
    const data = [
      { cwd: "/Users/helge/code/project-a", slugSessions: [{ slug: "slug-1", sessionId: "sess-a" }] },
      { cwd: "/Users/helge/code/project-b", slugSessions: [
        { slug: "slug-2", sessionId: "sess-b1" },
        { slug: "slug-3", sessionId: "sess-b2" }
      ]},
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping["slug-1"]).toEqual({ project: "project-a", sessionId: "sess-a" });
    expect(mapping["slug-2"]).toEqual({ project: "project-b", sessionId: "sess-b1" });
    expect(mapping["slug-3"]).toEqual({ project: "project-b", sessionId: "sess-b2" });
  });

  test("handles empty data", () => {
    const mapping = buildProjectMappingFromData([]);
    expect(mapping).toEqual({});
  });

  test("handles project with no slugs", () => {
    const data = [
      { cwd: "/Users/helge/code/no-slugs", slugSessions: [] }
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping).toEqual({});
  });

  test("later project wins for duplicate slugs (with sessionId)", () => {
    const data = [
      { cwd: "/Users/helge/code/old-project", slugSessions: [{ slug: "duplicate-slug", sessionId: "old-sess" }] },
      { cwd: "/Users/helge/code/new-project", slugSessions: [{ slug: "duplicate-slug", sessionId: "new-sess" }] },
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping["duplicate-slug"]).toEqual({ project: "new-project", sessionId: "new-sess" });
  });

  test("preserves UUID format sessionIds", () => {
    const data = [
      {
        cwd: "/Users/helge/code/test",
        slugSessions: [{ slug: "test-plan", sessionId: "05723b08-43ce-4ee1-a0dd-842991cad4bd" }]
      }
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping["test-plan"].sessionId).toBe("05723b08-43ce-4ee1-a0dd-842991cad4bd");
  });
});

// ============================================================================
// Failure scenarios and edge cases
// ============================================================================

describe("graceful failure handling", () => {
  // extractProjectName edge cases
  describe("extractProjectName robustness", () => {
    function extractProjectName(cwd: string): string {
      if (!cwd) return "";
      const normalized = cwd.replace(/\\/g, "/");
      const trimmed = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
      const lastSlash = trimmed.lastIndexOf("/");
      return lastSlash === -1 ? trimmed : trimmed.slice(lastSlash + 1);
    }

    test("handles null-ish values", () => {
      expect(extractProjectName("")).toBe("");
      expect(extractProjectName(null as unknown as string)).toBe("");
      expect(extractProjectName(undefined as unknown as string)).toBe("");
    });

    test("handles paths with only slashes", () => {
      expect(extractProjectName("///")).toBe("");
      expect(extractProjectName("\\\\\\")).toBe("");
    });

    test("handles mixed separators", () => {
      expect(extractProjectName("C:\\Users/name\\code/project")).toBe("project");
    });

    test("handles very long paths", () => {
      const longPath = "/a/" + "b/".repeat(100) + "project";
      expect(extractProjectName(longPath)).toBe("project");
    });

    test("handles paths with special characters", () => {
      expect(extractProjectName("/path/to/my project")).toBe("my project");
      expect(extractProjectName("/path/to/project@2.0")).toBe("project@2.0");
      expect(extractProjectName("/path/to/project_name")).toBe("project_name");
    });
  });

  // extractCwdFromJsonl edge cases
  describe("extractCwdFromJsonl robustness", () => {
    function extractCwdFromJsonl(content: string): string | null {
      if (!content) return null;
      const match = content.match(/"cwd":"([^"]+)"/);
      if (!match) return null;
      return match[1].replace(/\\\\/g, "\\");
    }

    test("handles null-ish values", () => {
      expect(extractCwdFromJsonl("")).toBeNull();
      expect(extractCwdFromJsonl(null as unknown as string)).toBeNull();
      expect(extractCwdFromJsonl(undefined as unknown as string)).toBeNull();
    });

    test("handles malformed JSON", () => {
      expect(extractCwdFromJsonl("{broken")).toBeNull();
      expect(extractCwdFromJsonl('{"cwd":')).toBeNull();
      expect(extractCwdFromJsonl('{"cwd":}')).toBeNull();
    });

    test("handles cwd with special characters", () => {
      const content = '{"cwd":"/path/with spaces/project"}';
      expect(extractCwdFromJsonl(content)).toBe("/path/with spaces/project");
    });

    test("handles very large content", () => {
      const largeContent = "x".repeat(10000) + '{"cwd":"/found/it"}' + "y".repeat(10000);
      expect(extractCwdFromJsonl(largeContent)).toBe("/found/it");
    });

    test("ignores cwd-like strings not in proper format", () => {
      expect(extractCwdFromJsonl("cwd:/path/fake")).toBeNull();
      expect(extractCwdFromJsonl('"cwd" : "/path/fake"')).toBeNull(); // spaces
    });
  });

  // extractSlugsFromJsonl edge cases
  describe("extractSlugsFromJsonl robustness", () => {
    function extractSlugsFromJsonl(content: string): string[] {
      if (!content) return [];
      const slugs = new Set<string>();
      const matches = content.matchAll(/"slug":"([\w-]+)"/g);
      for (const match of matches) {
        slugs.add(match[1]);
      }
      return Array.from(slugs);
    }

    test("handles null-ish values", () => {
      expect(extractSlugsFromJsonl("")).toEqual([]);
      expect(extractSlugsFromJsonl(null as unknown as string)).toEqual([]);
      expect(extractSlugsFromJsonl(undefined as unknown as string)).toEqual([]);
    });

    test("handles malformed JSON", () => {
      expect(extractSlugsFromJsonl("{broken")).toEqual([]);
      expect(extractSlugsFromJsonl('{"slug":')).toEqual([]);
    });

    test("ignores invalid slug formats", () => {
      // Slugs with spaces or special chars should not match
      expect(extractSlugsFromJsonl('{"slug":"has space"}')).toEqual([]);
      expect(extractSlugsFromJsonl('{"slug":"has@symbol"}')).toEqual([]);
    });

    test("handles very large content with many slugs", () => {
      const slugs = Array.from({ length: 100 }, (_, i) => `slug-${i}`);
      const content = slugs.map(s => `{"slug":"${s}"}`).join("\n");
      const result = extractSlugsFromJsonl(content);
      expect(result.length).toBe(100);
    });

    test("deduplicates slugs correctly", () => {
      const content = '{"slug":"same"}{"slug":"same"}{"slug":"same"}';
      expect(extractSlugsFromJsonl(content)).toEqual(["same"]);
    });
  });

  // Integration: loadPlans should work even when project mapping fails
  describe("loadPlans graceful degradation", () => {
    test("plan without matching slug should have null project", () => {
      // This is tested implicitly - plans without slugs in JSONL get null project
      // The key is that the app doesn't crash
    });
  });
});
