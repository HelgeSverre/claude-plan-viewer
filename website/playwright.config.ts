import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bunx vite",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
