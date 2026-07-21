import { FormEvent, useState } from "react";

interface Props {
  loading: boolean;
  onSubmit: (albumUrl: string) => void;
}

export default function AlbumForm({ loading, onSubmit }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3 sm:flex-row">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://ibb.co/album/xxxxxx"
        className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-hidden ring-brand-500 focus:ring-2"
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Loading…" : "Load album"}
      </button>
    </form>
  );
}
