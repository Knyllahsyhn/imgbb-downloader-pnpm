import { useState } from "react";
import AlbumForm from "./components/AlbumForm";
import ImageGrid from "./components/ImageGrid";
import DownloadBar from "./components/DownloadBar";
import KnylMark from "./components/KnylMark";
import { fetchAlbum, ApiRequestError } from "./lib/api";
import { downloadAlbumAsZip, type DownloadProgress } from "./lib/zip";
import type { AlbumResult } from "./types";

export default function App() {
  const [album, setAlbum] = useState<AlbumResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLoadAlbum(albumUrl: string) {
    setLoading(true);
    setError(null);
    setAlbum(null);
    try {
      const result = await fetchAlbum(albumUrl);
      setAlbum(result);
      setSelectedIds(new Set(result.images.map((i) => i.id)));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load album.");
    } finally {
      setLoading(false);
    }
  }

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
    setDownloading(true);
    setProgress({ done: 0, total: selected.length });
    setError(null);
    try {
      await downloadAlbumAsZip(album.title, selected, setProgress);
    } catch {
      setError("Something went wrong while building the ZIP.");
    } finally {
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

        <AlbumForm loading={loading} onSubmit={handleLoadAlbum} />

        {error && (
          <div className="rounded-xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {album && (
          <>
            {album.truncated && (
              <div className="rounded-xl border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-300">
                imgbb truncated this album's response — only the first {album.images.length} images
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
            />

            <ImageGrid images={album.images} selectedIds={selectedIds} onToggle={toggle} />
          </>
        )}
      </main>

      <footer className="flex items-center justify-center gap-2 pt-6 text-xs text-slate-600">
        <KnylMark className="h-4 w-4" />
        <span>
          Built by{" "}
          <span className="bg-gradient-to-r from-[#3e5aff] to-[#8e2bff] bg-clip-text font-semibold text-transparent">
            KNYL
          </span>
        </span>
      </footer>
    </div>
  );
}
