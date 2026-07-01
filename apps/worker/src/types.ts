export interface ImgbbImage {
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
  albumId: string;
  albumUrl: string;
  title: string;
  images: ImgbbImage[];
  truncated: boolean;
}

export interface Env {
  ALLOWED_ORIGIN: string;
}
