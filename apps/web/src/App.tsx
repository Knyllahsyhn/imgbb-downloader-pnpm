import { useEffect, useRef, useState } from "react";
import AlbumForm from "./components/AlbumForm";
import ImageGrid from "./components/ImageGrid";
import DownloadBar from "./components/DownloadBar";
import BrandingLogo from "./components/BrandingLogo";
import SupportButton from "./components/SupportButton";
import Barcode from "./components/Barcode";
import ThemeToggle from "./components/ThemeToggle";
import WhatsNew from "./components/WhatsNew";
import { fetchAlbum, ApiRequestError } from "./lib/api";
import {
  AllDownloadsFailedError,
  downloadAlbumAsZip,
  safeZipName,
  type DownloadProgress,
} from "./lib/zip";
import type { AlbumResult, ImgbbImage } from "./types";

const ALBUM_PARAM = "album";
const PRIVACY_URL = "https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/blob/main/PRIVACY.md";
const GITHUB_URL = "https://github.com/Knyllahsyhn";

function readAlbumParam(): string {
  return new URLSearchParams(window.location.search).get(ALBUM_PARAM) ?? "";
}

function writeAlbumParam(albumUrl: string): void {
  const url = new URL(window.location.href);
  if (url.searchParams.get(ALBUM_PARAM) === albumUrl) return;
  url.searchParams.set(ALBUM_PARAM, albumUrl);
  window.history.pushState(null, "", url);
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

export default function App() {
  const [formKey, setFormKey] = useState(0);
  const [album, setAlbum] = useState<AlbumResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // An album in the address bar is loaded right away, so start in the loading state.
  const [loading, setLoading] = useState(() => readAlbumParam() !== "");
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<ImgbbImage[]>([]);
  const loadController = useRef<AbortController | null>(null);
  const downloadController = useRef<AbortController | null>(null);

  function loadAlbum(albumUrl: string) {
    setLoading(true);
    setError(null);
    setFailedImages([]);
    setAlbum(null);
    void fetchIntoState(albumUrl);
  }

  /** Fetches an album and stores the outcome. Only sets state after the request settles. */
  async function fetchIntoState(albumUrl: string) {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    try {
      const result = await fetchAlbum(albumUrl, controller.signal);
      setAlbum(result);
      setSelectedIds(new Set(result.images.map((i) => i.id)));
    } catch (err) {
      if (isAbort(err)) return;
      setError(err instanceof ApiRequestError ? err.message : "Could not load album.");
    } finally {
      if (loadController.current === controller) setLoading(false);
    }
  }

  function handleSubmit(albumUrl: string) {
    writeAlbumParam(albumUrl);
    loadAlbum(albumUrl);
  }

  // Load the album from the address bar on first visit and on back/forward navigation.
  useEffect(() => {
    const initialAlbum = readAlbumParam();
    if (initialAlbum) void fetchIntoState(initialAlbum);
    function onPopState() {
      const value = readAlbumParam();
      setFormKey((k) => k + 1);
      if (value) {
        loadAlbum(value);
      } else {
        loadController.current?.abort();
        setLoading(false);
        setAlbum(null);
        setError(null);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      loadController.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDownload() {
    if (!album) return;
    const selected = album.images.filter((i) => selectedIds.has(i.id));
    const controller = new AbortController();
    downloadController.current = controller;

    setDownloading(true);
    setProgress({ done: 0, total: selected.length });
    setError(null);
    setFailedImages([]);
    try {
      const { failed } = await downloadAlbumAsZip(album.title, selected, {
        onProgress: setProgress,
        signal: controller.signal,
      });
      setFailedImages(failed);
    } catch (err) {
      if (isAbort(err)) return;
      setError(
        err instanceof AllDownloadsFailedError
          ? err.message
          : "Something went wrong while building the ZIP.",
      );
    } finally {
      downloadController.current = null;
      setDownloading(false);
      setProgress(null);
    }
  }

  const selectedBytes = album
    ? album.images.reduce((sum, i) => (selectedIds.has(i.id) ? sum + (i.sizeBytes ?? 0) : sum), 0)
    : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-sm text-ink">
          <BrandingLogo className="h-5 w-5" />
          <span className="label-caps">KNYL</span>
        </span>
        <ThemeToggle />
      </div>

      <main className="flex flex-1 flex-col">
        <div className="border-[3px] border-ink bg-label text-ink shadow-[6px_6px_0_0_rgb(0_0_0/0.18)]">
          <header className="flex items-stretch border-b-[3px] border-ink">
            <div className="flex min-w-0 flex-1 flex-col justify-end gap-3 p-4 sm:p-5">
              <h1 className="label-display text-[clamp(2.25rem,11vw,4.5rem)] break-words">
                imgbb Album Downloader
              </h1>
              <p className="max-w-md text-sm">
                Paste an album link, pick your images, download them as a ZIP.
              </p>
            </div>
            <div
              aria-hidden="true"
              className="label-display flex w-16 shrink-0 items-center justify-center bg-ink text-3xl text-label [writing-mode:vertical-rl] sm:w-40 sm:text-7xl sm:[writing-mode:horizontal-tb]"
            >
              ZIP
            </div>
          </header>

          <section className="border-b-[3px] border-ink">
            <AlbumForm
              key={formKey}
              loading={loading}
              initialValue={readAlbumParam()}
              onSubmit={handleSubmit}
            />
            <div role="alert" className="empty:hidden">
              {error && (
                <p className="mx-4 mb-4 border-2 border-error px-3 py-2 text-sm font-medium text-error sm:mx-5 sm:mb-5">
                  {error}
                </p>
              )}
            </div>
          </section>

          <section className="grid border-b-[3px] border-ink sm:grid-cols-[1fr_minmax(0,22rem)]">
            <div className="flex flex-col gap-1 p-4 sm:p-5">
              <span className="label-caps text-xs">Ship to</span>
              <p className="label-display text-3xl sm:text-4xl">Your downloads folder</p>
              <p className="mono-data truncate text-xs text-muted">
                {album ? safeZipName(album.title) : "album.zip"}
              </p>
            </div>
            <div className="flex flex-col justify-center gap-1.5 border-t-2 border-ink p-4 sm:border-t-0 sm:border-l-2 sm:p-5">
              {album ? (
                <>
                  <Barcode value={album.albumId} className="h-14 w-full text-ink" />
                  <div className="mono-data flex items-center justify-between gap-3 text-xs">
                    <span>
                      Album <span className="font-bold">{album.albumId}</span>
                    </span>
                    <a
                      href={album.albumUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-2 underline-offset-4 hover:decoration-signal"
                    >
                      Open on imgbb ↗
                    </a>
                  </div>
                </>
              ) : (
                <p className="mono-data grid h-14 place-items-center border-2 border-dashed border-muted text-xs text-muted">
                  No album loaded
                </p>
              )}
            </div>
          </section>

          {album ? (
            <section aria-labelledby="album-title">
              <div className="border-b-2 border-ink px-4 pt-4 sm:px-5 sm:pt-5">
                <h2 id="album-title" className="label-display pb-3 text-2xl break-words">
                  {album.title}
                </h2>
              </div>

              {album.truncated && (
                <p
                  role="status"
                  className="border-b-2 border-ink bg-signal px-4 py-2 text-sm font-medium text-on-signal sm:px-5"
                >
                  imgbb only returned the first {album.images.length} images of this album.
                </p>
              )}

              <div className="border-b-2 border-ink">
                <DownloadBar
                  total={album.images.length}
                  selectedCount={selectedIds.size}
                  selectedBytes={selectedBytes}
                  downloading={downloading}
                  progress={progress}
                  onSelectAll={() => setSelectedIds(new Set(album.images.map((i) => i.id)))}
                  onSelectNone={() => setSelectedIds(new Set())}
                  onDownload={handleDownload}
                  onCancel={() => downloadController.current?.abort()}
                />
              </div>

              <div role="status" className="empty:hidden">
                {failedImages.length > 0 && (
                  <div className="border-b-2 border-ink px-4 py-3 text-sm sm:px-5">
                    <p className="font-medium">
                      The ZIP was created, but {failedImages.length} image
                      {failedImages.length === 1 ? "" : "s"} could not be downloaded:
                    </p>
                    <ul className="mono-data mt-1 flex flex-col gap-0.5 text-xs">
                      {failedImages.map((image) => (
                        <li key={image.id}>
                          <a
                            href={image.pageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-2 underline-offset-4"
                          >
                            {image.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <ImageGrid images={album.images} selectedIds={selectedIds} onToggle={toggle} />
            </section>
          ) : (
            <section className="flex flex-col gap-1 p-4 sm:p-5">
              <span className="label-caps text-xs">Contents</span>
              <p className="text-sm text-muted">
                {loading
                  ? "Loading the album…"
                  : "Paste an imgbb album link above. Its images show up here, and you choose which ones go into the ZIP."}
              </p>
            </section>
          )}
        </div>
      </main>

      <footer className="flex flex-col items-center gap-4 pt-4 text-ink">
        <SupportButton />
        <WhatsNew />
        <p className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            Built by
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-bold underline decoration-2 underline-offset-4"
            >
              <BrandingLogo className="h-4 w-4" />
              KNYL
            </a>
          </span>
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-2 underline-offset-4"
          >
            Privacy
          </a>
        </p>
      </footer>
    </div>
  );
}
