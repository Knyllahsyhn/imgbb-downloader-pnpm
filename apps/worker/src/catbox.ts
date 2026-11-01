import type { AlbumImage, AlbumRef, AlbumResult } from "./types";
import { AlbumNotFoundError, InvalidAlbumUrlError, decodeEntities, fetchAlbumPage } from "./shared";

/**
 * Every file of a Catbox album is rendered as
 * `<a href='https://files.catbox.moe/<id>.<ext>' data-fancybox='gallery'>`.
 * The same URLs appear again in a hidden list view and as og:image, so only
 * the gallery anchors are read to keep the album order.
 */
const GALLERY_LINK_RE =
  /<a\s+href=(['"])https:\/\/files\.catbox\.moe\/([A-Za-z0-9]+)\.([A-Za-z0-9]+)\1[^>]*data-fancybox/g;
const OG_TITLE_RE = /<meta property="og:title" content="([^"]*)"/;
const H1_RE = /<div class="title">\s*<h1>([^<]*)<\/h1>/;
const ALBUM_ID_RE = /^[A-Za-z0-9]+$/;

export function isCatboxHost(hostname: string): boolean {
  return /^(www\.)?catbox\.moe$/i.test(hostname);
}

export function parseCatboxUrl(url: URL): AlbumRef {
  const [prefix, albumId] = url.pathname.split("/").filter(Boolean);
  if (prefix !== "c" || !albumId || !ALBUM_ID_RE.test(albumId)) {
    throw new InvalidAlbumUrlError(
      "Could not read an album ID from the URL. Expected: https://catbox.moe/c/<id>",
    );
  }
  return { provider: "catbox", albumId, albumUrl: `https://catbox.moe/c/${albumId}` };
}

function readTitle(html: string, albumId: string): string {
  const raw = html.match(OG_TITLE_RE)?.[1] ?? html.match(H1_RE)?.[1] ?? "";
  return decodeEntities(raw).trim() || albumId;
}

export async function fetchCatboxAlbum({ albumId, albumUrl }: AlbumRef): Promise<AlbumResult> {
  const html = await fetchAlbumPage(albumUrl, "Catbox");

  const images = new Map<string, AlbumImage>();
  for (const match of html.matchAll(GALLERY_LINK_RE)) {
    const [, , id, ext] = match;
    if (images.has(id)) continue;
    const filename = `${id}.${ext}`;
    const fullUrl = `https://files.catbox.moe/${filename}`;
    images.set(id, {
      id,
      title: filename,
      filename,
      thumbUrl: `https://files.catbox.moe/thumbs/t_${filename}`,
      mediumUrl: fullUrl,
      fullUrl,
      // Catbox album pages carry neither dimensions nor file sizes.
      width: 0,
      height: 0,
      sizeBytes: null,
      pageUrl: fullUrl,
    });
  }

  if (images.size === 0) {
    throw new AlbumNotFoundError("Album is empty or private.");
  }

  return {
    provider: "catbox",
    albumId,
    albumUrl,
    title: readTitle(html, albumId),
    images: Array.from(images.values()),
    truncated: false,
  };
}
