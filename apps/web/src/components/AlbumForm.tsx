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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
      <label htmlFor="album-url" className="sr-only">
        imgbb album link
      </label>
      <input
        id="album-url"
        name="album"
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://ibb.co/album/xxxxxx"
        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-400 outline-hidden ring-brand-500 focus-visible:ring-2"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Loading…" : "Load album"}
      </button>
    </form>
  );
}
