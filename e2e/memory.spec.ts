import { test, expect, type Page } from "@playwright/test";

// Fixtures (test/fixtures/projects):
// - web-app: MEMORY.md + 3 linked topics + 1 orphan (old-deploy-notes.md) and a
//   dangling index link (release-checklist.md). no-presentational-tests was
//   written in the session of the "Add User Authentication" plan.
// - cli-tool: a single legacy MEMORY.md

const memoryRows = (page: Page) =>
  page.locator("#memory-table tr[data-memory-id]");
const memoryRow = (page: Page, name: string) =>
  memoryRows(page).filter({ hasText: name });
const detailTitle = (page: Page) => page.locator(".detail-title");

async function openMemoryView(page: Page) {
  await page.goto("/");
  await page.waitForSelector("#plans-table tr");
  await page.getByRole("tab", { name: /Memory/ }).click();
  await expect(memoryRows(page).first()).toBeVisible();
}

test.describe("Memory view", () => {
  test("lists memories grouped by project", async ({ page }) => {
    await openMemoryView(page);

    await expect(page).toHaveURL(/view=memory/);
    await expect(page.getByRole("tab", { name: /Memory/ })).toContainText("4");
    await expect(page.locator(".memory-group-row")).toHaveCount(2);
    // Alphabetical, like the server returns them
    await expect(page.locator(".memory-group-row")).toContainText([
      "cli-tool",
      "web-app",
    ]);
    await expect(memoryRows(page)).toHaveCount(6);
    // Descriptions containing markup render as text
    await expect(memoryRow(page, "zsh-gotchas")).toContainText(
      "Never name a variable <path>; it clobbers $PATH",
    );
  });

  test("shows a memory's metadata and rendered body", async ({ page }) => {
    await openMemoryView(page);
    await memoryRow(page, "no-presentational-tests").click();

    await expect(detailTitle(page)).toHaveText("no-presentational-tests");
    const meta = page.locator(".detail-meta");
    await expect(meta).toContainText("feedback");
    await expect(meta).toContainText("web-app");
    await expect(meta).toContainText("no-presentational-tests.md");
    await expect(page.locator(".memory-description")).toHaveText(
      "Never assert markup, CSS classes or UI copy; test behaviour only",
    );
    const body = page.locator(".detail-content");
    await expect(body).toContainText(
      "markup assertions broke on every restyle",
    );
    await expect(body).not.toContainText("originSessionId");
  });

  test("wikilinks and backlinks navigate between memories", async ({
    page,
  }) => {
    await openMemoryView(page);
    await memoryRow(page, "no-presentational-tests").click();

    await page
      .locator(".detail-content")
      .getByRole("link", { name: "testing-strategy" })
      .click();
    await expect(detailTitle(page)).toHaveText("testing-strategy");

    await page
      .locator(".memory-backlinks")
      .getByRole("link", { name: "no-presentational-tests" })
      .click();
    await expect(detailTitle(page)).toHaveText("no-presentational-tests");
  });

  test("index shows its load budget, orphans and dangling links", async ({
    page,
  }) => {
    await openMemoryView(page);
    await memoryRows(page)
      .filter({ hasText: "MEMORY.md" })
      .filter({ hasText: "web-app" })
      .click();

    await expect(page.locator(".memory-budget")).toContainText(
      "4 of 200 lines",
    );
    const warnings = page.locator(".memory-index-summary");
    await expect(warnings).toContainText("old-deploy-notes.md");
    await expect(warnings).toContainText("release-checklist.md");

    // Index links open the topic they point to
    await page
      .locator(".detail-content")
      .getByRole("link", { name: "Testing strategy" })
      .click();
    await expect(detailTitle(page)).toHaveText("testing-strategy");
  });

  test("search matches memory content", async ({ page }) => {
    await openMemoryView(page);
    await page.locator("#search").fill("kumquat");

    await expect(memoryRows(page)).toHaveCount(1);
    await expect(memoryRows(page).first()).toContainText("testing-strategy");
  });

  test("type filter narrows the list", async ({ page }) => {
    await openMemoryView(page);
    await page.getByRole("button", { name: /^feedback/ }).click();

    await expect(memoryRows(page)).toHaveCount(1);
    await expect(memoryRows(page).first()).toContainText(
      "no-presentational-tests",
    );
    await expect(page).toHaveURL(/type=feedback/);
  });

  test("view and selection are restored from the URL", async ({ page }) => {
    await openMemoryView(page);
    await memoryRow(page, "testing-strategy").click();
    await expect(page).toHaveURL(/memory=/);

    await page.reload();
    await expect(detailTitle(page)).toHaveText("testing-strategy");
    await expect(page.getByRole("tab", { name: /Memory/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("plans link to their project's memory and back", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("#plans-table tr")
      .filter({ hasText: "Add User Authentication" })
      .click();

    await page.getByRole("button", { name: "4 memories" }).click();
    await expect(page.getByRole("tab", { name: /Memory/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Filtered to the plan's project
    await expect(page.locator(".memory-group-row")).toHaveCount(1);
    await expect(page.locator(".memory-group-row")).toContainText("web-app");

    await memoryRow(page, "no-presentational-tests").click();
    await page.getByRole("link", { name: "Add User Authentication" }).click();
    await expect(page.getByRole("tab", { name: /Plans/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(detailTitle(page)).toHaveText("Add User Authentication");
  });

  test("keyboard switches views and moves the memory selection", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector("#plans-table tr");

    await page.keyboard.press("2");
    await expect(memoryRows(page).first()).toBeVisible();
    const selected = page.locator("#memory-table tr.selected");
    const first = await selected.getAttribute("data-memory-id");

    await page.keyboard.press("ArrowDown");
    await expect(selected).not.toHaveAttribute("data-memory-id", first!);

    await page.keyboard.press("f");
    await expect(page.locator(".detail-overlay")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.keyboard.press("1");
    await expect(page.locator("#plans-table tr").first()).toBeVisible();
  });
});
