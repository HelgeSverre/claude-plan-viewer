import {
  test,
  expect,
  describe,
  beforeAll,
  afterAll,
  setDefaultTimeout,
} from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

setDefaultTimeout(15000);

// ============================================================================
// API Endpoint Tests
// ============================================================================

const TEST_PORT = 3599;
const BASE_URL = `http://localhost:${TEST_PORT}`;
// Fixture .claude dir: 3 plans, one session log mapping demo-feature-auth to "web-app"
const FIXTURES_DIR = join(import.meta.dir, "fixtures");

let serverProcess: Bun.Subprocess | null = null;

function startServer(port: number, claudeDir: string): Bun.Subprocess {
  return Bun.spawn(["bun", "index.ts", "-p", String(port), "-c", claudeDir], {
    cwd: join(import.meta.dir, ".."),
    stdout: "pipe",
    stderr: "pipe",
  });
}

async function waitForServer(baseUrl: string): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < 10000) {
    try {
      const response = await fetch(`${baseUrl}/api/plans`);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server at ${baseUrl} did not start`);
}

async function openFile(filepath: unknown): Promise<Response> {
  return fetch(`${BASE_URL}/api/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filepath }),
  });
}

beforeAll(async () => {
  serverProcess = startServer(TEST_PORT, FIXTURES_DIR);
  await waitForServer(BASE_URL);
});

afterAll(() => {
  serverProcess?.kill();
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

  test("maps plans to projects and sessions from session logs", async () => {
    const response = await fetch(`${BASE_URL}/api/plans`);
    const { plans } = await response.json();

    expect(plans).toHaveLength(3);
    const auth = plans.find(
      (p: { filename: string }) => p.filename === "demo-feature-auth.md",
    );
    expect(auth.project).toBe("web-app");
    expect(auth.sessionId).toBe("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  });

  test("returns an empty list when the plans directory does not exist", async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), "plan-viewer-empty-"));
    const port = TEST_PORT + 1;
    const server = startServer(port, emptyDir);
    try {
      await waitForServer(`http://localhost:${port}`);
      const response = await fetch(`http://localhost:${port}/api/plans`);
      expect(await response.json()).toEqual({ plans: [] });
    } finally {
      server.kill();
      await rm(emptyDir, { recursive: true, force: true });
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
      `${BASE_URL}/api/plans/non-existent-plan-12345.md/content`,
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
// GET /api/search
// ============================================================================

describe("GET /api/search", () => {
  test("matches plan content not present in titles", async () => {
    // "JWT" appears only in the body of demo-feature-auth.md
    const response = await fetch(`${BASE_URL}/api/search?q=jwt`);
    const data = await response.json();
    expect(data.filenames).toEqual(["demo-feature-auth.md"]);
  });

  test("returns no matches for an empty query", async () => {
    const response = await fetch(`${BASE_URL}/api/search?q=%20`);
    expect(await response.json()).toEqual({ filenames: [] });
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
        a.localeCompare(b),
      );
      expect(data.projects).toEqual(sorted);
    }
  });
});

// ============================================================================
// POST /api/refresh
// ============================================================================

describe("POST /api/refresh", () => {
  test("returns 200 with success true and before/after counts", async () => {
    const response = await fetch(`${BASE_URL}/api/refresh`, {
      method: "POST",
    });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(typeof data.before).toBe("number");
    expect(typeof data.after).toBe("number");
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
    expect((await openFile(undefined)).status).toBe(400);
  });

  test("returns 400 for a non-JSON body", async () => {
    const response = await fetch(`${BASE_URL}/api/open`, {
      method: "POST",
      body: "not json",
    });
    expect(response.status).toBe(400);
  });

  test("returns 400 for invalid filepath (outside plans dir)", async () => {
    expect((await openFile("/etc/passwd")).status).toBe(400);
  });

  test("returns 400 for paths that escape the plans dir", async () => {
    const { plans } = await (await fetch(`${BASE_URL}/api/plans`)).json();
    const plansDir = dirname(plans[0].filepath);

    expect((await openFile(`${plansDir}/../../etc/passwd`)).status).toBe(400);
    expect((await openFile(`${plansDir}-evil/x.md`)).status).toBe(400);
    expect((await openFile(`${plansDir}/not-a-plan.md`)).status).toBe(400);
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
    expect(data.paths).toHaveProperty("/api/search");
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
