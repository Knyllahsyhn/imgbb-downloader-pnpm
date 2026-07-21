import type { AlbumResult, ImgbbImage } from "./types";

const DATA_OBJECT_RE = /data-object=(['"])([\s\S]*?)\1/g;
const OG_TITLE_RE = /<meta property="og:title" content="([^"]*)"/;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#039;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

function decodeEntities(text: string): string {
  return text.replace(/&(amp|quot|#039|lt|gt);/g, (m) => HTML_ENTITIES[m] ?? m);
}

export class InvalidAlbumUrlError extends Error {}
export class AlbumNotFoundError extends Error {}

export function parseAlbumInput(input: string): { albumId: string; albumUrl: string } {
  const trimmed = input.trim();
  if (!trimmed) throw new InvalidAlbumUrlError("Empty input.");

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://ibb.co/album/${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new InvalidAlbumUrlError("That's not a valid URL.");
  }

  if (!/(^|\.)ibb\.co$|(^|\.)imgbb\.com$/i.test(parsed.hostname)) {
    throw new InvalidAlbumUrlError("Only ibb.co / imgbb.com album links are supported.");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const albumIndex = segments.indexOf("album");
  const albumId = albumIndex !== -1 ? segments[albumIndex + 1] : undefined;
  if (!albumId) {
    throw new InvalidAlbumUrlError(
      "Could not read an album ID from the URL. Expected: https://ibb.co/album/<id>",
    );
  }

  return { albumId, albumUrl: `https://ibb.co/album/${albumId}` };
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

function toImage(raw: RawDataObject): ImgbbImage | null {
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

export async function fetchAlbum(input: string): Promise<AlbumResult> {
  const { albumId, albumUrl } = parseAlbumInput(input);

  const res = await fetch(albumUrl, {
    headers: {
      "User-Agent": BROWSER_USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (res.status === 404) {
    throw new AlbumNotFoundError("Album not found (private or deleted?).");
  }
  if (!res.ok) {
    throw new Error(`imgbb responded with status ${res.status}.`);
  }

  const html = await res.text();

  const images = new Map<string, ImgbbImage>();
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
    albumId,
    albumUrl,
    title,
    images: Array.from(images.values()),
    truncated,
  };
}
