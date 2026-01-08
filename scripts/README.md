# Screenshot Generation

This directory contains utilities for generating the screenshot used in the main README.

## Prerequisites

1. Install Bun runtime: https://bun.sh
2. Install dependencies: `bun install`
3. Install Playwright browsers: `bunx playwright install chromium`

## Generating the Screenshot

The screenshot uses mock data to demonstrate the application's features.

### Step 1: Create Mock Data

Create mock plan files in `~/.claude/plans/`:

```bash
mkdir -p ~/.claude/plans ~/.claude/projects
```

Then create several sample markdown plan files in `~/.claude/plans/` with realistic content showing various features like code blocks, lists, headings, etc.

### Step 2: Create Project Metadata

Create mock project JSONL files in `~/.claude/projects/` to map plans to projects:

```bash
mkdir -p ~/.claude/projects/your-project-name
```

Create a JSONL file with entries like:
```jsonl
{"type":"init","cwd":"/path/to/your-project","timestamp":1704700000000}
{"type":"task","slug":"plan-filename-without-md","sessionId":"session-id-123","description":"Task description"}
```

### Step 3: Start the Server

```bash
bun index.ts --port 3010
```

### Step 4: Generate Screenshot

In a new terminal:

```bash
bun scripts/generate-screenshot.ts
```

This will:
1. Launch a headless browser
2. Navigate to the application
3. Wait for plans to load
4. Select the first plan
5. Take a screenshot and save it as `screenshot.png` in the root directory

## Screenshot Specifications

- Resolution: 1920x1080 (viewport)
- Device Scale: 2x (for high-DPI displays)
- Output: 3840x2160 PNG
- Browser: Chromium (Playwright)

## Customization

Edit `generate-screenshot.ts` to:
- Change viewport size
- Select different plans
- Adjust wait times
- Modify screenshot output path or format
