import { nextPreference, useTheme, type ThemePreference } from "../lib/theme";

const LABELS: Record<ThemePreference, string> = {
  system: "Auto",
  light: "Light",
  dark: "Dark",
};

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;

  if (preference === "light") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="3" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" />
      </svg>
    );
  }
  if (preference === "dark") {
    return (
      <svg {...common}>
        <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Steps through Auto (system setting), Light and Dark. */
export default function ThemeToggle() {
  const { preference, cycle } = useTheme();
  const next = LABELS[nextPreference(preference)];
  const current =
    preference === "system" ? "Auto, follows your system setting" : LABELS[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Color theme: ${current}. Switch to ${next}.`}
      title={`Switch to ${next}`}
      className="label-caps inline-flex items-center gap-2 border-2 border-ink bg-label px-3 py-1.5 text-xs text-ink hover:bg-ink hover:text-label"
    >
      <ThemeIcon preference={preference} />
      <span aria-hidden="true">{LABELS[preference]}</span>
    </button>
  );
}
