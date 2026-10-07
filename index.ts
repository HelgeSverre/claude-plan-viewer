#!/usr/bin/env bun
import { readdir, stat, watch } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join, resolve } from "node:path";
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
// Set by --from-file: plans are served from an exported JSON file instead of PLANS_DIR
let PLANS_FILE: string | undefined;

function resolveClaudeDir(cliArg?: string): string {
  return cliArg || process.env.CLAUDE_DIR || join(homedir(), ".claude");
}

function initializeDirectories(claudeDir: string): void {
  // Absolute so plan filepaths are stable for /api/open comparisons
  PLANS_DIR = resolve(claudeDir, "plans");
  PROJECTS_DIR = resolve(claudeDir, "projects");
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
  const plans = await getPlans();

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

async function loadPlansFromFile(filepath: string): Promise<LoadedPlans> {
  const data = await Bun.file(filepath).json();
  const plans: PlanMetadata[] = [];
  const contents = new Map<string, string>();

  for (const plan of data) {
    contents.set(plan.filename, plan.content || "");
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

  return { plans, contents };
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
  onLine: (line: string) => void,
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

// Accumulated across incremental scans of ~/.claude/projects session logs
const projectMapping = new Map<string, SlugMetadata>(); // plan slug -> project/session
const dirProjectNames = new Map<string, string>(); // project dir -> name from first cwd seen
const scannedJsonl = new Map<string, number>(); // JSONL path -> mtimeMs when scanned
let lastProjectScan = 0;

// Stream one session log, recording its project name and slug -> sessionId pairs.
async function scanJsonl(dir: string, filePath: string): Promise<void> {
  const slugSessions = new Map<string, string>();

  await processJsonlLineByLine(filePath, (line) => {
    if (!dirProjectNames.has(dir)) {
      const cwdMatch = line.match(/"cwd":"([^"]+)"/);
      if (cwdMatch?.[1]) {
        const cwd = cwdMatch[1].replace(/\\\\/g, "\\");
        dirProjectNames.set(dir, extractProjectName(cwd));
      }
    }

    const slugMatch = line.match(/"slug":"([\w-]+)"/);
    if (slugMatch?.[1]) {
      const sessionMatch = line.match(/"sessionId":"([^"]+)"/);
      if (sessionMatch?.[1]) {
        slugSessions.set(slugMatch[1], sessionMatch[1]);
      }
    }
  });

  const project = dirProjectNames.get(dir);
  if (!project) return;
  for (const [slug, sessionId] of slugSessions) {
    projectMapping.set(slug, { project, sessionId });
  }
}

// Map plan slugs to projects by scanning Claude Code's session logs.
// Incremental: JSONL files unchanged since the previous scan are skipped, so a
// rescan costs one stat per file plus re-reading only the logs that grew.
// Files are streamed line-by-line to keep memory bounded on multi-GB data.
async function scanProjects(): Promise<void> {
  lastProjectScan = Date.now();

  let projectDirs: string[];
  try {
    projectDirs = await readdir(PROJECTS_DIR);
  } catch {
    return; // Projects dir may not exist
  }

  for (const dir of projectDirs) {
    let files: string[];
    try {
      files = await readdir(join(PROJECTS_DIR, dir));
    } catch {
      continue; // Not a directory, or inaccessible
    }

    // Sequential to keep memory bounded
    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      const filePath = join(PROJECTS_DIR, dir, file);
      try {
        const { mtimeMs } = await stat(filePath);
        if (scannedJsonl.get(filePath) === mtimeMs) continue;
        await scanJsonl(dir, filePath);
        scannedJsonl.set(filePath, mtimeMs);
      } catch {
        // Skip unreadable files
      }
    }
  }
}

interface LoadedPlans {
  plans: PlanMetadata[];
  contents: Map<string, string>;
}

let cachedPlans: PlanMetadata[] | null = null;
let contentCache = new Map<string, string>();
let plansGeneration = 0;
let plansLoad: Promise<PlanMetadata[]> | null = null;

async function loadPlans(): Promise<LoadedPlans> {
  let filenames: string[];
  try {
    filenames = (await readdir(PLANS_DIR)).filter((f) => f.endsWith(".md"));
  } catch (err) {
    // No plans directory yet (fresh install): serve an empty list
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { plans: [], contents: new Map() };
    }
    throw err;
  }

  const files = (
    await Promise.all(
      filenames.map(async (filename) => {
        const filepath = join(PLANS_DIR, filename);
        try {
          const [content, stats] = await Promise.all([
            Bun.file(filepath).text(),
            stat(filepath),
          ]);
          return { filename, filepath, content, stats };
        } catch {
          return null; // Deleted between readdir and read
        }
      }),
    )
  ).filter((f) => f !== null);

  // Rescan session logs when a plan is unmapped and newer than the last scan.
  // Plans that stay unmapped (e.g. their session log was deleted) stop
  // triggering rescans once a scan has run after their last modification.
  const needsScan = files.some(
    (f) =>
      !projectMapping.has(f.filename.replace(/\.md$/, "")) &&
      f.stats.mtimeMs >= lastProjectScan,
  );
  if (needsScan) {
    await scanProjects();
  }

  const contents = new Map<string, string>();
  const plans = files.map(({ filename, filepath, content, stats }) => {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]
      ? titleMatch[1].replace(/^Plan:\s*/i, "")
      : filename.replace(/\.md$/, "");

    const metadata = projectMapping.get(filename.replace(/\.md$/, ""));
    contents.set(filename, content);

    return {
      filename,
      filepath,
      title,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
      lineCount: content.split("\n").length,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      project: metadata?.project || null,
      sessionId: metadata?.sessionId || null,
    };
  });

  return { plans, contents };
}

// Return cached plans, loading them once if needed. Concurrent callers share
// one in-flight load; a load that finishes after an invalidation is returned
// to its callers but not cached.
function getPlans(): Promise<PlanMetadata[]> {
  if (cachedPlans) return Promise.resolve(cachedPlans);
  if (plansLoad) return plansLoad;

  const generation = plansGeneration;
  const load = (PLANS_FILE ? loadPlansFromFile(PLANS_FILE) : loadPlans())
    .then(({ plans, contents }) => {
      if (generation === plansGeneration) {
        cachedPlans = plans;
        contentCache = contents;
      }
      return plans;
    })
    .finally(() => {
      if (plansLoad === load) plansLoad = null;
    });
  plansLoad = load;
  return load;
}

function invalidatePlansCache() {
  cachedPlans = null;
  plansLoad = null;
  plansGeneration++;
}

// Watch plans directory for changes and invalidate cache
async function watchPlansDirectory() {
  try {
    const watcher = watch(PLANS_DIR);
    for await (const event of watcher) {
      if (event.filename?.endsWith(".md")) {
        invalidatePlansCache();
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
      "/api/openapi.json": () =>
        Response.json({
          ...openapi,
          info: { ...openapi.info, version: pkg.version },
        }),
      "/api/projects": async () => {
        const plans = await getPlans();
        const projects = [
          ...new Set(plans.map((p) => p.project).filter(Boolean)),
        ] as string[];
        projects.sort((a, b) => a.localeCompare(b));

        return Response.json({ projects });
      },
      "/api/plans": async () => {
        // Metadata only - content is fetched separately via /api/plans/{filename}/content
        const plans = await getPlans();
        return Response.json({ plans });
      },
      "/api/plans/:filename/content": async (req) => {
        await getPlans();
        const content = contentCache.get(req.params.filename);

        if (content === undefined) {
          return new Response("Plan not found", { status: 404 });
        }

        return Response.json({ content });
      },
      "/api/search": async (req) => {
        // Full-text search over plan content, which the client doesn't hold
        const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase();
        if (!q) {
          return Response.json({ filenames: [] });
        }

        const plans = await getPlans();
        const filenames = plans
          .filter((p) =>
            (contentCache.get(p.filename) ?? "").toLowerCase().includes(q),
          )
          .map((p) => p.filename);

        return Response.json({ filenames });
      },
      "/api/refresh": {
        POST: async () => {
          const before = cachedPlans?.length ?? 0;
          invalidatePlansCache();
          const plans = await getPlans();
          return Response.json({ success: true, before, after: plans.length });
        },
      },
      "/api/open": {
        POST: async (req) => {
          const body = await req.json().catch(() => null);
          const filepath =
            typeof body?.filepath === "string" ? resolve(body.filepath) : null;

          // Only open known plan files: `open`/`xdg-open` would happily launch
          // apps or scripts, and the server may listen on 0.0.0.0
          const plans = await getPlans();
          if (!filepath || !plans.some((p) => p.filepath === filepath)) {
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

  if (args.fromFile) {
    if (!(await Bun.file(args.fromFile).exists())) {
      console.error(`File not found: ${args.fromFile}`);
      process.exit(1);
    }
    PLANS_FILE = args.fromFile;
  }

  if (args.json) {
    await exportPlansAsJson(args.output);
    process.exit(0);
  }

  if (
    args.port !== undefined &&
    (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535)
  ) {
    console.error("Invalid port: must be an integer between 1 and 65535");
    process.exit(1);
  }

  // Start server first; early requests share the preload below
  const port = await findAvailablePort(args.port ?? 3000);
  const server = await startServer(port, args.host);

  // Only watch for file changes when serving from the plans directory
  if (!PLANS_FILE) {
    watchPlansDirectory();
  }

  const plans = await getPlans();
  const planCount = plans.length;
  const projectCount = new Set(plans.map((p) => p.project).filter(Boolean))
    .size;

  const localUrl = `http://localhost:${server.port}/`;
  const apiUrl = `http://localhost:${server.port}/api/`;
  const dirUrl = `file://${resolve(claudeDir)}`;

  console.log(`\nclaude-plan-viewer v${pkg.version}\n`);
  console.log(`  ➜  Web:    ${link(localUrl)}`);
  console.log(`  ➜  API:    ${link(apiUrl)}`);
  if (PLANS_FILE) {
    console.log(`  ➜  Source: ${PLANS_FILE}`);
  } else {
    console.log(`  ➜  Dir:    ${link(dirUrl)} (${projectCount} projects)`);
  }
  console.log(`\n  Serving ${planCount} plans\n`);
})();
