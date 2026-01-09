Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun run test` instead of `jest` or `vitest` (NOT `bun test` directly)
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun run test` to run tests (NOT `bun test` directly).

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Releasing

This project uses semantic versioning and conventional commits.

### Version Format

- `vMAJOR.MINOR.PATCH` (e.g., v1.2.0)
- Minor bumps for new features
- Patch bumps for bug fixes
- Major bumps for breaking changes

### Commit Convention

- `feat(scope):` - New features (-> Added in changelog)
- `fix(scope):` - Bug fixes (-> Fixed in changelog)
- `chore(scope):` - Maintenance tasks
- `docs(scope):` - Documentation changes
- `test(scope):` - Test additions/changes
- `style(scope):` - Code style changes
- `refactor(scope):` - Code refactoring
- `build(scope):` - Build system changes

### Release Process

Run `/release` to automate the release (default: minor bump), or `/release patch` for a patch release.

**Manual process:**

1. Run tests: `bun run test`
2. Verify build: `bun run build`
3. Commit any unstaged changes (conventional commits)
4. Update version in `package.json`
5. Update `CHANGELOG.md` with new version section
6. Commit: `chore(release): vX.Y.Z - summary`
7. Tag: `git tag vX.Y.Z`
8. Push: `git push && git push --tags`
9. Create GitHub release: `gh release create vX.Y.Z --title "vX.Y.Z" --notes "..."`
