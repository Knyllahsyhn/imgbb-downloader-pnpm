import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// 1×1 transparent PNG, served for every image request.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

function makeImage(id: string) {
  return {
    id,
    title: `Photo ${id}`,
    filename: `${id}.png`,
    thumbUrl: `https://i.ibb.co/${id}/thumb.png`,
    mediumUrl: `https://i.ibb.co/${id}/medium.png`,
    fullUrl: `https://i.ibb.co/${id}/${id}.png`,
    width: 800,
    height: 600,
    sizeBytes: 2048,
    pageUrl: `https://ibb.co/${id}`,
  };
}

const ALBUM = {
  provider: "imgbb",
  albumId: "test123",
  albumUrl: "https://ibb.co/album/test123",
  title: "Test Album",
  images: ["a1", "a2", "a3"].map(makeImage),
  truncated: false,
};

function makeCatboxFile(id: string) {
  const filename = `${id}.png`;
  return {
    id,
    title: filename,
    filename,
    thumbUrl: `https://files.catbox.moe/thumbs/t_${filename}`,
    mediumUrl: `https://files.catbox.moe/${filename}`,
    fullUrl: `https://files.catbox.moe/${filename}`,
    width: 0,
    height: 0,
    sizeBytes: null,
    pageUrl: `https://files.catbox.moe/${filename}`,
  };
}

const CATBOX_ALBUM = {
  provider: "catbox",
  albumId: "cat123",
  albumUrl: "https://catbox.moe/c/cat123",
  title: "Catbox Album",
  images: ["c1", "c2"].map(makeCatboxFile),
  truncated: false,
};

async function servePng(route: Route) {
  await route.fulfill({
    body: PNG,
    contentType: "image/png",
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

async function mockBackend(page: Page, { failImage }: { failImage?: string } = {}) {
  await page.route("http://127.0.0.1:8787/api/album**", async (route) => {
    const url = new URL(route.request().url()).searchParams.get("url") ?? "";
    if (url.includes("catbox.moe")) {
      await route.fulfill({ json: CATBOX_ALBUM, headers: { "Access-Control-Allow-Origin": "*" } });
      return;
    }
    if (url.includes("missing")) {
      await route.fulfill({
        status: 404,
        json: { error: "Album not found (private or deleted?)." },
        headers: { "Access-Control-Allow-Origin": "*" },
      });
      return;
    }
    await route.fulfill({ json: ALBUM, headers: { "Access-Control-Allow-Origin": "*" } });
  });
  await page.route("https://i.ibb.co/**", async (route) => {
    if (failImage && route.request().url().includes(`/${failImage}/${failImage}.png`)) {
      await route.fulfill({ status: 404, body: "" });
      return;
    }
    await servePng(route);
  });
  await page.route("https://files.catbox.moe/**", servePng);
}

function collectCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content Security Policy/i.test(msg.text())) {
      violations.push(msg.text());
    }
  });
  return violations;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test("start page is accessible", async ({ page }) => {
  const csp = collectCspViolations(page);
  await page.goto("./");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Album Downloader");
  await expectNoAxeViolations(page);
  expect(csp).toEqual([]);
});

test("loads an album, keeps it in the URL and downloads a ZIP", async ({ page }) => {
  const csp = collectCspViolations(page);
  await mockBackend(page);
  await page.goto("./");

  await page.getByLabel("album link").fill("https://ibb.co/album/test123");
  await page.getByRole("button", { name: "Load album" }).click();

  await expect(page.getByRole("heading", { name: "Test Album" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  await expect(page).toHaveURL(/album=https%3A%2F%2Fibb\.co%2Falbum%2Ftest123/);
  await expectNoAxeViolations(page);

  await page.getByRole("checkbox", { name: /Photo a2/ }).uncheck();
  await expect(page.getByText("2 of 3 selected")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download 2 as ZIP" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Test Album.zip");
  expect(csp).toEqual([]);
});

test("loads a Catbox album and downloads it as a ZIP", async ({ page }) => {
  const csp = collectCspViolations(page);
  await mockBackend(page);
  await page.goto("./");

  await page.getByLabel("album link").fill("catbox.moe/c/cat123");
  await page.getByRole("button", { name: "Load album" }).click();

  await expect(page.getByRole("heading", { name: "Catbox Album" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /Open on Catbox/ })).toHaveAttribute(
    "href",
    "https://catbox.moe/c/cat123",
  );

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download 2 as ZIP" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Catbox Album.zip");
  expect(csp).toEqual([]);
});

test("reloading a shared link loads the album again", async ({ page }) => {
  await mockBackend(page);
  await page.goto("./?album=https%3A%2F%2Fibb.co%2Falbum%2Ftest123");
  await expect(page.getByRole("heading", { name: "Test Album" })).toBeVisible();
  await expect(page.getByLabel("album link")).toHaveValue("https://ibb.co/album/test123");
});

test("shows API errors in an alert", async ({ page }) => {
  await mockBackend(page);
  await page.goto("./");
  await page.getByLabel("album link").fill("https://ibb.co/album/missing");
  await page.getByRole("button", { name: "Load album" }).click();
  await expect(page.getByRole("alert")).toHaveText("Album not found (private or deleted?).");
});

test("reports images that could not be downloaded", async ({ page }) => {
  await mockBackend(page, { failImage: "a3" });
  await page.goto("./?album=test123");
  await expect(page.getByRole("heading", { name: "Test Album" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download 3 as ZIP" }).click();
  await downloadPromise;
  await expect(page.getByText(/1 image could not be downloaded/)).toBeVisible();
  await expect(page.getByRole("link", { name: "a3.png" })).toBeVisible();
});

test("shows a scannable barcode of the album ID", async ({ page }) => {
  await mockBackend(page);
  await page.goto("./?album=test123");
  await expect(page.getByRole("img", { name: "Barcode for album test123" })).toBeVisible();
});

test("theme toggle steps through Auto, Light and Dark and remembers the choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("./");
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /Color theme/ });

  await expect(toggle).toHaveAccessibleName(/Auto, follows your system setting/);
  await expect(html).toHaveAttribute("data-theme", "dark");

  await toggle.click();
  await expect(toggle).toHaveAccessibleName(/Color theme: Light/);
  await expect(html).toHaveAttribute("data-theme", "light");

  await toggle.click();
  await expect(toggle).toHaveAccessibleName(/Color theme: Dark/);
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await toggle.click();
  await expect(toggle).toHaveAccessibleName(/Auto/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveAttribute("data-theme", "light");
});

test("dark mode with a loaded album is accessible", async ({ page }) => {
  const csp = collectCspViolations(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await mockBackend(page);
  await page.goto("./?album=test123");
  await expect(page.getByRole("heading", { name: "Test Album" })).toBeVisible();
  await page.getByText("What's new").click();
  await expectNoAxeViolations(page);
  expect(csp).toEqual([]);
});

test("what's new lists the changes", async ({ page }) => {
  await page.goto("./");
  const details = page.locator("details", { hasText: "What's new" });
  await expect(details.getByRole("listitem").first()).toBeHidden();
  await page.getByText("What's new").click();
  await expect(details.getByText(/light and dark mode/)).toBeVisible();
});
