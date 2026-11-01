export interface ChangelogEntry {
  /** ISO date of the release. */
  date: string;
  changes: string[];
}

/** Newest first. Shown under "What's new" in the footer. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-11-01",
    changes: [
      "New look in the style of a shipping label, with light and dark mode.",
      "The album link stays in the address bar, so you can share or reload it.",
      "If single images fail, the ZIP is still created and lists the missing files.",
      "Running downloads can be cancelled.",
      "Works with screen readers and keyboard only.",
      "Albums you opened in the last five minutes load instantly.",
    ],
  },
  {
    date: "2026-07-01",
    changes: [
      "First release: paste an imgbb album link, pick images, download them as one ZIP.",
      "Loads the complete album, also beyond the first page of images.",
    ],
  },
];
