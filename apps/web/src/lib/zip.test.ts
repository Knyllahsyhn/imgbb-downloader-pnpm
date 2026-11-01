import { afterEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import {
  AllDownloadsFailedError,
  downloadAlbumAsZip,
  mapWithConcurrency,
  safeZipName,
  uniqueFilename,
} from "./zip";
import type { AlbumImage } from "../types";

function image(id: string, filename = `${id}.jpg`): AlbumImage {
  return {
    id,
    title: id,
    filename,
    thumbUrl: `https://i.ibb.co/${id}/thumb.jpg`,
    mediumUrl: `https://i.ibb.co/${id}/medium.jpg`,
    fullUrl: `https://i.ibb.co/${id}/${filename}`,
    width: 1,
    height: 1,
    sizeBytes: 1,
    pageUrl: `https://ibb.co/${id}`,
  };
}

describe("uniqueFilename", () => {
  it("appends a counter before the extension for repeated names", () => {
    const used = new Set<string>();
    expect(uniqueFilename(used, "a.jpg")).toBe("a.jpg");
    expect(uniqueFilename(used, "a.jpg")).toBe("a (2).jpg");
    expect(uniqueFilename(used, "a.jpg")).toBe("a (3).jpg");
    expect(uniqueFilename(used, "noext")).toBe("noext");
    expect(uniqueFilename(used, "noext")).toBe("noext (2)");
  });
});

describe("safeZipName", () => {
  it("replaces characters that are invalid in file names", () => {
    expect(safeZipName('a/b:c*?"<>|d')).toBe("a_b_c_d.zip");
  });

  it("falls back to 'album' for an empty title", () => {
    expect(safeZipName("  ")).toBe("album.zip");
  });
});

describe("mapWithConcurrency", () => {
  it("keeps order and never exceeds the limit", async () => {
    let active = 0;
    let peak = 0;
    const result = await mapWithConcurrency([5, 1, 4, 2, 3, 0], 2, async (n) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, n));
      active -= 1;
      return n * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30, 0]);
    expect(peak).toBe(2);
  });

  it("handles an empty list", async () => {
    expect(await mapWithConcurrency([], 3, async () => 1)).toEqual([]);
  });
});

describe("downloadAlbumAsZip", () => {
  let savedZip: Blob | null = null;
  let savedName = "";

  function stubBrowser(failingIds: string[] = []) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (failingIds.some((id) => url.includes(`/${id}/`))) {
          return new Response("", { status: 404 });
        }
        return new Response(new Blob([url]));
      }),
    );
    vi.stubGlobal("URL", {
      createObjectURL: (blob: Blob) => {
        savedZip = blob;
        return "blob:test";
      },
      revokeObjectURL: () => {},
    });
    const anchor = {
      click: () => {},
      set download(name: string) {
        savedName = name;
      },
      href: "",
    };
    vi.stubGlobal("document", {
      createElement: () => anchor,
      body: { appendChild: () => {}, removeChild: () => {} },
    });
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    savedZip = null;
    savedName = "";
  });

  it("zips all images and reports progress", async () => {
    stubBrowser();
    const progress: number[] = [];
    const result = await downloadAlbumAsZip("My Album", [image("a"), image("b", "a.jpg")], {
      onProgress: (p) => progress.push(p.done),
    });

    expect(result.failed).toEqual([]);
    expect(progress).toEqual([1, 2]);
    expect(savedName).toBe("My Album.zip");
    const zip = await JSZip.loadAsync(savedZip!);
    expect(Object.keys(zip.files).sort()).toEqual(["a (2).jpg", "a.jpg"]);
  });

  it("skips failed images and still builds the ZIP", async () => {
    stubBrowser(["b"]);
    const result = await downloadAlbumAsZip("x", [image("a"), image("b"), image("c")]);

    expect(result.failed.map((i) => i.id)).toEqual(["b"]);
    const zip = await JSZip.loadAsync(savedZip!);
    expect(Object.keys(zip.files).sort()).toEqual(["a.jpg", "c.jpg"]);
  });

  it("throws when every image fails", async () => {
    stubBrowser(["a", "b"]);
    await expect(downloadAlbumAsZip("x", [image("a"), image("b")])).rejects.toBeInstanceOf(
      AllDownloadsFailedError,
    );
    expect(savedZip).toBeNull();
  });

  it("stops when the caller aborts", async () => {
    stubBrowser();
    const controller = new AbortController();
    controller.abort();
    await expect(
      downloadAlbumAsZip("x", [image("a")], { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(savedZip).toBeNull();
  });
});
