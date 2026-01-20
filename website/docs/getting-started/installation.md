---
title: Installation
description: Install Claude Plan Viewer using npx, bunx, npm, or standalone binaries
---

# Installation

## Choose Your Installation Method

Claude Plan Viewer offers multiple installation options to fit your workflow. Pick the one that works best for you.

### npx (Recommended)

The fastest way to run Claude Plan Viewer without any permanent installation.

```bash
npx claude-plan-viewer
```

This downloads and runs the latest version automatically. No setup required.

::: info
Requires Node.js 18+ with npm. The package will be cached locally for faster subsequent runs.
:::

### bunx

If you use Bun as your JavaScript runtime, bunx provides the same zero-install experience.

```bash
bunx claude-plan-viewer
```

::: info
Requires [Bun](https://bun.sh) runtime. Install Bun with `curl -fsSL https://bun.sh/install | bash`
:::

### Global Install

Install globally for quick access from anywhere in your terminal.

::: code-group

```bash [npm]
npm install -g claude-plan-viewer
```

```bash [bun]
bun install -g claude-plan-viewer
```

:::

Then run from any directory:

```bash
claude-plan-viewer
```

::: tip
Global installation is ideal if you frequently view your Claude Code plans.
:::

### Standalone Binary

Download a pre-built binary that works without any runtime dependencies.

**1. Download the binary**

Visit the [releases page](https://github.com/HelgeSverre/claude-plan-viewer/releases) and download the binary for your platform:

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `claude-plan-viewer-macos-arm64` |
| macOS (Intel) | `claude-plan-viewer-macos-x64` |
| Linux (x64) | `claude-plan-viewer-linux-x64` |
| Linux (ARM64) | `claude-plan-viewer-linux-arm64` |
| Windows | `claude-plan-viewer-windows-x64.exe` |

**2. Make it executable (macOS/Linux)**

```bash
chmod +x claude-plan-viewer-*
```

**3. Run the binary**

```bash
./claude-plan-viewer-macos-arm64
```

Or move it to your PATH for global access:

```bash
sudo mv claude-plan-viewer-* /usr/local/bin/claude-plan-viewer
claude-plan-viewer
```

::: info
The standalone binary is approximately 57MB. It's fully self-contained with no external dependencies and works completely offline.
:::

## Build Your Own Binary

If you prefer to build the binary yourself from source:

```bash
# Clone the repository
git clone https://github.com/HelgeSverre/claude-plan-viewer.git
cd claude-plan-viewer

# Install dependencies
bun install

# Build for your current platform
bun run build

# Run the built binary
./dist/claude-plan-viewer
```

Build for all platforms at once:

```bash
bun run build:all
```

This creates binaries in the `dist/` folder for macOS (ARM64, x64), Linux (x64, ARM64), and Windows (x64).

## Requirements

### npx / bunx / Global Install

- **Node.js 18+** with npm (for npx)
- **OR** [Bun](https://bun.sh) runtime (for bunx and bun install)
- Claude Code with plan files in `~/.claude/plans`

### Standalone Binary

- **No runtime dependencies** - the binary is fully self-contained
- Claude Code with plan files in `~/.claude/plans`

### Building from Source

- [Bun](https://bun.sh) runtime
- Git (to clone the repository)

::: warning
Claude Plan Viewer reads plan files from `~/.claude/plans`. If you don't have any plans yet, create some plans in Claude Code first, or use the `--claude-dir` flag to point to a custom directory.
:::

## Verify Installation

After installation, verify everything is working:

```bash
claude-plan-viewer --version
```

You should see the version number printed to the console.

## Next Steps

- [Quick Start](/getting-started/quickstart) - Get up and running in under a minute
- [CLI Reference](/reference/cli) - Explore all command-line options
