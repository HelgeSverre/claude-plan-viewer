---
title: Building
description: Build Claude Plan Viewer from source for your platform
---

# Building

## Prerequisites

Claude Plan Viewer requires **Bun** as its runtime and build tool.

Visit [bun.sh](https://bun.sh) for installation instructions for your platform.

## Install Dependencies

Before building, install all project dependencies:

```bash
bun install
```

## Build Commands

::: code-group

```bash [Current Platform]
bun run build
```

```bash [All Platforms]
bun run build:all
```

:::

### Platform-Specific Builds

Build standalone binaries for specific platforms:

::: code-group

```bash [macOS Apple Silicon]
bun run build:macos-arm64
```

```bash [macOS Intel]
bun run build:macos-x64
```

```bash [Linux x64]
bun run build:linux-x64
```

```bash [Linux ARM64]
bun run build:linux-arm64
```

```bash [Windows x64]
bun run build:windows
```

:::

### Clean Build Artifacts

Remove the `dist` folder and all build artifacts:

```bash
bun run clean
```

## Local Development Linking

For local development, you can create a global symlink to run `claude-plan-viewer` from anywhere:

::: code-group

```bash [Create Symlink]
bun run install:link
```

```bash [Remove Symlink]
bun run uninstall:link
```

:::

::: info
After running `install:link`, you can use `claude-plan-viewer` as a global command in your terminal.
:::
