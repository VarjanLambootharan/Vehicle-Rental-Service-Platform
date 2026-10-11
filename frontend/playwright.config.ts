import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:15173",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.VRS_BROWSER_PATH ||
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 15173",
    url: "http://127.0.0.1:15173",
    reuseExistingServer: false,
    timeout: 60000,
    env: { TRAVELER_API_TARGET: "http://127.0.0.1:18080" },
  },
});
