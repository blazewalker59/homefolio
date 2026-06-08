import { Link } from "@tanstack/react-router";
import {
  DoorOpen,
  Wrench,
  Package,
  FileText,
  ClipboardList,
  Map,
  type LucideIcon,
} from "lucide-react";

type Tab = {
  to: "/rooms" | "/systems" | "/items" | "/documents" | "/activities" | "/blueprint";
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { to: "/blueprint", label: "Blueprint", icon: Map },
  { to: "/rooms", label: "Rooms", icon: DoorOpen },
  { to: "/systems", label: "Systems", icon: Wrench },
  { to: "/items", label: "Items", icon: Package },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/activities", label: "Activities", icon: ClipboardList },
];

export default function SectionTabs() {
  return (
    <>
      {/* Desktop / wide — horizontal tab strip under the header. */}
      <nav aria-label="Sections" className="hidden border-b border-[var(--line)] md:block">
        <div className="page-wrap flex items-stretch gap-1 px-4">
          {TABS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group relative -mb-px flex items-center gap-2 px-3 py-3 text-sm font-medium no-underline transition"
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <Icon
                    className={`h-4 w-4 transition ${
                      isActive ? "text-[var(--lagoon-deep)]" : "text-[var(--sea-ink-soft)]"
                    }`}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span
                    className={`transition ${
                      isActive
                        ? "text-[var(--lagoon-deep)]"
                        : "text-[var(--sea-ink-soft)] group-hover:text-[var(--sea-ink)]"
                    }`}
                  >
                    {label}
                  </span>
                  <span
                    className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full transition ${
                      isActive ? "bg-[var(--lagoon-deep)]" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile / PWA — fixed bottom tab bar, native-app style. */}
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-xl items-stretch">
          {TABS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-1 py-2 no-underline transition"
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  {/* Top accent bar — clear active indicator on the bottom bar. */}
                  <span
                    className={`absolute inset-x-4 top-0 h-0.5 rounded-full transition ${
                      isActive ? "bg-[var(--lagoon-deep)]" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`grid place-items-center rounded-full p-1.5 transition ${
                      isActive ? "bg-[var(--lagoon-deep)]/10" : "bg-transparent"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 transition ${
                        isActive ? "text-[var(--lagoon-deep)]" : "text-[var(--sea-ink-soft)]"
                      }`}
                      strokeWidth={isActive ? 2 : 1.75}
                      aria-hidden="true"
                    />
                  </span>
                  <span
                    className={`text-[0.62rem] leading-none transition ${
                      isActive
                        ? "font-semibold text-[var(--lagoon-deep)]"
                        : "font-medium text-[var(--sea-ink-soft)]"
                    }`}
                  >
                    {label}
                  </span>
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
