import { test, expect } from "@playwright/test";

test.describe("Marketing Website", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");

    // Check title
    await expect(page).toHaveTitle(/Claude Plan Viewer/);

    // Check hero section
    const hero = page.locator(".hero h1");
    await expect(hero).toContainText("friendly way to browse");

    // Check install card is visible
    const installCard = page.locator(".install-card");
    await expect(installCard).toBeVisible();
    await expect(installCard.locator("code")).toContainText("npx claude-plan-viewer");
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/");

    const nav = page.locator("nav");

    // Check all nav links
    await expect(nav.locator('a[href="#features"]')).toBeVisible();
    await expect(nav.locator('a[href="#installation"]')).toBeVisible();
    await expect(nav.locator('a[href="/docs/"]')).toBeVisible();
    await expect(nav.locator('a[href*="github.com"]')).toBeVisible();
  });

  test("docs link exists in navbar", async ({ page }) => {
    await page.goto("/");

    const docsLink = page.locator('nav a:has-text("Docs")');
    await expect(docsLink).toBeVisible();
    await expect(docsLink).toHaveAttribute("href", "/docs/");
  });

  test("features section loads", async ({ page }) => {
    await page.goto("/");

    const features = page.locator("#features");
    await expect(features).toBeVisible();

    // Check feature cards are present
    const featureCards = page.locator(".feature-card");
    const count = await featureCards.count();
    expect(count).toBe(6);
  });

  test("installation section loads", async ({ page }) => {
    await page.goto("/");

    const installation = page.locator("#installation");
    await expect(installation).toBeVisible();

    // Check install methods are present
    const installMethods = page.locator(".install-method");
    const count = await installMethods.count();
    expect(count).toBe(4);
  });

  test("copy buttons work", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");

    // Find the first copy button
    const copyBtn = page.locator(".copy-btn").first();
    await expect(copyBtn).toBeVisible();

    // Click it
    await copyBtn.click();

    // Should show "Copied!" feedback
    await expect(copyBtn).toContainText("Copied!", { timeout: 2000 });

    // Should revert after a delay
    await page.waitForTimeout(2500);
    await expect(copyBtn).toContainText("Copy");
  });

  test("screenshot image loads", async ({ page }) => {
    await page.goto("/");

    const screenshot = page.locator(".screenshot-img");
    await expect(screenshot).toBeVisible();

    // Check image loaded successfully
    const naturalWidth = await screenshot.evaluate(
      (img: HTMLImageElement) => img.naturalWidth
    );
    expect(naturalWidth).toBeGreaterThan(0);
  });

  test("footer has trademark disclaimer", async ({ page }) => {
    await page.goto("/");

    const disclaimer = page.locator(".disclaimer");
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText("Anthropic");
    await expect(disclaimer).toContainText("not affiliated");
  });

  test("responsive navigation hides on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Nav should be hidden
    const nav = page.locator("nav");
    await expect(nav).not.toBeVisible();
  });
});
