import type { ImgbbImage } from "../types";
import { formatBytes } from "../lib/format";

interface Props {
  image: ImgbbImage;
  position: number;
  selected: boolean;
  onToggle: (id: string) => void;
}

export default function ImageCard({ image, position, selected, onToggle }: Props) {
  const meta = [
    image.width && image.height ? `${image.width}×${image.height}` : "",
    formatBytes(image.sizeBytes),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <label
      className={`group relative flex cursor-pointer flex-col border-2 bg-label ${
        selected ? "border-ink" : "border-dashed border-muted"
      }`}
    >
      <input
        type="checkbox"
        className="peer absolute top-2 left-2 z-10 size-6 cursor-pointer appearance-none border-2 border-ink bg-label checked:bg-ink focus-visible:outline-offset-1"
        checked={selected}
        onChange={() => onToggle(image.id)}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 left-2 z-20 hidden size-6 place-items-center text-sm leading-none font-black text-label peer-checked:grid"
      >
        ✓
      </span>
      <div className="aspect-square w-full overflow-hidden border-b-2 border-inherit">
        <img
          src={image.thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover motion-safe:transition ${
            selected ? "" : "opacity-60 grayscale group-hover:opacity-90"
          }`}
        />
      </div>
      <div className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="flex items-baseline gap-2 text-sm">
          <span className="mono-data text-xs font-bold">{String(position).padStart(2, "0")}</span>
          <span className="truncate font-medium">{image.title}</span>
        </span>
        <span className="mono-data truncate text-[11px] text-muted">{meta}</span>
      </div>
    </label>
  );
}
