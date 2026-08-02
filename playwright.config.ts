import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "npm run server",
      url: "http://localhost:3001/api/progress?playerId=e2e-ping",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
