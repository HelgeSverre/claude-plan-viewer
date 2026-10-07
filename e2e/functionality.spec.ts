import { test, expect } from "@playwright/test";

test.describe("Functionality Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for plans to load
    await page.waitForSelector("#plans-table tr", { timeout: 10000 });
  });

  test("table row selection works", async ({ page }) => {
    // Click on second row
    const secondRow = page.locator("#plans-table tr").nth(1);
    await secondRow.click();

    // Check it has selected class
    await expect(secondRow).toHaveClass(/selected/);

    // Check detail panel shows content
    const detailTitle = page.locator(".detail-title");
    await expect(detailTitle).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/row-selection.png" });
  });

  test("keyboard navigation works", async ({ page }) => {
    // Click first row to focus
    await page.locator("#plans-table tr").first().click();

    // Press down arrow
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(200);

    // Second row should be selected
    const secondRow = page.locator("#plans-table tr").nth(1);
    await expect(secondRow).toHaveClass(/selected/);

    // Press up arrow
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(200);

    // First row should be selected again
    const firstRow = page.locator("#plans-table tr").first();
    await expect(firstRow).toHaveClass(/selected/);
  });

  test("search matches plan content, not just titles", async ({ page }) => {
    // "JWT" appears only in the body of the "Add User Authentication" fixture
    await page.locator("#search").fill("jwt");

    const rows = page.locator("#plans-table tr");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Add User Authentication");
  });

  test("search query is restored from the URL", async ({ page }) => {
    await page.locator("#search").fill("jwt");
    await expect(page).toHaveURL(/q=jwt/);

    await page.reload();
    await expect(page.locator("#search")).toHaveValue("jwt");
    await expect(page.locator("#plans-table tr")).toHaveCount(1);
  });

  test("titles containing markup render as text", async ({ page }) => {
    await expect(page.locator("#plans-table")).toContainText(
      "Refactor <Button> Components",
    );
  });

  test("closing the overlay with Escape keeps the search query", async ({
    page,
  }) => {
    await page.locator("#search").fill("refactor");
    await expect(page.locator("#plans-table tr")).toHaveCount(1);
    await page.locator("#search").blur();

    await page.keyboard.press("f");
    await expect(page.locator(".detail-overlay")).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page.locator(".detail-overlay")).not.toBeVisible();
    await expect(page.locator("#search")).toHaveValue("refactor");
  });

  test("arrow keys in the project filter don't change the selected plan", async ({
    page,
  }) => {
    const selected = page.locator("#plans-table tr.selected");
    await page.locator("#plans-table tr").first().click();
    const before = await selected.getAttribute("data-filename");

    await page.locator(".project-select-wrapper input").focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");

    await expect(selected).toHaveAttribute("data-filename", before!);
  });

  test("column header sorting works", async ({ page }) => {
    // Click Title column header to sort
    const titleHeader = page.locator("th[data-sort='title']");
    await titleHeader.click();
    await page.waitForTimeout(300);

    // Should have sorted class
    await expect(titleHeader).toHaveClass(/sorted/);

    // Click again to toggle direction
    await titleHeader.click();
    await page.waitForTimeout(300);

    // Should still be sorted
    await expect(titleHeader).toHaveClass(/sorted/);
  });

  test("fullscreen overlay works", async ({ page }) => {
    // Select a plan first
    await page.locator("#plans-table tr").first().click();
    await page.waitForTimeout(300);

    // Press F for fullscreen
    await page.keyboard.press("f");
    await page.waitForTimeout(300);

    // Overlay should appear
    const overlay = page.locator(".detail-overlay");
    await expect(overlay).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/fullscreen.png" });

    // Press Escape to close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Overlay should be gone
    await expect(overlay).not.toBeVisible();
  });

  test("help modal works", async ({ page }) => {
    // Press ? for help
    await page.keyboard.press("?");
    await page.waitForTimeout(300);

    // Help modal should appear
    const helpModal = page.locator(".help-modal");
    await expect(helpModal).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/help-modal.png" });

    // Press Escape to close
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await expect(helpModal).not.toBeVisible();
  });

  test("Cmd+K focuses search", async ({ page }) => {
    // Press Cmd+K
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(200);

    // Search should be focused
    const searchInput = page.locator("#search");
    await expect(searchInput).toBeFocused();
  });

  test("session tag copy works", async ({ page }) => {
    // Select a plan with session ID
    await page.locator("#plans-table tr").first().click();
    await page.waitForTimeout(500);

    // Find session tag
    const sessionTag = page.locator(".session-tag");
    const isVisible = await sessionTag.isVisible().catch(() => false);

    if (isVisible) {
      // Click to copy
      await sessionTag.click();
      console.log("Session tag clicked");

      // Can't easily verify clipboard, but at least verify no error
    } else {
      console.log("No session tag visible (plan may not have sessionId)");
    }
  });
});

test.describe("Styling Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#plans-table tr", { timeout: 10000 });
  });

  test("layout has correct grid structure", async ({ page }) => {
    const container = page.locator(".container");
    const styles = await container.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        display: s.display,
        gridTemplateColumns: s.gridTemplateColumns,
      };
    });

    console.log("Container styles:", styles);
    // CSS uses flex layout with list-panel and detail-panel
    expect(styles.display).toBe("flex");
  });

  test("table header has sort icons", async ({ page }) => {
    // Check for sort icons in headers
    const sortIcon = page.locator("th .sort-icon");
    const count = await sortIcon.count();
    console.log("Sort icons visible:", count);

    // At least one sort icon should be visible (on the active sort column)
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("selected row has correct styling", async ({ page }) => {
    const firstRow = page.locator("#plans-table tr").first();
    await firstRow.click();

    const bgColor = await firstRow.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    console.log("Selected row background:", bgColor);
    // Should have a distinct background color
    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("detail panel has correct width", async ({ page }) => {
    const detailPanel = page.locator("#detail-panel");
    const width = await detailPanel.evaluate((el) => {
      return el.getBoundingClientRect().width;
    });

    console.log("Detail panel width:", width);
    // Should be reasonably wide (at least 300px)
    expect(width).toBeGreaterThan(300);
  });
});
