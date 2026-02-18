#!/usr/bin/env bun
import { readdir, stat, watch } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import index from "./src/index.html";
import apiDocs from "./src/api-docs.html";
import pkg from "./package.json";
import openapi from "./openapi.json";
import getPort, { portNumbers } from "get-port";

// Resolved at startup based on --claude-dir flag or CLAUDE_DIR env var
let PLANS_DIR: string;
let PROJECTS_DIR: string;

function resolveClaudeDir(cliArg?: string): string {
  return cliArg || process.env.CLAUDE_DIR || join(homedir(), ".claude");
}

function initializeDirectories(claudeDir: string): void {
  PLANS_DIR = join(claudeDir, "plans");
  PROJECTS_DIR = join(claudeDir, "projects");
}

interface CliArgs {
  port?: number;
  host?: string;
  json?: boolean;
  output?: string;
  fromFile?: string;
  claudeDir?: string;
  version?: boolean;
  help?: boolean;
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
    } else if (arg === "--host" || arg === "-H") {
      if (nextArg && !nextArg.startsWith("-")) {
        args.host = nextArg;
        i++;
      }
    } else if (arg === "--json" || arg === "-j") {
      args.json = true;
    } else if (arg === "--output" || arg === "-o") {
      if (nextArg && !nextArg.startsWith("-")) {
        args.output = nextArg;
        i++;
      }
    } else if (arg === "--from-file" || arg === "-f") {
      if (nextArg && !nextArg.startsWith("-")) {
        args.fromFile = nextArg;
        i++;
      }
    } else if (arg === "--claude-dir" || arg === "-c") {
      if (nextArg && !nextArg.startsWith("-")) {
        args.claudeDir = nextArg;
        i++;
      }
    } else if (arg === "--version" || arg === "-v") {
      args.version = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
claude-plan-viewer - Browse and search Claude Code plans

Usage: claude-plan-viewer [options]

Options:
  -p, --port <number>       Port to start server on (default: 3000)
  -H, --host <address>      Host to bind to (default: localhost)
                            Use 0.0.0.0 to listen on all interfaces
  -c, --claude-dir <path>   Path to .claude directory (default: ~/.claude)
                            Can also be set via CLAUDE_DIR environment variable
  -j, --json                Export all plans as JSON and exit
  -o, --output <file>       Output file for JSON export (stdout if omitted)
  -f, --from-file <file>    Load plans from JSON file instead of ~/.claude/plans
  -v, --version             Show version number
  -h, --help                Show this help message

Examples:
  claude-plan-viewer                        Start viewer on default port
  claude-plan-viewer -p 8080                Start on port 8080
  claude-plan-viewer -H 0.0.0.0             Listen on all network interfaces
  claude-plan-viewer -c /path/to/.claude    Use custom .claude directory
  claude-plan-viewer -j -o plans.json       Export plans to file
  claude-plan-viewer -f plans.json          Load plans from exported file
`);
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

async function loadPlansFromFile(filepath: string): Promise<PlanMetadata[]> {
  const file = Bun.file(filepath);
  const exists = await file.exists();

  if (!exists) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }

  const data = await file.json();
  const plans: PlanMetadata[] = [];

  for (const plan of data) {
    contentCache.set(plan.filename, plan.content || "");
    plans.push({
      filename: plan.filename,
      filepath: plan.filepath,
      title: plan.title,
      size: plan.size,
      modified: plan.modified,
      created: plan.created,
      lineCount: plan.lineCount,
      wordCount: plan.wordCount,
      project: plan.project,
      sessionId: plan.sessionId,
    });
  }

  cachedPlans = plans;
  return plans;
}

// Find an available port starting from the requested port
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  return getPort({ port: portNumbers(startPort, startPort + 100) });
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

// Extract project name from a full path (cross-platform)
// e.g., "/Users/helge/code/plans-viewer" -> "plans-viewer"
// e.g., "C:\Users\name\code\my-app" -> "my-app"
function extractProjectName(cwd: string): string {
  if (!cwd) return "";
  // Normalize: handle both / and \ separators
  const normalized = cwd.replace(/\\/g, "/");
  // Remove trailing slash
  const trimmed = normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
  // Get last segment
  const lastSlash = trimmed.lastIndexOf("/");
  return lastSlash === -1 ? trimmed : trimmed.slice(lastSlash + 1);
}

// Stream a JSONL file line-by-line without loading the entire file into memory
async function processJsonlLineByLine(
  path: string,
  onLine: (line: string) => void
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
    rl.on("error", (err) => {
      rl.close();
      reject(err);
    });
  });
}

interface SlugMetadata {
  project: string;
  sessionId: string | null;
}

interface ProjectMapping {
  [slug: string]: SlugMetadata;
}

// Build a mapping of plan slugs to project names and session IDs by scanning Claude Code's project metadata.
// Streams JSONL files line-by-line to avoid loading multi-GB project data into memory.
// Only tracks slugs that correspond to actual plan files.
async function buildProjectMapping(
  neededSlugs?: Set<string>
): Promise<ProjectMapping> {
  const mapping: ProjectMapping = {};

  try {
    const projectDirs = await readdir(PROJECTS_DIR);

    for (const dir of projectDirs) {
      const dirPath = join(PROJECTS_DIR, dir);
      try {
        const dirStats = await stat(dirPath);
        if (!dirStats.isDirectory()) continue;

        const files = await readdir(dirPath);
        const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));
        if (jsonlFiles.length === 0) continue;

        let projectName: string | null = null;
        const slugSessionMap = new Map<string, string>();

        // Process files sequentially to keep memory bounded
        for (const file of jsonlFiles) {
          try {
            await processJsonlLineByLine(join(dirPath, file), (line) => {
              // Extract project name from cwd (only need first occurrence)
              if (!projectName) {
                const cwdMatch = line.match(/"cwd":"([^"]+)"/);
                if (cwdMatch?.[1]) {
                  const cwd = cwdMatch[1].replace(/\\\\/g, "\\");
                  projectName = extractProjectName(cwd);
                }
              }

              // Extract slug-sessionId pairs, filtering to only needed slugs
              const slugMatch = line.match(/"slug":"([\w-]+)"/);
              if (
                slugMatch?.[1] &&
                (!neededSlugs || neededSlugs.has(slugMatch[1]))
              ) {
                const sessionMatch = line.match(/"sessionId":"([^"]+)"/);
                if (sessionMatch?.[1]) {
                  slugSessionMap.set(slugMatch[1], sessionMatch[1]);
                }
              }
            });
          } catch {
            // Skip unreadable files
          }
        }

        if (projectName) {
          for (const [slug, sessionId] of slugSessionMap) {
            mapping[slug] = { project: projectName, sessionId };
          }
        }
      } catch {
        // Skip inaccessible directories
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
  const files = await readdir(PLANS_DIR);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  // Build or use cached project mapping, passing needed slugs for targeted lookup
  let projectMapping: ProjectMapping;
  if (!cachedProjectMapping) {
    const neededSlugs = new Set(mdFiles.map((f) => f.replace(".md", "")));
    projectMapping = await buildProjectMapping(neededSlugs);
    cachedProjectMapping = projectMapping;
  } else {
    projectMapping = cachedProjectMapping;
  }

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

      const slug = filename.replace(".md", "");
      const lineCount = content.split("\n").length;
      const wordCount = content.split(/\s+/).filter(Boolean).length;

      const metadata = projectMapping[slug];
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
    }),
  );

  cachedPlans = plans;
  return plans;
}

// Granular cache invalidation
function invalidatePlansCache() {
  cachedPlans = null;
}

function invalidateProjectMapping() {
  cachedProjectMapping = null;
}

function invalidateContentCache(filename?: string) {
  if (filename) {
    contentCache.delete(filename);
  } else {
    contentCache.clear();
  }
}

function invalidateAllCaches() {
  invalidatePlansCache();
  invalidateProjectMapping();
  invalidateContentCache();
}

// Watch plans directory for changes and invalidate cache
async function watchPlansDirectory() {
  try {
    const watcher = watch(PLANS_DIR);
    for await (const event of watcher) {
      if (event.filename?.endsWith(".md")) {
        // Only invalidate plans metadata and the specific file's content
        // Project mapping rarely changes, keep it cached
        invalidatePlansCache();
        invalidateContentCache(event.filename);
      }
    }
  } catch {
    // Directory may not exist or watching may not be supported
  }
}

// Main server startup
async function startServer(port: number, host?: string) {

  const server = Bun.serve({
    port,
    hostname: host,
    routes: {
      "/": index,
      "/api": () => Response.redirect("/api/", 301),
      "/api/": apiDocs,
      "/api/openapi.json": () => Response.json(openapi),
      "/api/projects": async () => {
        // Lazy load cache on first request
        if (!cachedPlans) {
          await loadPlans();
        }

        const plans = cachedPlans || [];
        const projects = [
          ...new Set(plans.map((p) => p.project).filter(Boolean)),
        ] as string[];
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
        const plansWithoutContent = plans.map((p) => ({
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
          const before = cachedPlans?.length ?? 0;
          // Only invalidate plans and content; project mapping is expensive
          // to rebuild (streams all JSONL files) and rarely changes
          invalidatePlansCache();
          invalidateContentCache();
          await loadPlans();
          const after = cachedPlans?.length ?? 0;
          return Response.json({ success: true, before, after });
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
    development:
      process.env.NODE_ENV !== "production"
        ? {
            hmr: true,
            console: true,
          }
        : undefined,
  });

  return server;
}

// OSC 8 hyperlink escape sequence for clickable terminal URLs
function link(url: string, text?: string): string {
  return `\x1b]8;;${url}\x07${text ?? url}\x1b]8;;\x07`;
}

// Main entry point
(async () => {
  const args = parseCliArgs();

  if (args.version) {
    console.log(`claude-plan-viewer v${pkg.version}`);
    process.exit(0);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Initialize directory paths based on --claude-dir flag or CLAUDE_DIR env var
  const claudeDir = resolveClaudeDir(args.claudeDir);
  initializeDirectories(claudeDir);

  if (args.json) {
    await exportPlansAsJson(args.output);
    process.exit(0);
  }

  // Start server first
  const port = await findAvailablePort(args.port ?? 3000);
  const server = await startServer(port, args.host);

  // Pre-load plans from file or directory
  let planCount: number;
  let projectCount = 0;
  let sourceDisplay: string;

  if (args.fromFile) {
    const plans = await loadPlansFromFile(args.fromFile);
    planCount = plans.length;
    sourceDisplay = args.fromFile;
  } else {
    sourceDisplay = PLANS_DIR;
    // Only watch for file changes when not using --from-file
    watchPlansDirectory();

    await loadPlans();

    const projects = new Set(
      (cachedPlans || []).map((p) => p.project).filter(Boolean)
    );
    projectCount = projects.size;
    planCount = cachedPlans?.length ?? 0;
  }

  const localUrl = `http://localhost:${server.port}/`;
  const apiUrl = `http://localhost:${server.port}/api/`;
  const dirUrl = `file://${claudeDir}`;

  console.log(`\nclaude-plan-viewer v${pkg.version}\n`);
  console.log(`  ➜  Web:    ${link(localUrl)}`);
  console.log(`  ➜  API:    ${link(apiUrl)}`);
  if (args.fromFile) {
    console.log(`  ➜  Source: ${sourceDisplay}`);
  } else {
    console.log(`  ➜  Dir:    ${link(dirUrl)} (${projectCount} projects)`);
  }
  console.log(`\n  Serving ${planCount} plans\n`);
})();
