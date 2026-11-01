import { FormEvent, useState } from "react";

interface Props {
  loading: boolean;
  initialValue?: string;
  onSubmit: (albumUrl: string) => void;
}

export default function AlbumForm({ loading, initialValue = "", onSubmit }: Props) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-4 sm:p-5">
      <label htmlFor="album-url" className="label-caps text-xs">
        From <span className="sr-only">imgbb album link</span>
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="album-url"
          name="album"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://ibb.co/album/…"
          className="mono-data min-w-0 flex-1 border-2 border-ink bg-label px-3 py-3 text-sm text-ink placeholder:text-muted focus-visible:outline-offset-0"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="label-caps border-2 border-ink bg-signal px-6 py-3 text-base text-on-signal hover:brightness-95 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-muted disabled:border-dashed"
        >
          {loading ? "Loading…" : "Load album"}
        </button>
      </div>
    </form>
  );
}
