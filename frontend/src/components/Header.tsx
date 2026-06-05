import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/query", label: "Query" },
  { href: "/receipts", label: "Receipts" },
  { href: "/stats", label: "Stats" },
];

export default function Header() {
  return (
    <header
      style={{ backgroundColor: "var(--navy)", color: "var(--white)" }}
      className="w-full"
    >
      <div className="mx-auto flex max-w-[900px] items-center justify-between px-6 py-4">
        <span className="text-sm font-semibold tracking-wide">
          EM Foundation — CR-Lite
        </span>
        <nav className="flex items-center gap-3 text-sm">
          {NAV_LINKS.map((link, index) => (
            <span key={link.href} className="flex items-center gap-3">
              {index > 0 && (
                <span className="opacity-50" aria-hidden="true">
                  |
                </span>
              )}
              <Link
                href={link.href}
                className="text-white no-underline hover:underline"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </header>
  );
}
