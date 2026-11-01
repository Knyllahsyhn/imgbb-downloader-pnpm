import type { DownloadProgress } from "../lib/zip";
import { formatBytes } from "../lib/format";

interface Props {
  total: number;
  selectedCount: number;
  selectedBytes: number;
  downloading: boolean;
  progress: DownloadProgress | null;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onDownload: () => void;
  onCancel: () => void;
}

const textButton = "underline decoration-2 underline-offset-4 hover:decoration-signal";

export default function DownloadBar({
  total,
  selectedCount,
  selectedBytes,
  downloading,
  progress,
  onSelectAll,
  onSelectNone,
  onDownload,
  onCancel,
}: Props) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <span className="label-caps text-xs">Contents</span>
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span aria-live="polite" className="label-display text-3xl">
              {selectedCount} of {total} selected
            </span>
            {selectedBytes > 0 && (
              <span className="mono-data text-xs text-muted">{formatBytes(selectedBytes)}</span>
            )}
          </p>
          <div className="flex gap-4 text-sm">
            <button type="button" onClick={onSelectAll} className={textButton}>
              Select all
            </button>
            <button type="button" onClick={onSelectNone} className={textButton}>
              Select none
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          {downloading && (
            <button
              type="button"
              onClick={onCancel}
              className="label-caps border-2 border-ink bg-label px-4 py-3 text-base hover:bg-ink hover:text-label"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onDownload}
            disabled={selectedCount === 0 || downloading}
            className="label-caps border-2 border-ink bg-signal px-6 py-3 text-base text-on-signal hover:brightness-95 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-transparent disabled:text-muted"
          >
            {downloading ? "Downloading…" : `Download ${selectedCount} as ZIP`}
          </button>
        </div>
      </div>

      {downloading && progress && (
        <div className="flex items-center gap-3">
          <div
            className="h-4 flex-1 border-2 border-ink"
            role="progressbar"
            aria-label="Download progress"
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-valuenow={progress.done}
          >
            <div
              className="h-full bg-[repeating-linear-gradient(-45deg,var(--ink)_0_4px,transparent_4px_8px)] motion-safe:transition-[width]"
              style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
          <span role="status" aria-live="polite" className="mono-data text-xs tabular-nums">
            {progress.done < progress.total
              ? `${progress.done} of ${progress.total} images`
              : "Building ZIP…"}
          </span>
        </div>
      )}
    </div>
  );
}
