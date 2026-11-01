export class InvalidAlbumUrlError extends Error {}
export class AlbumNotFoundError extends Error {}

export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#039;": "'",
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(amp|quot|#039|#39|lt|gt);/g, (m) => HTML_ENTITIES[m] ?? m);
}

/** Fetches an album page like a browser would and maps the usual failures to errors. */
export async function fetchAlbumPage(albumUrl: string, hostName: string): Promise<string> {
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
    throw new Error(`${hostName} responded with status ${res.status}.`);
  }
  return res.text();
}
