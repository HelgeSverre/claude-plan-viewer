#!/usr/bin/env bun
import { chromium } from "@playwright/test";

async function generateScreenshot() {
  console.log("🚀 Starting browser...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2, // For high-DPI display
  });
  const page = await context.newPage();

  console.log("📋 Opening Plans Viewer...");
  await page.goto("http://localhost:3010");

  // Wait for plans to load
  console.log("⏳ Waiting for plans to load...");
  await page.waitForSelector("#plans-table tr", { timeout: 10000 });

  // Wait a bit for everything to render nicely
  await page.waitForTimeout(1000);

  // Select a plan with good content (the first one)
  console.log("🎯 Selecting a plan...");
  const firstRow = page.locator("#plans-table tr").first();
  await firstRow.click();
  await page.waitForTimeout(1000);

  // Take the screenshot
  console.log("📸 Taking screenshot...");
  await page.screenshot({
    path: "screenshot.png",
    fullPage: false,
  });

  console.log("✅ Screenshot saved to screenshot.png");

  await browser.close();
}

generateScreenshot().catch((error) => {
  console.error("❌ Error generating screenshot:", error);
  process.exit(1);
});
