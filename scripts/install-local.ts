#!/usr/bin/env bun
/**
 * Cross-platform script to compile and install the plans-viewer binary locally.
 * Installs to:
 * - macOS/Linux: ~/.local/bin/
 * - Windows: %LOCALAPPDATA%\Programs\
 */
import { $ } from "bun";
import { join } from "path";
import { homedir, platform } from "os";
import { copyFile, chmod, mkdir } from "fs/promises";

const plat = platform();
const binName = plat === "win32" ? "plans-viewer.exe" : "plans-viewer";

// Determine install directory
const installDir = plat === "win32"
  ? join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "Programs")
  : join(homedir(), ".local", "bin");

console.log("Building plans-viewer...");
await $`bun run build`;

console.log(`Installing to ${installDir}...`);

// Ensure install directory exists
await mkdir(installDir, { recursive: true });

// Copy binary
const src = join(import.meta.dir, "..", "dist", binName);
const dest = join(installDir, binName);
await copyFile(src, dest);

// Make executable on Unix
if (plat !== "win32") {
  await chmod(dest, 0o755);
}

console.log();
console.log(`Installed to: ${dest}`);

// Check if directory is in PATH
const pathDirs = (process.env.PATH || "").split(plat === "win32" ? ";" : ":");
const isInPath = pathDirs.some(dir => dir === installDir);

if (!isInPath) {
  console.log();
  console.log(`Add ${installDir} to your PATH to run 'plans-viewer' from anywhere.`);
  if (plat === "darwin" || plat === "linux") {
    console.log(`  export PATH="$PATH:${installDir}"`);
  }
}
