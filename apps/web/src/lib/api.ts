import type { AlbumResult, ApiError } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const REQUEST_TIMEOUT_MS = 30_000;

export class ApiRequestError extends Error {}

export async function fetchAlbum(albumInput: string, signal?: AbortSignal): Promise<AlbumResult> {
  if (!API_BASE_URL) {
    throw new ApiRequestError("VITE_API_BASE_URL is not set. See apps/web/.env.example.");
  }

  const url = new URL("/api/album", API_BASE_URL);
  url.searchParams.set("url", albumInput);

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (err) {
    if (signal?.aborted) throw err;
    if (timeout.aborted) {
      throw new ApiRequestError("The server took too long to answer. Please try again.");
    }
    throw new ApiRequestError("Could not reach the server. Check your connection.");
  }

  let body: AlbumResult | ApiError | null = null;
  try {
    body = (await res.json()) as AlbumResult | ApiError;
  } catch {
    // Non-JSON answer, e.g. an HTML error page from the platform.
  }

  if (!res.ok || !body) {
    if (body && "error" in body) throw new ApiRequestError(body.error);
    throw new ApiRequestError(`Unexpected server response (HTTP ${res.status}).`);
  }

  return body as AlbumResult;
}
