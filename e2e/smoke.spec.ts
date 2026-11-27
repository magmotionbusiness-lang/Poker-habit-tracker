import { expect, test, type Page } from "@playwright/test";

/** Start as a guest and finish onboarding with defaults (+ an optional starting bankroll). */
async function onboard(page: Page, bankroll = "2000") {
  await page.goto("/");
  await page.getByRole("button", { name: /Start without an account/ }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole("button", { name: "Continue" }).click(); // formats
  await page.getByRole("button", { name: "Continue" }).click(); // stakes
  await page.getByLabel("Starting bankroll").fill(bankroll);
  await page.getByRole("button", { name: "Continue" }).click(); // bankroll
  await page.getByRole("button", { name: "Continue" }).click(); // goal
  await page.getByRole("button", { name: "Continue" }).click(); // habits
  await page.getByRole("button", { name: "Continue" }).click(); // reminders
  await page.getByRole("button", { name: "Continue" }).click(); // UTS code
  await page.getByRole("button", { name: "Build my system" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
}

test.describe("Phase 1 flows", () => {
  test("onboarding creates habits, a goal and a bankroll", async ({ page }) => {
    await onboard(page);
    await expect(page.getByText("Make my first $50k from poker")).toBeVisible(); // main goal on Home
    await page.goto("/today");
    await expect(page.getByRole("button", { name: /^Review hands: 0 of 3/ })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("link", { name: "Bankroll" })
      .click();
    await expect(page.getByText("$2,000").first()).toBeVisible();
  });

  test("habit check-off counts the day for the streak", async ({ page }) => {
    await onboard(page);
    await page.goto("/today");
    for (let i = 0; i < 3; i++)
      await page.getByRole("button", { name: new RegExp(`^Review hands: ${i} of 3`) }).click();
    await expect(page.getByText("Today counts. Streak safe.")).toBeVisible();
    await expect(page.getByRole("img", { name: "1-day streak" })).toBeVisible();
  });

  test("live session: start, update stack, end with cool-down → result in bankroll", async ({
    page,
  }) => {
    await onboard(page);
    await page.getByRole("button", { name: "Quick add" }).click();
    await page
      .getByRole("button", { name: /Start session/ })
      .first()
      .click();
    await page.getByLabel("Small blind").fill("1");
    await page.getByLabel("Big blind").fill("2");
    await page.getByLabel("Buy-in", { exact: true }).fill("300");
    // $300 against a $2,000 bankroll breaks the standard 30-buy-in rule: warned, not blocked.
    await expect(page.getByText(/Above your bankroll rule/)).toBeVisible();
    await page.getByRole("button", { name: "Start anyway", exact: true }).click();
    await expect(page).toHaveURL(/\/session$/);

    await page.getByRole("button", { name: "Update stack" }).click();
    await page.getByRole("button", { name: "+50bb" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("+$100")).toBeVisible();

    // Survives a reload (timer + state live on the device).
    await page.reload();
    await expect(page.getByText("+$100")).toBeVisible();

    await page.getByRole("button", { name: "End session" }).click();
    await page.getByRole("button", { name: "A-game" }).click();
    await page.getByRole("button", { name: "Save session" }).click();
    // Session report: result counts up, then one tap for mood.
    await expect(page.getByText("Session report")).toBeVisible();
    await page.getByRole("radio", { name: "Great" }).click();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.goto("/bankroll");
    await expect(page.getByText("$2,100").first()).toBeVisible();
    await expect(page.getByText("+$100").first()).toBeVisible();
  });

  test("demo player loads a 23-day streak and a 64% bankroll goal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Start without an account/ }).click();
    await page.getByRole("button", { name: /Load a demo player/ }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("img", { name: "23-day streak" })).toBeVisible();
    await expect(page.getByText("64%")).toBeVisible();
    await page.goto("/bankroll");
    await expect(page.getByText("$6,400").first()).toBeVisible();
    await expect(page.getByText(/C-game sessions lose/)).toBeVisible();
  });

  test("app routes send first-time visitors to welcome", async ({ page }) => {
    await page.goto("/bankroll");
    await expect(page).toHaveURL(/\/$/);
  });

  test("tabs and quick add", async ({ page }) => {
    await onboard(page);
    const nav = page.getByRole("navigation", { name: "Main" });
    // Home is the centre tab; settings live behind the gear on Home.
    for (const tab of ["Today", "Hands", "Bankroll", "Progress", "Home"]) {
      await nav.getByRole("link", { name: tab, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: tab })).toBeVisible();
      await expect(nav.getByRole("link", { name: tab, exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
    }
    await page.getByRole("button", { name: "Quick add" }).click();
    await expect(page.getByRole("dialog")).toContainText("Log finished session");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("link", { name: "Settings & more" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settings & more" })).toBeVisible();
  });

  test("display preferences are saved on the device", async ({ page }) => {
    await onboard(page);
    await page.goto("/more");
    await page.getByRole("radio", { name: "Big blinds" }).click();
    await page.reload();
    await expect(page.getByRole("radio", { name: "Big blinds" })).toHaveAttribute(
      "data-state",
      "on",
    );
  });
});

test.describe("platform", () => {
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

  test("protected endpoints reject anonymous calls", async ({ request }) => {
    expect((await request.get("/api/cron/reminders")).status()).toBe(401);
    expect([401, 503]).toContain(
      (await request.post("/api/push/subscribe", { data: {} })).status(),
    );
    expect([401, 503]).toContain((await request.post("/api/push/test")).status());
    expect([401, 503]).toContain(
      (await request.post("/api/admin/broadcast", { data: { title: "x" } })).status(),
    );
  });

  test("lead endpoint validates input and requires consent", async ({ request }) => {
    // Own client IP so the per-IP rate limit (5 / 10 min) doesn't leak between projects.
    const headers = {
      "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
    };
    expect(
      (await request.post("/api/leads", { headers, data: { list: "waitlist" } })).status(),
    ).toBe(400);
    const noConsent = await request.post("/api/leads", {
      headers,
      data: { list: "waitlist", email: "a@b.co", consent: false, consent_text: "x" },
    });
    expect(noConsent.status()).toBe(400);
    // Honeypot filled: pretend success, store nothing.
    const bot = await request.post("/api/leads", {
      headers,
      data: {
        list: "newsletter",
        email: "a@b.co",
        consent: true,
        consent_text: "x",
        company: "spam",
      },
    });
    expect(bot.status()).toBe(200);
  });
});
