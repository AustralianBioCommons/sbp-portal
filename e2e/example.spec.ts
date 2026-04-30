import { test, expect } from "@playwright/test";

test.describe("Basic app", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has title", async ({ page }) => {
    await expect(page).toHaveTitle(/Structural Biology Platform Portal/);
  });

  test("main content visible", async ({ page }) => {
    const content = page.locator("app-root");
    await expect(content).toBeVisible();
  });
});
