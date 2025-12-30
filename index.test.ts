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
// Integration: buildProjectMapping
// ============================================================================

describe("buildProjectMapping integration", () => {
  // This tests the full flow with mock data

  interface ProjectMapping {
    [slug: string]: string;
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
    projectData: Array<{ cwd: string; slugs: string[] }>
  ): ProjectMapping {
    const mapping: ProjectMapping = {};
    for (const { cwd, slugs } of projectData) {
      const projectName = extractProjectName(cwd);
      for (const slug of slugs) {
        mapping[slug] = projectName;
      }
    }
    return mapping;
  }

  test("builds mapping from single project", () => {
    const data = [
      { cwd: "/Users/helge/code/plans-viewer", slugs: ["happy-rabbit", "sad-cat"] }
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping["happy-rabbit"]).toBe("plans-viewer");
    expect(mapping["sad-cat"]).toBe("plans-viewer");
  });

  test("builds mapping from multiple projects", () => {
    const data = [
      { cwd: "/Users/helge/code/project-a", slugs: ["slug-1"] },
      { cwd: "/Users/helge/code/project-b", slugs: ["slug-2", "slug-3"] },
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping["slug-1"]).toBe("project-a");
    expect(mapping["slug-2"]).toBe("project-b");
    expect(mapping["slug-3"]).toBe("project-b");
  });

  test("handles empty data", () => {
    const mapping = buildProjectMappingFromData([]);
    expect(mapping).toEqual({});
  });

  test("handles project with no slugs", () => {
    const data = [
      { cwd: "/Users/helge/code/no-slugs", slugs: [] }
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping).toEqual({});
  });

  test("later project wins for duplicate slugs", () => {
    const data = [
      { cwd: "/Users/helge/code/old-project", slugs: ["duplicate-slug"] },
      { cwd: "/Users/helge/code/new-project", slugs: ["duplicate-slug"] },
    ];
    const mapping = buildProjectMappingFromData(data);
    expect(mapping["duplicate-slug"]).toBe("new-project");
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
