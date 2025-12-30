#!/usr/bin/env bun
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import index from "./index.html";

const PLANS_DIR = join(homedir(), ".claude", "plans");

// Parse --port from command line arguments (undefined = auto-assign)
function getPort(): number | undefined {
  const args = process.argv;
  const portIndex = args.indexOf("--port");
  const portArg = args[portIndex + 1];
  if (portIndex !== -1 && portArg) {
    const port = parseInt(portArg, 10);
    if (!isNaN(port)) return port;
  }
  return undefined;
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

function extractProject(content: string): string | null {
  // Match paths like /Users/*/code/projectname/...
  const codeMatch = content.match(/\/Users\/\w+\/code\/([\w.-]+)/);
  if (codeMatch?.[1]) return codeMatch[1];

  // Match paths like /private/var/.../projectname/... (temp dirs)
  const privateMatch = content.match(/\/private\/var\/[\w\/-]+\/([\w.-]+)\/(?:src|lib|app|test)/);
  if (privateMatch?.[1]) return privateMatch[1];

  // Match common project structure paths
  const structMatch = content.match(/`([^`\/]+)\/(?:src|lib|app|docs|tests?|spec)\/[^`]+`/);
  if (structMatch?.[1]) return structMatch[1];

  return null;
}

async function loadPlans(): Promise<Plan[]> {
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

      return {
        filename,
        filepath,
        title,
        content,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        lineCount: content.split("\n").length,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        project: extractProject(content),
      };
    })
  );

  return plans.sort(
    (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );
}

const server = Bun.serve({
  port: getPort(),
  routes: {
    "/": index,
    "/api/plans": async () => {
      const plans = await loadPlans();
      return Response.json(plans);
    },
    "/api/open": {
      POST: async (req) => {
        const { filepath } = await req.json();
        if (!filepath || !filepath.startsWith(PLANS_DIR)) {
          return new Response("Invalid path", { status: 400 });
        }
        try {
          // Open in default editor using 'open' command on macOS
          await Bun.$`open ${filepath}`;
          return Response.json({ success: true });
        } catch {
          return new Response("Failed to open file", { status: 500 });
        }
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

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

// Startup output
(async () => {
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
