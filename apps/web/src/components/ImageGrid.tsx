import type { AlbumImage } from "../types";
import ImageCard from "./ImageCard";

interface Props {
  images: AlbumImage[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export default function ImageGrid({ images, selectedIds, onToggle }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 md:grid-cols-4 lg:grid-cols-5">
      {images.map((image, index) => (
        <ImageCard
          key={image.id}
          image={image}
          position={index + 1}
          selected={selectedIds.has(image.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
