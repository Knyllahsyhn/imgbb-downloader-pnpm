import { useEffect, useRef, useState } from "react";
import AlbumForm from "./components/AlbumForm";
import ImageGrid from "./components/ImageGrid";
import DownloadBar from "./components/DownloadBar";
import BrandingLogo from "./components/BrandingLogo";
import SupportButton from "./components/SupportButton";
import { fetchAlbum, ApiRequestError } from "./lib/api";
import { AllDownloadsFailedError, downloadAlbumAsZip, type DownloadProgress } from "./lib/zip";
import type { AlbumResult, ImgbbImage } from "./types";

const ALBUM_PARAM = "album";
const PRIVACY_URL = "https://github.com/Knyllahsyhn/imgbb-downloader-pnpm/blob/main/PRIVACY.md";

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

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-10">
      <main className="flex flex-1 flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">imgbb Album Downloader</h1>
          <p className="text-sm text-slate-400">
            Paste an album link, pick your images, download them as a ZIP.
          </p>
        </header>

        <AlbumForm
          key={formKey}
          loading={loading}
          initialValue={readAlbumParam()}
          onSubmit={handleSubmit}
        />

        <div role="alert" className="empty:hidden">
          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div role="status" className="empty:hidden">
          {failedImages.length > 0 && (
            <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
              <p>
                The ZIP was created, but {failedImages.length} image
                {failedImages.length === 1 ? "" : "s"} could not be downloaded:
              </p>
              <ul className="mt-1 list-inside list-disc">
                {failedImages.map((image) => (
                  <li key={image.id}>
                    <a
                      href={image.pageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-amber-200"
                    >
                      {image.filename}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {album && (
          <>
            {album.truncated && (
              <div
                role="status"
                className="rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-300"
              >
                imgbb truncated this album's response. Only the first {album.images.length} images
                are shown.
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{album.title}</h2>
              <a
                href={album.albumUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand-400 hover:underline"
              >
                Open on imgbb ↗
              </a>
            </div>

            <DownloadBar
              total={album.images.length}
              selectedCount={selectedIds.size}
              downloading={downloading}
              progress={progress}
              onSelectAll={() => setSelectedIds(new Set(album.images.map((i) => i.id)))}
              onSelectNone={() => setSelectedIds(new Set())}
              onDownload={handleDownload}
              onCancel={() => downloadController.current?.abort()}
            />

            <ImageGrid images={album.images} selectedIds={selectedIds} onToggle={toggle} />
          </>
        )}
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-6 text-xs text-slate-400">
        <div className="basis-full text-center">
          <SupportButton />
        </div>
        <span className="flex items-center gap-2">
          <BrandingLogo className="h-4 w-4" />
          <span>
            Built by{" "}
            <span className="bg-linear-to-r from-[#3e5aff] to-[#8e2bff] bg-clip-text font-semibold text-transparent">
              KNYL
            </span>
          </span>
        </span>
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="hover:underline">
          Privacy
        </a>
      </footer>
    </div>
  );
}
