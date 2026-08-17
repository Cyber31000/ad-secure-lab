import { defineConfig, devices } from '@playwright/test';

// Chromium only, deliberately: the File System Access API and the OPFS VFS this
// application depends on exist nowhere else. See research.md R-002.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    // Every spec starts from an empty OPFS — the clean-profile run Constitution
    // Principle II asks for.
    contextOptions: { storageState: undefined },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use the Chromium already present in this environment rather than
        // downloading a second copy. Drop this override on a machine where
        // `npx playwright install` has run.
        launchOptions: process.env.CHROMIUM_PATH
          ? { executablePath: process.env.CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
