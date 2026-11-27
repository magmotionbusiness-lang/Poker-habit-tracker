import { expect, test, type Locator, type Page } from "@playwright/test";

/** Centre an element before clicking so the fixed tab bar never covers it. */
async function tap(page: Page, loc: Locator) {
  await loc.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(100);
  await loc.click({ force: true });
}

/** Buttons inside a bottom sheet (its own scroll container, animating in). */
async function tapInSheet(page: Page, loc: Locator) {
  await expect(loc).toBeVisible();
  await expect(loc).toBeEnabled();
  await page.waitForTimeout(400); // let the sheet finish sliding in
  await loc.evaluate((el) => (el as HTMLElement).click());
}

async function guest(page: Page, demo = false) {
  await page.goto("/");
  await page.getByRole("button", { name: /Start without an account/ }).click();
  if (demo) {
    await page.getByRole("button", { name: /Load a demo player/ }).click();
    await expect(page).toHaveURL(/\/today$/);
  }
}

test.describe("Phase 2: hands", () => {
  test("log a full hand on the table: setup, action, result", async ({ page }) => {
    await guest(page, true);
    await page.goto("/hands/new");
    await page
      .getByRole("group", { name: "Table size" })
      .getByRole("button", { name: "6", exact: true })
      .click();
    await page
      .getByRole("group", { name: "Your position" })
      .getByRole("button", { name: "BTN", exact: true })
      .click();
    await tap(page, page.getByRole("button", { name: "Ace of spades" }));
    await tap(page, page.getByRole("button", { name: "Ace of hearts" }));
    await tap(page, page.getByRole("button", { name: /Start the action/ }));

    await tap(page, page.getByRole("button", { name: "Everyone folds to you" }));
    await tap(page, page.getByRole("button", { name: "Raise", exact: true }));
    await tap(page, page.getByRole("button", { name: /^2\.5x/ }));
    await tap(page, page.getByRole("button", { name: "Fold", exact: true })); // SB
    await tap(page, page.getByRole("button", { name: "Fold", exact: true })); // BB

    await expect(page.getByText("Your result")).toBeVisible();
    await expect(page.getByText("+$3").first()).toBeVisible(); // blinds 1 + 2
    await tap(page, page.getByRole("button", { name: "Save hand" }));
    await expect(page).toHaveURL(/\/hands\/view\?id=/);
    await expect(page.getByRole("img", { name: /Poker table/ })).toBeVisible();
    await expect(page.getByText("BTN · NLHE · 1/2")).toBeVisible();
  });

  test("quick note lands in the review queue", async ({ page }) => {
    await guest(page, true);
    await page.goto("/hands/new?mode=note");
    await page.getByLabel("Quick note").fill("AKo, 3-bet pot, lost on the river. Check later.");
    await page.getByRole("button", { name: "Save note" }).click();
    await expect(page).toHaveURL(/\/hands$/);
    await page.getByRole("tab", { name: /To finish/ }).click();
    await expect(
      page.getByText("AKo, 3-bet pot, lost on the river.", { exact: false }).first(),
    ).toBeVisible();
  });

  test("custom sections: create one and file a hand in it", async ({ page }) => {
    await guest(page, true);
    await page.goto("/hands");
    await page.getByRole("button", { name: "New section" }).click();
    await page.getByLabel("Name").fill("Spots for Thursday");
    await page.getByRole("button", { name: "Create section" }).click();
    await page.locator('a[href^="/hands/view"]').first().click();
    await tap(page, page.getByRole("button", { name: /Spots for Thursday/ }));
    await expect(page.getByRole("button", { name: /Spots for Thursday/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.goto("/hands");
    await expect(page.getByRole("button", { name: /Spots for Thursday\s*1 hand/ })).toBeVisible();
  });

  test("review → rule in the Leak Book → rule of the day", async ({ page }) => {
    await guest(page, true);
    await page.goto("/hands?list=unreviewed");
    await page.locator('a[href^="/hands/view"]').first().click();
    await tap(page, page.getByRole("button", { name: "Start review" }));
    await page.getByLabel(/Preflop/).fill("Open was fine.");
    await page.getByLabel(/The rule/).fill("Never slowplay sets on wet boards.");
    await tapInSheet(page, page.getByRole("button", { name: /Save review & rule/ }));
    // The text is briefly in both the closing sheet and the page: wait for the sheet to go.
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Never slowplay sets on wet boards.")).toBeVisible();
    await page.goto("/hands/leaks");
    await expect(page.getByText("Never slowplay sets on wet boards.")).toBeVisible();
  });

  test("replayer steps through the hand and shows the result", async ({ page }) => {
    await guest(page, true);
    await page.goto("/hands?list=biggest-wins");
    await page.locator('a[href^="/hands/view"]').first().click();
    const log = page.getByRole("list", { name: "Action log" });
    await expect(log).toBeVisible();
    await tap(page, page.getByRole("button", { name: "Step forward" }));
    await tap(page, page.getByRole("button", { name: "End", exact: true }));
    await expect(page.getByText(/Showdown|Hand over/).first()).toBeVisible();
  });
  test("express log: a hand in a few taps between hands", async ({ page }) => {
    await guest(page, true);
    await page.goto("/hands");
    await page.getByRole("button", { name: "Log hand" }).click();
    await tapInSheet(page, page.getByRole("button", { name: "Ace of spades" }));
    await tapInSheet(page, page.getByRole("button", { name: "Queen of spades" }));
    await tapInSheet(
      page,
      page
        .getByRole("group", { name: "Position" })
        .getByRole("button", { name: "CO", exact: true }),
    );
    await tapInSheet(page, page.getByRole("button", { name: "− Lost" }));
    await tapInSheet(page, page.getByRole("button", { name: "40bb" }));
    await tapInSheet(page, page.getByRole("button", { name: "Save hand" }));
    await page.getByRole("tab", { name: /To finish/ }).click();
    await expect(page.getByText(/CO · SRP/).first()).toBeVisible();
    await expect(page.getByText("−$80").first()).toBeVisible();
  });
});
