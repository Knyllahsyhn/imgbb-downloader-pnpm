import { afterEach, describe, expect, it, vi } from "vitest";
import { AlbumNotFoundError, fetchAlbum, parseAlbumInput } from "./scrape";
import { InvalidAlbumUrlError } from "./shared";

/**
 * Reduced copy of the markup Catbox renders on an album page (checked
 * 2026-11-01): og tags, a title block, the gallery anchors and a hidden list
 * view that repeats every link.
 */
function albumPage(
  files: string[],
  { title = "Trip &amp; Friends", cover = files[1] } = {},
): string {
  const gallery = files
    .map((f) => {
      const thumb = `https://files.catbox.moe/thumbs/t_${f}`;
      return `<a href='https://files.catbox.moe/${f}'  data-fancybox='gallery'><img src='${thumb}' loading='lazy'></a>`;
    })
    .join("");
  const list = files
    .map(
      (f) =>
        `<a href='https://files.catbox.moe/${f}' target='_blank'>https://files.catbox.moe/${f}</a><br>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head>
<meta property="og:title" content="${title}" />
<meta property="og:url" content="https://catbox.moe/c/abc123" />
${cover ? `<meta property='og:image' content='https://files.catbox.moe/${cover}' />` : ""}
<title>Catbox Collection</title>
</head><body><div class="container">
	<div class="title">
		<h1>${title}</h1>
		<p>Created September 4 2025</p>
	</div>
	<div class="imagecontainer">
	${gallery}
	</div>
	<div class="imagelist" style="display: none;">
	${list}
	</div>
</div></body></html>`;
}

function mockPage(status: number, body: string) {
  const fn = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseAlbumInput (Catbox)", () => {
  it.each([
    "https://catbox.moe/c/abc123",
    "https://catbox.moe/c/abc123/",
    "https://www.catbox.moe/c/abc123",
    "http://catbox.moe/c/abc123?x=1",
    "catbox.moe/c/abc123",
  ])("reads the album ID from %s", (input) => {
    expect(parseAlbumInput(input)).toEqual({
      provider: "catbox",
      albumId: "abc123",
      albumUrl: "https://catbox.moe/c/abc123",
    });
  });

  it.each([
    "https://catbox.moe/abc123",
    "https://catbox.moe/c/",
    "https://files.catbox.moe/abc123.png",
    "https://catbox.moe.evil.com/c/abc123",
    "https://catbox.moe/c/abc$123",
  ])("rejects %j", (input) => {
    expect(() => parseAlbumInput(input)).toThrow(InvalidAlbumUrlError);
  });
});

describe("fetchAlbum (Catbox)", () => {
  it("reads the gallery in page order without the duplicate list view and cover", async () => {
    const fetchMock = mockPage(200, albumPage(["aaa111.png", "bbb222.jpg", "ccc333.gif"]));

    const result = await fetchAlbum("https://catbox.moe/c/abc123");

    expect(fetchMock).toHaveBeenCalledWith("https://catbox.moe/c/abc123", expect.anything());
    expect(result).toMatchObject({
      provider: "catbox",
      albumId: "abc123",
      albumUrl: "https://catbox.moe/c/abc123",
      title: "Trip & Friends",
      truncated: false,
    });
    expect(result.images.map((i) => i.filename)).toEqual([
      "aaa111.png",
      "bbb222.jpg",
      "ccc333.gif",
    ]);
    expect(result.images[1]).toEqual({
      id: "bbb222",
      title: "bbb222.jpg",
      filename: "bbb222.jpg",
      thumbUrl: "https://files.catbox.moe/thumbs/t_bbb222.jpg",
      mediumUrl: "https://files.catbox.moe/bbb222.jpg",
      fullUrl: "https://files.catbox.moe/bbb222.jpg",
      width: 0,
      height: 0,
      sizeBytes: null,
      pageUrl: "https://files.catbox.moe/bbb222.jpg",
    });
  });

  it("falls back to the album ID when the album has no title", async () => {
    mockPage(200, albumPage(["aaa111.png"], { title: "" }));
    expect((await fetchAlbum("https://catbox.moe/c/abc123")).title).toBe("abc123");
  });

  it("throws AlbumNotFoundError for a 404 page", async () => {
    mockPage(404, "");
    await expect(fetchAlbum("https://catbox.moe/c/abc123")).rejects.toBeInstanceOf(
      AlbumNotFoundError,
    );
  });

  it("throws AlbumNotFoundError for an album without files", async () => {
    mockPage(200, albumPage([], { cover: "" }));
    await expect(fetchAlbum("https://catbox.moe/c/abc123")).rejects.toBeInstanceOf(
      AlbumNotFoundError,
    );
  });

  it("names Catbox in other upstream failures", async () => {
    mockPage(503, "");
    await expect(fetchAlbum("https://catbox.moe/c/abc123")).rejects.toThrow(
      "Catbox responded with status 503",
    );
  });
});
