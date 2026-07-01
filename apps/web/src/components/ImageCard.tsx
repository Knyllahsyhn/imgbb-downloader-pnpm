import type { ImgbbImage } from "../types";

interface Props {
  image: ImgbbImage;
  selected: boolean;
  onToggle: (id: string) => void;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export default function ImageCard({ image, selected, onToggle }: Props) {
  return (
    <label
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition ${
        selected
          ? "border-brand-500 ring-2 ring-brand-500"
          : "border-slate-800 hover:border-slate-600"
      } bg-slate-900`}
    >
      <input
        type="checkbox"
        className="absolute left-2 top-2 z-10 h-5 w-5 accent-brand-500"
        checked={selected}
        onChange={() => onToggle(image.id)}
      />
      <div className="aspect-square w-full overflow-hidden bg-slate-800">
        <img
          src={image.thumbUrl}
          alt={image.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-0.5 p-2">
        <span className="truncate text-xs font-medium text-slate-200">{image.title}</span>
        <span className="text-[11px] text-slate-500">
          {image.width && image.height ? `${image.width}×${image.height}` : ""}
          {image.sizeBytes ? ` · ${formatBytes(image.sizeBytes)}` : ""}
        </span>
      </div>
    </label>
  );
}
