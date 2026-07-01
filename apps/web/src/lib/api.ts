import type { AlbumResult, ApiError } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export class ApiRequestError extends Error {}

export async function fetchAlbum(albumInput: string): Promise<AlbumResult> {
  if (!API_BASE_URL) {
    throw new ApiRequestError("VITE_API_BASE_URL is not set. See apps/web/.env.example.");
  }

  const url = new URL("/api/album", API_BASE_URL);
  url.searchParams.set("url", albumInput);

  const res = await fetch(url.toString());
  const body = (await res.json()) as AlbumResult | ApiError;

  if (!res.ok) {
    throw new ApiRequestError("error" in body ? body.error : "Unknown error.");
  }

  return body as AlbumResult;
}
