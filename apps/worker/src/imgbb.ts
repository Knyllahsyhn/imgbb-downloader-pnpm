import type { AlbumImage, AlbumRef, AlbumResult } from "./types";
import {
  AlbumNotFoundError,
  BROWSER_USER_AGENT,
  InvalidAlbumUrlError,
  decodeEntities,
  fetchAlbumPage,
} from "./shared";

const DATA_OBJECT_RE = /data-object=(['"])([\s\S]*?)\1/g;
const OG_TITLE_RE = /<meta property="og:title" content="([^"]*)"/;

export function isImgbbHost(hostname: string): boolean {
  return /(^|\.)ibb\.co$|(^|\.)imgbb\.com$/i.test(hostname);
}

function imgbbAlbumRef(albumId: string): AlbumRef {
  return { provider: "imgbb", albumId, albumUrl: `https://ibb.co/album/${albumId}` };
}

export function parseImgbbUrl(url: URL): AlbumRef {
  const segments = url.pathname.split("/").filter(Boolean);
  const albumIndex = segments.indexOf("album");
  const albumId = albumIndex !== -1 ? segments[albumIndex + 1] : undefined;
  if (!albumId) {
    throw new InvalidAlbumUrlError(
      "Could not read an album ID from the URL. Expected: https://ibb.co/album/<id>",
    );
  }
  return imgbbAlbumRef(albumId);
}

interface RawDataObject {
  id_encoded: string;
  title?: string;
  name?: string;
  filename: string;
  url: string;
  display_url?: string;
  url_viewer: string;
  width?: string;
  height?: string;
  thumb?: { url: string };
  medium?: { url: string };
  image?: { size?: string };
}

function toImage(raw: RawDataObject): AlbumImage | null {
  if (!raw.id_encoded || !raw.url) return null;
  return {
    id: raw.id_encoded,
    title: raw.title || raw.name || raw.filename || raw.id_encoded,
    filename: raw.filename || `${raw.id_encoded}.jpg`,
    thumbUrl: raw.thumb?.url ?? raw.url,
    mediumUrl: raw.display_url ?? raw.medium?.url ?? raw.url,
    fullUrl: raw.url,
    width: Number(raw.width) || 0,
    height: Number(raw.height) || 0,
    sizeBytes: raw.image?.size ? Number(raw.image.size) : null,
    pageUrl: raw.url_viewer,
  };
}

interface AlbumContentsResponse {
  status_code: number;
  is_output_truncated?: number | boolean;
  contents?: RawDataObject[];
  album?: { name?: string };
}

/**
 * imgbb's own endpoint behind the "Embed codes" tab. Returns the complete,
 * unpaginated image list; the album page only renders the first few dozen.
 */
async function fetchAlbumContents(albumId: string): Promise<AlbumContentsResponse | null> {
  const res = await fetch("https://ibb.co/json", {
    method: "POST",
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ action: "get-album-contents", albumid: albumId }).toString(),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as AlbumContentsResponse;
  if (data.status_code !== 200) return null;
  return data;
}

export async function fetchImgbbAlbum({ albumId, albumUrl }: AlbumRef): Promise<AlbumResult> {
  const html = await fetchAlbumPage(albumUrl, "imgbb");

  const images = new Map<string, AlbumImage>();
  for (const match of html.matchAll(DATA_OBJECT_RE)) {
    let raw: RawDataObject;
    try {
      raw = JSON.parse(decodeURIComponent(match[2]));
    } catch {
      continue;
    }
    const image = toImage(raw);
    if (image && !images.has(image.id)) {
      images.set(image.id, image);
    }
  }

  const titleMatch = html.match(OG_TITLE_RE);
  let title = titleMatch ? decodeEntities(titleMatch[1]) : albumId;

  let truncated = false;
  const contents = await fetchAlbumContents(albumId);
  if (contents) {
    title = contents.album?.name || title;
    truncated = Boolean(contents.is_output_truncated);
    for (const raw of contents.contents ?? []) {
      const image = toImage(raw);
      if (image && !images.has(image.id)) {
        images.set(image.id, image);
      }
    }
  }

  if (images.size === 0) {
    throw new AlbumNotFoundError("Album is empty or private.");
  }

  return {
    provider: "imgbb",
    albumId,
    albumUrl,
    title,
    images: Array.from(images.values()),
    truncated,
  };
}
