import { useMemo } from "react";
import { encodeCode128, isEncodable } from "../lib/code128";

interface Props {
  value: string;
  className?: string;
}

const QUIET_ZONE = 10;

/** Scannable Code 128 barcode, drawn in the current text colour. */
export default function Barcode({ value, className }: Props) {
  const code = useMemo(() => (isEncodable(value) ? encodeCode128(value) : null), [value]);
  if (!code) return null;
  const width = code.width + QUIET_ZONE * 2;

  return (
    <svg
      viewBox={`0 0 ${width} 40`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={`Barcode for album ${value}`}
    >
      {code.bars.map((bar) => (
        <rect
          key={bar.x}
          x={bar.x + QUIET_ZONE}
          y={0}
          width={bar.width}
          height={40}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
