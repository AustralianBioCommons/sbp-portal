import { expect, test } from "@playwright/test";

for (const card of [
  {
    heading: "Binder Design",
    path: "/binder-design",
  },
  {
    heading: "Structure Prediction",
    path: "/structure-prediction",
  },
]) {
  for (const width of [1440, 390]) {
    test(`opens the whole ${card.heading} card with a pointer and keyboard at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/home");
      const link = page
        .locator("#getting-started")
        .getByRole("link", { name: card.heading, exact: true });

      await expect(link.locator("a, button, [tabindex]")).toHaveCount(0);
      await link.click({ position: { x: 12, y: 12 } });
      await expect(page).toHaveURL(card.path);

      await page.goBack();
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      await link.focus();
      await expect(link).toBeFocused();
      await link.press("Enter");
      await expect(page).toHaveURL(card.path);
    });
  }
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tall desktop", width: 1440, height: 2600 },
]) {
  test(`keeps the hero from painting over the footer on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const background = page.locator("#home-background");
    const footer = page.locator("footer");
    const initialTop = await background.evaluate(
      (element) => element.getBoundingClientRect().top
    );

    const stickyScroll = await background.evaluate((element) => {
      const home = element.closest("#home-page")!;
      return Math.min(
        700,
        home.getBoundingClientRect().bottom - element.clientHeight,
        document.documentElement.scrollHeight - window.innerHeight
      );
    });

    if (stickyScroll >= initialTop) {
      await page.evaluate((top) => window.scrollTo(0, top), stickyScroll);
      await expect
        .poll(() =>
          background.evaluate((element) => element.getBoundingClientRect().top)
        )
        .toBe(0);
    }

    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight)
    );
    await expect
      .poll(async () => {
        const backgroundBottom = await background.evaluate(
          (element) => element.getBoundingClientRect().bottom
        );
        const footerTop = await footer.evaluate(
          (element) => element.getBoundingClientRect().top
        );
        return backgroundBottom <= footerTop;
      })
      .toBe(true);

    await footer.scrollIntoViewIfNeeded();
    await footer.getByRole("link", { name: "Home", exact: true }).click({
      trial: true,
    });

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect
      .poll(() =>
        background.evaluate((element) => element.getBoundingClientRect().top)
      )
      .toBe(initialTop);
  });
}
