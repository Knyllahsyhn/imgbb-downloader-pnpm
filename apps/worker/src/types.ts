/** Image hosts the worker can read albums from. */
export type Provider = "imgbb" | "catbox";

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

/** A recognised album link, before its page has been fetched. */
export interface AlbumRef {
  provider: Provider;
  albumId: string;
  albumUrl: string;
}
