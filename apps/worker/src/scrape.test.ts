import { afterEach, describe, expect, it, vi } from "vitest";
import { AlbumNotFoundError, InvalidAlbumUrlError, fetchAlbum, parseAlbumInput } from "./scrape";

function dataObject(id: string, extra: Record<string, unknown> = {}): string {
  const raw = {
    id_encoded: id,
    title: `Image ${id}`,
    filename: `${id}.jpg`,
    url: `https://i.ibb.co/${id}/${id}.jpg`,
    url_viewer: `https://ibb.co/${id}`,
    width: "800",
    height: "600",
    thumb: { url: `https://i.ibb.co/${id}/thumb.jpg` },
    image: { size: "12345" },
    ...extra,
  };
  return encodeURIComponent(JSON.stringify(raw));
}

/** Reduced copy of the markup imgbb renders on an album page. */
function albumPage(ids: string[], title = "Holiday &amp; Friends"): string {
  const items = ids
    .map((id) => `<div class="list-item" data-object='${dataObject(id)}'></div>`)
    .join("\n");
  return `<html><head><meta property="og:title" content="${title}"></head><body>${items}</body></html>`;
}

function mockFetch(page: { status: number; body: string }, json?: unknown) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "https://ibb.co/json") {
      return json === undefined
        ? new Response("", { status: 500 })
        : new Response(JSON.stringify(json), { status: 200 });
    }
    return new Response(page.body, { status: page.status });
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseAlbumInput", () => {
  it.each([
    ["https://ibb.co/album/abc123", "abc123"],
    ["https://ibb.co/album/abc123/", "abc123"],
    ["https://ibb.co/album/abc123?sort=date", "abc123"],
    ["https://imgbb.com/album/abc123", "abc123"],
    ["https://de.imgbb.com/album/abc123", "abc123"],
    ["  abc123  ", "abc123"],
  ])("reads the album ID from %s", (input, id) => {
    expect(parseAlbumInput(input)).toEqual({
      albumId: id,
      albumUrl: `https://ibb.co/album/${id}`,
    });
  });

  it.each([
    "",
    "https://example.com/album/abc123",
    "https://ibb.co.evil.com/album/abc123",
    "https://ibb.co/abc123",
    "http://[invalid",
  ])("rejects %j", (input) => {
    expect(() => parseAlbumInput(input)).toThrow(InvalidAlbumUrlError);
  });
});

describe("fetchAlbum", () => {
  it("combines page items with the JSON endpoint and removes duplicates", async () => {
    mockFetch(
      { status: 200, body: albumPage(["a1", "a2"]) },
      {
        status_code: 200,
        is_output_truncated: 0,
        album: { name: "Holiday 2026" },
        contents: [
          JSON.parse(decodeURIComponent(dataObject("a2"))),
          JSON.parse(decodeURIComponent(dataObject("a3"))),
        ],
      },
    );

    const result = await fetchAlbum("https://ibb.co/album/xyz");

    expect(result.title).toBe("Holiday 2026");
    expect(result.truncated).toBe(false);
    expect(result.images.map((i) => i.id)).toEqual(["a1", "a2", "a3"]);
    expect(result.images[0]).toMatchObject({
      filename: "a1.jpg",
      fullUrl: "https://i.ibb.co/a1/a1.jpg",
      thumbUrl: "https://i.ibb.co/a1/thumb.jpg",
      width: 800,
      height: 600,
      sizeBytes: 12345,
    });
  });

  it("falls back to the og:title and decodes entities when the JSON endpoint fails", async () => {
    mockFetch({ status: 200, body: albumPage(["a1"]) });

    const result = await fetchAlbum("xyz");

    expect(result.title).toBe("Holiday & Friends");
    expect(result.images).toHaveLength(1);
  });

  it("reports truncated output", async () => {
    mockFetch(
      { status: 200, body: albumPage(["a1"]) },
      { status_code: 200, is_output_truncated: 1, contents: [] },
    );

    expect((await fetchAlbum("xyz")).truncated).toBe(true);
  });

  it("skips malformed data-object attributes", async () => {
    const body = `<div data-object='%7Bbroken'></div>${albumPage(["ok"])}`;
    mockFetch({ status: 200, body });

    expect((await fetchAlbum("xyz")).images.map((i) => i.id)).toEqual(["ok"]);
  });

  it("throws AlbumNotFoundError for a 404 page", async () => {
    mockFetch({ status: 404, body: "" });
    await expect(fetchAlbum("xyz")).rejects.toBeInstanceOf(AlbumNotFoundError);
  });

  it("throws AlbumNotFoundError for an album without images", async () => {
    mockFetch({ status: 200, body: albumPage([]) });
    await expect(fetchAlbum("xyz")).rejects.toBeInstanceOf(AlbumNotFoundError);
  });

  it("throws a generic error for other upstream failures", async () => {
    mockFetch({ status: 503, body: "" });
    await expect(fetchAlbum("xyz")).rejects.toThrow("status 503");
  });
});
