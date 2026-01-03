import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3010",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun run index.ts --port 3010",
    port: 3010,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
