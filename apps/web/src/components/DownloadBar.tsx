import type { DownloadProgress } from "../lib/zip";

interface Props {
  total: number;
  selectedCount: number;
  downloading: boolean;
  progress: DownloadProgress | null;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onDownload: () => void;
  onCancel: () => void;
}

const linkButton =
  "rounded text-brand-400 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300";

export default function DownloadBar({
  total,
  selectedCount,
  downloading,
  progress,
  onSelectAll,
  onSelectNone,
  onDownload,
  onCancel,
}: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <span aria-live="polite">
            {selectedCount} / {total} selected
          </span>
          <button type="button" onClick={onSelectAll} className={linkButton}>
            Select all
          </button>
          <button type="button" onClick={onSelectNone} className={linkButton}>
            Select none
          </button>
        </div>
        <div className="flex items-center gap-2">
          {downloading && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onDownload}
            disabled={selectedCount === 0 || downloading}
            className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloading ? "Downloading…" : `Download ${selectedCount} as ZIP`}
          </button>
        </div>
      </div>

      {downloading && progress && (
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <progress
            className="h-2 flex-1 overflow-hidden rounded-full accent-brand-500"
            max={progress.total}
            value={progress.done}
            aria-label="Download progress"
          />
          <span role="status" aria-live="polite" className="tabular-nums">
            {progress.done < progress.total
              ? `${progress.done} of ${progress.total} images`
              : "Building ZIP…"}
          </span>
        </div>
      )}
    </div>
  );
}
