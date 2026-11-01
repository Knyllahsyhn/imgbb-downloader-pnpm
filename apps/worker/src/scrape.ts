import type { AlbumRef, AlbumResult } from "./types";
import { InvalidAlbumUrlError } from "./shared";
import { fetchImgbbAlbum, isImgbbHost, parseImgbbUrl } from "./imgbb";
import { fetchCatboxAlbum, isCatboxHost, parseCatboxUrl } from "./catbox";

export { AlbumNotFoundError, InvalidAlbumUrlError } from "./shared";

/**
 * Recognises an album link from one of the supported hosts.
 * A bare ID without a host is read as an imgbb album, as before Catbox support.
 */
export function parseAlbumInput(input: string): AlbumRef {
  const trimmed = input.trim();
  if (!trimmed) throw new InvalidAlbumUrlError("Empty input.");

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    // Links pasted without the scheme, e.g. "catbox.moe/c/abc123".
    candidate = /^[a-z0-9.-]+\.[a-z]{2,}\//i.test(candidate)
      ? `https://${candidate}`
      : `https://ibb.co/album/${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new InvalidAlbumUrlError("That's not a valid URL.");
  }

  if (isImgbbHost(parsed.hostname)) return parseImgbbUrl(parsed);
  if (isCatboxHost(parsed.hostname)) return parseCatboxUrl(parsed);
  throw new InvalidAlbumUrlError(
    "Only imgbb (ibb.co) and Catbox (catbox.moe) albums are supported.",
  );
}

export async function fetchAlbum(input: string): Promise<AlbumResult> {
  const ref = parseAlbumInput(input);
  switch (ref.provider) {
    case "imgbb":
      return fetchImgbbAlbum(ref);
    case "catbox":
      return fetchCatboxAlbum(ref);
  }
}
