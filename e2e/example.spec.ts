import { test, expect } from "@playwright/test";

test.describe("Basic app", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has title", async ({ page }) => {
    await expect(page).toHaveTitle(/SBP Portal|Angular/);
  });

  test("main content visible", async ({ page }) => {
    // Wait for Angular to bootstrap — app-root gets children once the app renders
    await page.waitForFunction(
      () => (document.querySelector("app-root")?.childElementCount ?? 0) > 0,
      { timeout: 20000 }
    );
  });
});
