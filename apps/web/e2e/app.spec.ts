import { test, expect, type Page } from "@playwright/test";
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
  albumId: "test123",
  albumUrl: "https://ibb.co/album/test123",
  title: "Test Album",
  images: ["a1", "a2", "a3"].map(makeImage),
  truncated: false,
};

async function mockBackend(page: Page, { failImage }: { failImage?: string } = {}) {
  await page.route("http://127.0.0.1:8787/api/album**", async (route) => {
    const url = new URL(route.request().url()).searchParams.get("url") ?? "";
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
    await route.fulfill({
      body: PNG,
      contentType: "image/png",
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("imgbb Album Downloader");
  await expectNoAxeViolations(page);
  expect(csp).toEqual([]);
});

test("loads an album, keeps it in the URL and downloads a ZIP", async ({ page }) => {
  const csp = collectCspViolations(page);
  await mockBackend(page);
  await page.goto("./");

  await page.getByLabel("imgbb album link").fill("https://ibb.co/album/test123");
  await page.getByRole("button", { name: "Load album" }).click();

  await expect(page.getByRole("heading", { name: "Test Album" })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(3);
  await expect(page).toHaveURL(/album=https%3A%2F%2Fibb\.co%2Falbum%2Ftest123/);
  await expectNoAxeViolations(page);

  await page.getByRole("checkbox", { name: /Photo a2/ }).uncheck();
  await expect(page.getByText("2 / 3 selected")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download 2 as ZIP" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Test Album.zip");
  expect(csp).toEqual([]);
});

test("reloading a shared link loads the album again", async ({ page }) => {
  await mockBackend(page);
  await page.goto("./?album=https%3A%2F%2Fibb.co%2Falbum%2Ftest123");
  await expect(page.getByRole("heading", { name: "Test Album" })).toBeVisible();
  await expect(page.getByLabel("imgbb album link")).toHaveValue("https://ibb.co/album/test123");
});

test("shows API errors in an alert", async ({ page }) => {
  await mockBackend(page);
  await page.goto("./");
  await page.getByLabel("imgbb album link").fill("https://ibb.co/album/missing");
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
