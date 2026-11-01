import { CHANGELOG } from "../changelog";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function WhatsNew() {
  const latest = CHANGELOG[0];

  return (
    <details className="group w-full max-w-xl border-2 border-ink bg-label text-ink">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="label-caps text-sm">What's new</span>
        <span className="mono-data flex items-center gap-3 text-xs text-muted">
          <time dateTime={latest.date}>{formatDate(latest.date)}</time>
          <span
            aria-hidden="true"
            className="inline-block motion-safe:transition-transform group-open:rotate-45"
          >
            +
          </span>
        </span>
      </summary>
      <ol className="border-t-2 border-ink">
        {CHANGELOG.map((entry) => (
          <li
            key={entry.date}
            className="grid gap-x-4 gap-y-1 border-b border-dashed border-ink/40 px-4 py-3 last:border-b-0 sm:grid-cols-[7.5rem_1fr]"
          >
            <time dateTime={entry.date} className="mono-data text-xs text-muted sm:pt-0.5">
              {formatDate(entry.date)}
            </time>
            <ul className="flex flex-col gap-1 text-sm">
              {entry.changes.map((change) => (
                <li key={change} className="flex gap-2">
                  <span aria-hidden="true" className="text-muted">
                    –
                  </span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </details>
  );
}
