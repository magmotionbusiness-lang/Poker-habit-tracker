import { expect, test } from "@playwright/test";

test.describe("Phase 0 smoke", () => {
  test("welcome → guest mode → tabs → quick add", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Build the system.");
    await page.getByRole("button", { name: /Start without an account/ }).click();

    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Main" });
    for (const tab of ["Bankroll", "Hands", "Progress", "More"]) {
      await nav.getByRole("link", { name: tab }).click();
      await expect(page.getByRole("heading", { level: 1, name: tab })).toBeVisible();
      await expect(nav.getByRole("link", { name: tab })).toHaveAttribute("aria-current", "page");
    }

    await page.getByRole("button", { name: "Quick add" }).click();
    await expect(page.getByRole("dialog")).toContainText("Start session");
  });

  test("guest mode persists across reloads", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Start without an account/ }).click();
    await expect(page).toHaveURL(/\/today$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/today$/);
  });

  test("app routes send first-time visitors to welcome", async ({ page }) => {
    await page.goto("/bankroll");
    await expect(page).toHaveURL(/\/$/);
  });

  test("display preferences are saved on the device", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Start without an account/ }).click();
    await page.goto("/more");
    await page.getByRole("radio", { name: "Big blinds" }).click();
    await page.reload();
    await expect(page.getByRole("radio", { name: "Big blinds" })).toHaveAttribute(
      "data-state",
      "on",
    );
  });

  test("design system page renders", async ({ page }) => {
    await page.goto("/design");
    await expect(page.getByRole("heading", { name: "Colour" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Ace of spades" })).toBeVisible();
  });

  test("PWA manifest and service worker are served", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBeTruthy();
    const json = await manifest.json();
    expect(json.display).toBe("standalone");
    expect(json.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBeTruthy();
    const sw = await request.get("/sw.js");
    expect(sw.headers()["cache-control"]).toContain("no-cache");
  });

  test("auth callback rejects open redirects", async ({ request }) => {
    const res = await request.get("/auth/callback?next=//evil.example", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).not.toContain("evil.example");
  });
});
