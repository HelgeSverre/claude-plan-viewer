---
title: Testing
description: Run tests and format code for Claude Plan Viewer
---

# Testing

## Running Tests

::: warning
Always use `bun run test` instead of `bun test` directly. The npm script ensures proper configuration.
:::

::: code-group

```bash [All Unit Tests]
bun run test
```

```bash [API Tests Only]
bun run test:api
```

```bash [E2E Tests (Playwright)]
bun run test:e2e
```

:::

## Code Formatting

Format all source files with Prettier:

```bash
bun run format
```

## Development Mode

Run the development server with hot module reloading:

::: code-group

```bash [Using npm script]
bun run dev
```

```bash [Direct with hot reload]
bun --hot index.ts
```

:::

### Passing CLI Flags

When running in development mode with CLI flags, use the double-dash separator:

```bash
bun run index.ts -- --from-file plans.json
```

::: tip
The `--` separator tells Bun to pass subsequent arguments to your script rather than interpreting them as Bun options.
:::
