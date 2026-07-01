import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { ImgbbImage } from "../types";

export interface DownloadProgress {
  done: number;
  total: number;
}

function uniqueFilename(existing: Set<string>, filename: string): string {
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

export async function downloadAlbumAsZip(
  albumTitle: string,
  images: ImgbbImage[],
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> {
  const zip = new JSZip();
  const usedNames = new Set<string>();
  let done = 0;

  await Promise.all(
    images.map(async (image) => {
      const res = await fetch(image.fullUrl);
      if (!res.ok) throw new Error(`Download failed: ${image.filename}`);
      const blob = await res.blob();
      zip.file(uniqueFilename(usedNames, image.filename), blob);
      done += 1;
      onProgress?.({ done, total: images.length });
    }),
  );

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const safeTitle = albumTitle.replace(/[\\/:*?"<>|]+/g, "_").trim() || "album";
  saveAs(zipBlob, `${safeTitle}.zip`);
}

export async function downloadSingleImage(image: ImgbbImage): Promise<void> {
  const res = await fetch(image.fullUrl);
  if (!res.ok) throw new Error(`Download fehlgeschlagen: ${image.filename}`);
  const blob = await res.blob();
  saveAs(blob, image.filename);
}
