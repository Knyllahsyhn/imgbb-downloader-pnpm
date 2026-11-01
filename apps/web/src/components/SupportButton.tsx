const SUPPORT_URL = "https://buymeacoffee.com/kex1jmlg";

/**
 * Static copy of the Buy Me a Coffee widget button. The official widget loads
 * a third-party script and Google Fonts, which the CSP and PRIVACY.md rule out.
 */
export default function SupportButton() {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-[60px] min-w-[210px] items-center gap-2 rounded-xl bg-[#FFDD00] px-6 font-cookie text-[28px] leading-none whitespace-nowrap text-black no-underline transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
    >
      <span aria-hidden="true">🔌</span>
      <span>Help pay my electricity bill</span>
    </a>
  );
}
