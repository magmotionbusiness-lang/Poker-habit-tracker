import { expect, test, type Locator, type Page } from "@playwright/test";

async function tap(page: Page, loc: Locator) {
  await loc.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(100);
  await loc.click({ force: true });
}

async function demo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Start without an account/ }).click();
  await page.getByRole("button", { name: /Load a demo player/ }).click();
  await expect(page).toHaveURL(/\/today$/);
}

test.describe("Phase 3: growth layer", () => {
  test("stake ladder, insights and weekly review on Progress", async ({ page }) => {
    await demo(page);
    await page.goto("/progress");
    await expect(page.getByText("Stake ladder")).toBeVisible();
    await expect(page.getByRole("list", { name: "Stakes" })).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /Progress to/ })).toBeVisible();
    await expect(page.getByText("Here's what I noticed").first()).toBeVisible();
    await expect(page.getByText(/Confidence|Small sample/).first()).toBeVisible();

    await tap(page, page.getByRole("button", { name: /Write this week's review/ }));
    await page.getByLabel("What went well?").fill("Stuck to my stop-loss.");
    await page.getByLabel("Focus for next week?").fill("Fold to river raises.");
    await page
      .getByRole("button", { name: "Save review" })
      .evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByRole("button", { name: /Edit this week's review/ })).toBeVisible();
  });

  test("daily hand answers once and shows the explanation", async ({ page }) => {
    await demo(page);
    const group = page.getByRole("group", { name: "Your play" });
    await group.scrollIntoViewIfNeeded();
    await tap(page, group.getByRole("button").first());
    await expect(group.getByRole("button").first()).toBeDisabled();
    await expect(page.getByText(/Nice\.|Good spot to study\./)).toBeVisible();
    await expect(page.getByLabel(/1-day Daily Hand streak/)).toBeVisible();
  });

  test("waitlist form needs consent and posts the lead", async ({ page }) => {
    await page.route("**/api/leads", async (route) => {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({ list: "waitlist", email: "max@example.com", consent: true });
      expect(body.consent_text).toContain("waitlist");
      await route.fulfill({ status: 200, json: { ok: true } });
    });
    await demo(page);
    await page.goto("/more/up-the-stakes?utm_source=test");
    const form = page.locator("#waitlist");
    await form.getByRole("textbox", { name: "Email" }).fill("max@example.com");
    const submit = form.getByRole("button", { name: /Join the waitlist/ });
    await expect(submit).toBeDisabled();
    await tap(page, form.getByRole("checkbox"));
    await tap(page, submit);
    await expect(page.getByText(/You're on the waitlist/)).toBeVisible();
  });

  test("CSV import maps columns and adds sessions", async ({ page }) => {
    await demo(page);
    await page.goto("/more/data");
    await tap(page, page.getByRole("button", { name: /Sessions from CSV/ }));
    await page.locator('input[type="file"]').setInputFiles({
      name: "sessions.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Date,Hours,Stakes,Buy-in,Cash out\n01/03/2026,4,1/2,300,512\n02/03/2026,3,1/2,300,150\n",
      ),
    });
    await expect(page.getByText(/2 sessions ready/)).toBeVisible();
    await expect(page.getByText("+$62")).toBeVisible();
    await page
      .getByRole("button", { name: "Import 2 sessions" })
      .evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByText(/Imported 2 sessions/)).toBeVisible();
  });

  test("admin is gated for non-admins", async ({ page }) => {
    await demo(page);
    await page.goto("/admin");
    await expect(page.getByText("Admins only")).toBeVisible();
    await page.goto("/more");
    await expect(page.getByRole("link", { name: /^Admin/ })).toHaveCount(0);
  });

  test("journey: story, monthly report and a shareable year", async ({ page }) => {
    await demo(page);
    await page.goto("/progress");
    await tap(page, page.getByRole("link", { name: /Your poker journey/ }));
    await expect(page).toHaveURL(/\/progress\/journey$/);
    await expect(page.getByText("Lifetime result")).toBeVisible();
    await expect(page.getByText("Highlights")).toBeVisible();
    await expect(page.getByText("Monthly report", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Share my year/ })).toBeVisible();
  });

  test("players: add a player, tag them in a hand, see the record", async ({ page }) => {
    await demo(page);
    await page.goto("/hands/players");
    await expect(page.getByText("Big Tony")).toBeVisible();
    await tap(page, page.getByRole("button", { name: "Add", exact: true }));
    await page.getByLabel("Name or nickname").fill("Sunglasses Sam");
    await page.getByRole("radio", { name: "Maniac" }).evaluate((el) => (el as HTMLElement).click());
    await page
      .getByRole("button", { name: "Save player" })
      .evaluate((el) => (el as HTMLElement).click());
    await expect(page.getByText("Sunglasses Sam")).toBeVisible();

    await page.goto("/hands");
    await page.locator('a[href^="/hands/view"]').first().click();
    await tap(page, page.getByRole("button", { name: /Sunglasses Sam/ }));
    await expect(page.getByRole("button", { name: /Sunglasses Sam/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.goto("/hands/players");
    await tap(page, page.getByRole("link", { name: /Sunglasses Sam/ }));
    await expect(page.getByText("Shared hands · 1")).toBeVisible();
  });

  test("bankroll intelligence: net worth, risk and forecast", async ({ page }) => {
    await demo(page);
    await page.goto("/bankroll");
    await expect(page.getByText("Bankroll intelligence")).toBeVisible();
    await expect(page.getByText("Total poker net worth")).toBeVisible();
    await expect(page.getByText("Where you could be")).toBeVisible();
  });
});
