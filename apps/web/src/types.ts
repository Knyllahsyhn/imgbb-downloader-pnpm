/** Image hosts the worker can read albums from. */
export type Provider = "imgbb" | "catbox";

/** Display names, e.g. for "Open on …". */
export const PROVIDER_NAMES: Record<Provider, string> = {
  imgbb: "imgbb",
  catbox: "Catbox",
};

export interface AlbumImage {
  id: string;
  title: string;
  filename: string;
  thumbUrl: string;
  mediumUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  sizeBytes: number | null;
  pageUrl: string;
}

export interface AlbumResult {
  provider: Provider;
  albumId: string;
  albumUrl: string;
  title: string;
  images: AlbumImage[];
  truncated: boolean;
}

export interface ApiError {
  error: string;
}
