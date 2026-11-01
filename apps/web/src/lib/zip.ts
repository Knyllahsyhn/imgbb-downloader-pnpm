import JSZip from "jszip";
import type { AlbumImage } from "../types";

export interface DownloadProgress {
  done: number;
  total: number;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  signal?: AbortSignal;
  /** Maximum number of images fetched at the same time. */
  concurrency?: number;
  /** Per-image timeout in milliseconds. */
  timeoutMs?: number;
}

export interface DownloadResult {
  failed: AlbumImage[];
}

export class AllDownloadsFailedError extends Error {}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function uniqueFilename(existing: Set<string>, filename: string): string {
  if (!existing.has(filename)) {
    existing.add(filename);
    return filename;
  }
  const dot = filename.lastIndexOf(".");
  const base = dot === -1 ? filename : filename.slice(0, dot);
  const ext = dot === -1 ? "" : filename.slice(dot);
  let i = 2;
  let candidate = `${base} (${i})${ext}`;
  while (existing.has(candidate)) {
    i += 1;
    candidate = `${base} (${i})${ext}`;
  }
  existing.add(candidate);
  return candidate;
}

export function safeZipName(albumTitle: string): string {
  return `${albumTitle.replace(/[\\/:*?"<>|]+/g, "_").trim() || "album"}.zip`;
}

/**
 * Runs `worker` over `items` with at most `limit` calls in flight.
 * Results keep the input order.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(runners);
  return results;
}

async function fetchImage(image: AlbumImage, signal: AbortSignal): Promise<Blob> {
  const res = await fetch(image.fullUrl, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${image.filename}`);
  return res.blob();
}

/**
 * Downloads the given images and offers them as one ZIP file.
 * Images that fail are skipped and reported in the result; the ZIP is only
 * aborted when the caller cancels or every image fails.
 */
export async function downloadAlbumAsZip(
  albumTitle: string,
  images: AlbumImage[],
  { onProgress, signal, concurrency = 5, timeoutMs = 60_000 }: DownloadOptions = {},
): Promise<DownloadResult> {
  const zip = new JSZip();
  const usedNames = new Set<string>();
  const failed: AlbumImage[] = [];
  let done = 0;

  await mapWithConcurrency(images, concurrency, async (image) => {
    signal?.throwIfAborted();
    const imageSignal = signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
    try {
      const blob = await fetchImage(image, imageSignal);
      zip.file(uniqueFilename(usedNames, image.filename), blob);
    } catch (err) {
      if (signal?.aborted) throw err;
      failed.push(image);
    }
    done += 1;
    onProgress?.({ done, total: images.length });
  });

  if (failed.length === images.length) {
    throw new AllDownloadsFailedError("None of the selected images could be downloaded.");
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  signal?.throwIfAborted();
  triggerDownload(zipBlob, safeZipName(albumTitle));
  return { failed };
}
