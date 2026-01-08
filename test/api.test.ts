import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import type { Server } from "bun";

// ============================================================================
// API Endpoint Tests
// ============================================================================

const TEST_PORT = 3599;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess: Bun.Subprocess | null = null;

beforeAll(async () => {
  // Start the server as a subprocess
  serverProcess = Bun.spawn(["bun", "index.ts", "-p", String(TEST_PORT)], {
    cwd: import.meta.dir + "/..",
    stdout: "pipe",
    stderr: "pipe",
  });

  // Wait for server to be ready
  const maxWait = 5000;
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch(`${BASE_URL}/api/projects`);
      if (response.ok) break;
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
});

afterAll(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// ============================================================================
// GET /api/plans
// ============================================================================

describe("GET /api/plans", () => {
  test("returns 200 with plans array", async () => {
    const response = await fetch(`${BASE_URL}/api/plans`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("plans");
    expect(Array.isArray(data.plans)).toBe(true);
  });

  test("plan objects have required metadata fields", async () => {
    const response = await fetch(`${BASE_URL}/api/plans`);
    const data = await response.json();

    if (data.plans.length > 0) {
      const plan = data.plans[0];
      expect(plan).toHaveProperty("filename");
      expect(plan).toHaveProperty("filepath");
      expect(plan).toHaveProperty("title");
      expect(plan).toHaveProperty("size");
      expect(plan).toHaveProperty("modified");
      expect(plan).toHaveProperty("created");
      expect(plan).toHaveProperty("lineCount");
      expect(plan).toHaveProperty("wordCount");
      expect(plan).toHaveProperty("project");
      expect(plan).toHaveProperty("sessionId");
    }
  });

  test("plan objects do NOT include content (lazy loading)", async () => {
    const response = await fetch(`${BASE_URL}/api/plans`);
    const data = await response.json();

    if (data.plans.length > 0) {
      const plan = data.plans[0];
      expect(plan).not.toHaveProperty("content");
    }
  });

  test("returns JSON content type", async () => {
    const response = await fetch(`${BASE_URL}/api/plans`);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

// ============================================================================
// GET /api/plans/{filename}/content
// ============================================================================

describe("GET /api/plans/{filename}/content", () => {
  test("returns 200 with content for valid plan", async () => {
    // First get a valid plan filename
    const plansResponse = await fetch(`${BASE_URL}/api/plans`);
    const plansData = await plansResponse.json();

    if (plansData.plans.length > 0) {
      const filename = plansData.plans[0].filename;
      const response = await fetch(`${BASE_URL}/api/plans/${filename}/content`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("content");
      expect(typeof data.content).toBe("string");
    }
  });

  test("returns 404 for non-existent plan", async () => {
    const response = await fetch(
      `${BASE_URL}/api/plans/non-existent-plan-12345.md/content`
    );
    expect(response.status).toBe(404);
  });

  test("content is markdown string", async () => {
    const plansResponse = await fetch(`${BASE_URL}/api/plans`);
    const plansData = await plansResponse.json();

    if (plansData.plans.length > 0) {
      const filename = plansData.plans[0].filename;
      const response = await fetch(`${BASE_URL}/api/plans/${filename}/content`);
      const data = await response.json();

      // Markdown content typically starts with # heading
      expect(data.content).toMatch(/^#|^\s*#/m);
    }
  });
});

// ============================================================================
// GET /api/projects
// ============================================================================

describe("GET /api/projects", () => {
  test("returns 200 with projects array", async () => {
    const response = await fetch(`${BASE_URL}/api/projects`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("projects");
    expect(Array.isArray(data.projects)).toBe(true);
  });

  test("projects are strings", async () => {
    const response = await fetch(`${BASE_URL}/api/projects`);
    const data = await response.json();

    for (const project of data.projects) {
      expect(typeof project).toBe("string");
    }
  });

  test("projects are sorted alphabetically", async () => {
    const response = await fetch(`${BASE_URL}/api/projects`);
    const data = await response.json();

    if (data.projects.length > 1) {
      const sorted = [...data.projects].sort((a: string, b: string) =>
        a.localeCompare(b)
      );
      expect(data.projects).toEqual(sorted);
    }
  });
});

// ============================================================================
// POST /api/refresh
// ============================================================================

describe("POST /api/refresh", () => {
  test("returns 200 with success true", async () => {
    const response = await fetch(`${BASE_URL}/api/refresh`, {
      method: "POST",
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ success: true });
  });

  test("GET request returns 404 (POST only)", async () => {
    const response = await fetch(`${BASE_URL}/api/refresh`);
    // Bun.serve returns 404 for unmatched routes/methods
    expect(response.status).toBe(404);
  });
});

// ============================================================================
// POST /api/open
// ============================================================================

describe("POST /api/open", () => {
  test("returns 400 for missing filepath", async () => {
    const response = await fetch(`${BASE_URL}/api/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });

  test("returns 400 for invalid filepath (outside plans dir)", async () => {
    const response = await fetch(`${BASE_URL}/api/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filepath: "/etc/passwd" }),
    });
    expect(response.status).toBe(400);
  });

  // Note: We don't test success case as it would open a file in the editor
});

// ============================================================================
// GET /api/openapi.json
// ============================================================================

describe("GET /api/openapi.json", () => {
  test("returns 200 with valid OpenAPI spec", async () => {
    const response = await fetch(`${BASE_URL}/api/openapi.json`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("openapi");
    expect(data.openapi).toMatch(/^3\.\d+\.\d+$/);
  });

  test("has required OpenAPI info section", async () => {
    const response = await fetch(`${BASE_URL}/api/openapi.json`);
    const data = await response.json();

    expect(data).toHaveProperty("info");
    expect(data.info).toHaveProperty("title");
    expect(data.info).toHaveProperty("version");
  });

  test("documents all API paths", async () => {
    const response = await fetch(`${BASE_URL}/api/openapi.json`);
    const data = await response.json();

    expect(data).toHaveProperty("paths");
    expect(data.paths).toHaveProperty("/api/plans");
    expect(data.paths).toHaveProperty("/api/plans/{filename}/content");
    expect(data.paths).toHaveProperty("/api/projects");
    expect(data.paths).toHaveProperty("/api/refresh");
    expect(data.paths).toHaveProperty("/api/open");
  });

  test("has PlanMetadata schema component", async () => {
    const response = await fetch(`${BASE_URL}/api/openapi.json`);
    const data = await response.json();

    expect(data).toHaveProperty("components");
    expect(data.components).toHaveProperty("schemas");
    expect(data.components.schemas).toHaveProperty("PlanMetadata");
  });
});

// ============================================================================
// General API behavior
// ============================================================================

describe("API general behavior", () => {
  test("unknown endpoint returns 404", async () => {
    const response = await fetch(`${BASE_URL}/api/unknown-endpoint`);
    expect(response.status).toBe(404);
  });

  test("root path returns HTML", async () => {
    const response = await fetch(`${BASE_URL}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
  });
});
