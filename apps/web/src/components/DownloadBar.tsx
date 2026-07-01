import type { DownloadProgress } from "../lib/zip";

interface Props {
  total: number;
  selectedCount: number;
  downloading: boolean;
  progress: DownloadProgress | null;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onDownload: () => void;
}

export default function DownloadBar({
  total,
  selectedCount,
  downloading,
  progress,
  onSelectAll,
  onSelectNone,
  onDownload,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex items-center gap-3 text-sm text-slate-300">
        <span>
          {selectedCount} / {total} selected
        </span>
        <button onClick={onSelectAll} className="text-brand-400 hover:underline">
          All
        </button>
        <button onClick={onSelectNone} className="text-brand-400 hover:underline">
          None
        </button>
      </div>
      <button
        onClick={onDownload}
        disabled={selectedCount === 0 || downloading}
        className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloading
          ? progress
            ? `Downloading ${progress.done}/${progress.total}…`
            : "Building ZIP…"
          : `Download ${selectedCount} as ZIP`}
      </button>
    </div>
  );
}
