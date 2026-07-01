import type { ImgbbImage } from "../types";
import ImageCard from "./ImageCard";

interface Props {
  images: ImgbbImage[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export default function ImageGrid({ images, selectedIds, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          selected={selectedIds.has(image.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
