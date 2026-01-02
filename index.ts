#!/usr/bin/env bun
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import index from "./index.html";
import prismBundlePath from "./prism.bundle.js" with { type: "file" };

const PLANS_DIR = join(homedir(), ".claude", "plans");
const PROJECTS_DIR = join(homedir(), ".claude", "projects");

// Parse --port from command line arguments (undefined = auto-assign)
function getRequestedPort(): number | undefined {
  const args = process.argv;
  const portIndex = args.indexOf("--port");
  const portArg = args[portIndex + 1];
  if (portIndex !== -1 && portArg) {
    const port = parseInt(portArg, 10);
    if (!isNaN(port)) return port;
  }
  return undefined;
}

// Find an available port starting from the requested port
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  let port = startPort;
  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const testServer = Bun.serve({
        port,
        fetch: () => new Response(),
      });
      testServer.stop();
      return port;
    } catch {
      port++;
    }
  }
  throw new Error(`No available port found in range ${startPort}-${startPort + maxAttempts}`);
}

// Cross-platform open file in default editor
async function openInEditor(filepath: string): Promise<void> {
  const platform = process.platform;
  if (platform === "darwin") {
    await Bun.$`open ${filepath}`;
  } else if (platform === "win32") {
    await Bun.$`cmd /c start "" ${filepath}`;
  } else {
    await Bun.$`xdg-open ${filepath}`;
  }
}

interface Plan {
  filename: string;
  filepath: string;
  title: string;
  content: string;
  size: number;
  modified: string;
  created: string;
  lineCount: number;
  wordCount: number;
  project: string | null;
}

// Extract project name from a full path (cross-platform)
// e.g., "/Users/helge/code/plans-viewer" -> "plans-viewer"
// e.g., "C:\Users\name\code\my-app" -> "my-app"
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

// Extract cwd (working directory) from JSONL content
function extractCwdFromJsonl(content: string): string | null {
  if (!content) return null;
  const match = content.match(/"cwd":"([^"]+)"/);
  if (!match) return null;
  // Unescape JSON string (convert \\\\ to \\)
  return match[1].replace(/\\\\/g, "\\");
}

// Extract unique slugs from JSONL content
function extractSlugsFromJsonl(content: string): string[] {
  if (!content) return [];
  const slugs = new Set<string>();
  const matches = content.matchAll(/"slug":"([\w-]+)"/g);
  for (const match of matches) {
    slugs.add(match[1]);
  }
  return Array.from(slugs);
}

interface ProjectMapping {
  [slug: string]: string; // plan slug -> project name
}

// Build a mapping of plan slugs to project names by scanning Claude Code's project metadata
async function buildProjectMapping(): Promise<ProjectMapping> {
  const mapping: ProjectMapping = {};

  try {
    const projectDirs = await readdir(PROJECTS_DIR);

    for (const dir of projectDirs) {
      const dirPath = join(PROJECTS_DIR, dir);
      const dirStats = await stat(dirPath);
      if (!dirStats.isDirectory()) continue;

      // Find JSONL files and extract cwd + slugs
      const files = await readdir(dirPath);
      const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

      let projectName: string | null = null;
      const allSlugs: string[] = [];

      for (const file of jsonlFiles) {
        try {
          const content = await Bun.file(join(dirPath, file)).text();

          // Get project name from cwd (only need to find it once)
          if (!projectName) {
            const cwd = extractCwdFromJsonl(content);
            if (cwd) {
              projectName = extractProjectName(cwd);
            }
          }

          // Collect all slugs
          const slugs = extractSlugsFromJsonl(content);
          allSlugs.push(...slugs);
        } catch {
          // Skip files that can't be read
        }
      }

      // Map all slugs to this project
      if (projectName) {
        for (const slug of allSlugs) {
          mapping[slug] = projectName;
        }
      }
    }
  } catch {
    // Projects dir may not exist, return empty mapping
  }

  return mapping;
}

let cachedPlans: Plan[] | null = null;
let cachedProjectMapping: ProjectMapping | null = null;

async function loadPlans(): Promise<Plan[]> {
  // Build or use cached project mapping
  let projectMapping: ProjectMapping;
  if (!cachedProjectMapping) {
    projectMapping = await buildProjectMapping();
    cachedProjectMapping = projectMapping;
  } else {
    projectMapping = cachedProjectMapping;
  }

  const files = await readdir(PLANS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  const plans = await Promise.all(
    mdFiles.map(async (filename) => {
      const filepath = join(PLANS_DIR, filename);
      const file = Bun.file(filepath);

      const [content, stats] = await Promise.all([
        file.text(),
        stat(filepath),
      ]);

      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch?.[1]
        ? titleMatch[1].replace(/^Plan:\s*/i, "")
        : filename.replace(".md", "");

      // Look up project from metadata using plan slug (filename without .md)
      const slug = filename.replace(".md", "");
      const lineCount = content.split("\n").length;
      const wordCount = content.split(/\s+/).filter(Boolean).length;

      return {
        filename,
        filepath,
        title,
        content,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        lineCount,
        wordCount,
        project: projectMapping[slug] || null,
      };
    })
  );

  const sorted = plans.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );
  cachedPlans = sorted;

  return sorted;
}

// Main server startup
async function startServer() {
  const requestedPort = getRequestedPort();
  const port = await findAvailablePort(requestedPort ?? 3000);

  const server = Bun.serve({
    port,
    static: {
      "/prism.bundle.js": Bun.file(prismBundlePath),
    },
    routes: {
      "/": index,
      "/api/plans": async (req) => {
        // Lazy load cache on first request
        if (!cachedPlans) {
          await loadPlans();
        }

        const url = new URL(req.url);
        const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
        const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

        const plans = cachedPlans || [];
        const sliced = plans.slice(offset, offset + limit);

        // Strip content from response - will be fetched separately via /api/plans/{id}/content
        const plansWithoutContent = sliced.map(p => ({
          filename: p.filename,
          filepath: p.filepath,
          title: p.title,
          size: p.size,
          modified: p.modified,
          created: p.created,
          lineCount: p.lineCount,
          wordCount: p.wordCount,
          project: p.project,
        }));

        return Response.json({
          plans: plansWithoutContent,
          total: plans.length,
          offset,
          limit,
        });
      },
      "/api/plans/:filename/content": async (req) => {
        // Lazy load cache on first request
        if (!cachedPlans) {
          await loadPlans();
        }

        const filename = req.params.filename as string;
        const plans = cachedPlans || [];
        const plan = plans.find(p => p.filename === filename);

        if (!plan) {
          return new Response("Plan not found", { status: 404 });
        }

        return Response.json({ content: plan.content });
      },
      "/api/open": {
        POST: async (req) => {
          const { filepath } = await req.json();
          if (!filepath || !filepath.startsWith(PLANS_DIR)) {
            return new Response("Invalid path", { status: 400 });
          }
          try {
            await openInEditor(filepath);
            return Response.json({ success: true });
          } catch {
            return new Response("Failed to open file", { status: 500 });
          }
        },
      },
    },
    development: process.env.NODE_ENV !== "production" ? {
      hmr: true,
      console: true,
    } : undefined,
  });

  return server;
}

// ANSI color codes
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};

// Main entry point
(async () => {
  const server = await startServer();
  const planCount = (await readdir(PLANS_DIR)).filter(f => f.endsWith('.md')).length;
  console.log();
  console.log(`${c.bold}${c.magenta}  📋 Plans Viewer${c.reset}`);
  console.log(`${c.dim}  ─────────────────────────────${c.reset}`);
  console.log(`${c.green}  ✓${c.reset} Server running`);
  console.log();
  console.log(`${c.dim}  Local:${c.reset}   ${c.cyan}${c.bold}http://localhost:${server.port}${c.reset}`);
  console.log(`${c.dim}  Plans:${c.reset}   ${c.yellow}${planCount} plans${c.reset} in ${c.dim}${PLANS_DIR}${c.reset}`);
  console.log();
})();
