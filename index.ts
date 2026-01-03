#!/usr/bin/env bun
import { readdir, stat, watch } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import index from "./index.html";
import prismBundlePath from "./prism.bundle.js" with { type: "file" };

const PLANS_DIR = join(homedir(), ".claude", "plans");
const PROJECTS_DIR = join(homedir(), ".claude", "projects");

interface CliArgs {
  port?: number;
  json?: boolean;
  output?: string;
}

function parseCliArgs(): CliArgs {
  const args: CliArgs = {};
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];

    if (arg === "--port" || arg === "-p") {
      if (nextArg && !nextArg.startsWith("-")) {
        args.port = parseInt(nextArg, 10);
        i++;
      }
    } else if (arg === "--json" || arg === "-j") {
      args.json = true;
    } else if (arg === "--output" || arg === "-o") {
      if (nextArg && !nextArg.startsWith("-")) {
        args.output = nextArg;
        i++;
      }
    }
  }

  return args;
}

async function exportPlansAsJson(outputPath?: string): Promise<void> {
  const plans = await loadPlans();

  const plansWithContent = plans.map((plan) => ({
    ...plan,
    content: contentCache.get(plan.filename) || "",
  }));

  const jsonOutput = JSON.stringify(plansWithContent, null, 2);

  if (outputPath) {
    await Bun.write(outputPath, jsonOutput);
    console.log(`Exported ${plans.length} plans to ${outputPath}`);
  } else {
    console.log(jsonOutput);
  }
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

interface PlanMetadata {
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

interface Plan extends PlanMetadata {
  content: string;
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
  if (!match || !match[1]) return null;
  // Unescape JSON string (convert \\\\ to \\)
  return match[1].replace(/\\\\/g, "\\");
}

// Extract slug -> sessionId mapping from JSONL content
// Each line in JSONL may contain both "slug" and "sessionId" fields
function extractSlugSessionMap(content: string): Map<string, string> {
  if (!content) return new Map();
  const slugSessionMap = new Map<string, string>();

  // Process each line to find slug and sessionId pairs
  const lines = content.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;

    const slugMatch = line.match(/"slug":"([\w-]+)"/);
    const sessionMatch = line.match(/"sessionId":"([^"]+)"/);

    if (slugMatch && slugMatch[1] && sessionMatch && sessionMatch[1]) {
      slugSessionMap.set(slugMatch[1], sessionMatch[1]);
    }
  }

  return slugSessionMap;
}

// Extract unique slugs from JSONL content (for backwards compatibility)
function extractSlugsFromJsonl(content: string): string[] {
  if (!content) return [];
  const slugs = new Set<string>();
  const matches = content.matchAll(/"slug":"([\w-]+)"/g);
  for (const match of matches) {
    if (match[1]) {
      slugs.add(match[1]);
    }
  }
  return Array.from(slugs);
}

interface SlugMetadata {
  project: string;
  sessionId: string | null;
}

interface ProjectMapping {
  [slug: string]: SlugMetadata;
}

// Build a mapping of plan slugs to project names and session IDs by scanning Claude Code's project metadata
async function buildProjectMapping(): Promise<ProjectMapping> {
  const mapping: ProjectMapping = {};

  try {
    const projectDirs = await readdir(PROJECTS_DIR);

    for (const dir of projectDirs) {
      const dirPath = join(PROJECTS_DIR, dir);
      const dirStats = await stat(dirPath);
      if (!dirStats.isDirectory()) continue;

      // Find JSONL files and extract cwd + slugs + sessionIds
      const files = await readdir(dirPath);
      const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

      let projectName: string | null = null;
      const slugSessionMap = new Map<string, string>();

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

          // Collect slug -> sessionId mappings
          const fileSlugSessions = extractSlugSessionMap(content);
          for (const [slug, sessionId] of fileSlugSessions) {
            slugSessionMap.set(slug, sessionId);
          }
        } catch {
          // Skip files that can't be read
        }
      }

      // Map all slugs to this project with their session IDs
      if (projectName) {
        for (const [slug, sessionId] of slugSessionMap) {
          mapping[slug] = {
            project: projectName,
            sessionId: sessionId,
          };
        }
      }
    }
  } catch {
    // Projects dir may not exist, return empty mapping
  }

  return mapping;
}

let cachedPlans: PlanMetadata[] | null = null;
let cachedProjectMapping: ProjectMapping | null = null;
const contentCache = new Map<string, string>();

async function loadPlans(): Promise<PlanMetadata[]> {
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

      const metadata = projectMapping[slug];
      // Cache content separately for search and lazy loading
      contentCache.set(filename, content);

      return {
        filename,
        filepath,
        title,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        lineCount,
        wordCount,
        project: metadata?.project || null,
        sessionId: metadata?.sessionId || null,
      };
    })
  );

  cachedPlans = plans;
  return plans;
}

function invalidateCache() {
  cachedPlans = null;
  cachedProjectMapping = null;
  contentCache.clear();
}

// Watch plans directory for changes and invalidate cache
async function watchPlansDirectory() {
  try {
    const watcher = watch(PLANS_DIR);
    for await (const event of watcher) {
      if (event.filename?.endsWith(".md")) {
        invalidateCache();
      }
    }
  } catch {
    // Directory may not exist or watching may not be supported
  }
}

// Main server startup
async function startServer() {
  const args = parseCliArgs();
  const port = await findAvailablePort(args.port ?? 3000);

  const server = Bun.serve({
    port,
    routes: {
      "/": index,
      "/api/projects": async () => {
        // Lazy load cache on first request
        if (!cachedPlans) {
          await loadPlans();
        }

        const plans = cachedPlans || [];
        const projects = [...new Set(plans.map(p => p.project).filter(Boolean))] as string[];
        projects.sort((a, b) => a.localeCompare(b));

        return Response.json({ projects });
      },
      "/api/plans": async (req) => {
        // Lazy load cache on first request
        if (!cachedPlans) {
          await loadPlans();
        }

        const plans = cachedPlans || [];

        // Strip content from response - will be fetched separately via /api/plans/{id}/content
        const plansWithoutContent = plans.map(p => ({
          filename: p.filename,
          filepath: p.filepath,
          title: p.title,
          size: p.size,
          modified: p.modified,
          created: p.created,
          lineCount: p.lineCount,
          wordCount: p.wordCount,
          project: p.project,
          sessionId: p.sessionId,
        }));

        return Response.json({
          plans: plansWithoutContent,
        });
      },
      "/api/plans/:filename/content": async (req) => {
        // Lazy load cache on first request
        if (!cachedPlans) {
          await loadPlans();
        }

        const filename = req.params.filename as string;
        const content = contentCache.get(filename);

        if (content === undefined) {
          return new Response("Plan not found", { status: 404 });
        }

        return Response.json({ content });
      },
      "/api/refresh": {
        POST: async () => {
          invalidateCache();
          await loadPlans();
          return Response.json({ success: true });
        },
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
  const args = parseCliArgs();

  if (args.json) {
    await exportPlansAsJson(args.output);
    process.exit(0);
  }

  const server = await startServer();
  const planCount = (await readdir(PLANS_DIR)).filter(f => f.endsWith('.md')).length;

  // Start watching for file changes (runs in background)
  watchPlansDirectory();

  console.log();
  console.log(`${c.bold}${c.magenta}  📋 Plans Viewer${c.reset}`);
  console.log(`${c.dim}  ─────────────────────────────${c.reset}`);
  console.log(`${c.green}  ✓${c.reset} Server running`);
  console.log(`${c.green}  ✓${c.reset} Watching for file changes`);
  console.log();
  console.log(`${c.dim}  Local:${c.reset}   ${c.cyan}${c.bold}http://localhost:${server.port}${c.reset}`);
  console.log(`${c.dim}  Plans:${c.reset}   ${c.yellow}${planCount} plans${c.reset} in ${c.dim}${PLANS_DIR}${c.reset}`);
  console.log();
})();
