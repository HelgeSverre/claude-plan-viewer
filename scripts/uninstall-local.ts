#!/usr/bin/env bun
/**
 * Cross-platform script to uninstall the claude-plan-viewer binary.
 * Removes from:
 * - macOS/Linux: ~/.local/bin/
 * - Windows: %LOCALAPPDATA%\Programs\
 */
import { join } from "path";
import { homedir, platform } from "os";
import { unlink, access } from "fs/promises";

const plat = platform();
const binName =
  plat === "win32" ? "claude-plan-viewer.exe" : "claude-plan-viewer";

// Determine install directory
const installDir =
  plat === "win32"
    ? join(
        process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
        "Programs",
      )
    : join(homedir(), ".local", "bin");

const binPath = join(installDir, binName);

try {
  await access(binPath);
  await unlink(binPath);
  console.log(`Removed: ${binPath}`);
} catch (err: unknown) {
  if ((err as NodeJS.ErrnoException).code === "ENOENT") {
    console.log(`Not installed: ${binPath}`);
  } else {
    throw err;
  }
}
