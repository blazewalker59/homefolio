import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { X } from "lucide-react";
import { getHomeOverviewFn } from "@/server/home";
import ConfigSidebar from "@/components/ConfigSidebar";
import SectionTabs from "@/components/SectionTabs";
import { HomeHero } from "@/components/HomeHero";
import { useSidebar } from "@/lib/sidebar-context";

export const Route = createFileRoute("/_app")({
  loader: async () => {
    try {
      const { home, totalInvested } = await getHomeOverviewFn();
      if (!home?.address) {
        throw redirect({ to: "/setup" });
      }
      return { home, totalInvested };
    } catch (err) {
      if (err instanceof Error && err.message === "Not authenticated") {
        throw redirect({ to: "/sign-in" });
      }
      throw err;
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { home, totalInvested } = Route.useLoaderData();
  const { open, setOpen } = useSidebar();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close the popout whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <>
      <HomeHero home={home} />
      <SectionTabs />
      {/* Bottom padding clears the fixed mobile tab bar (hidden at md+). */}
      <div className="pb-24 md:pb-10">
        <Outlet />
      </div>

      {/* Config sidebar — popout drawer from the header profile icon, all sizes. */}
      <div
        className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close account panel"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          className={`absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col overflow-y-auto border-l border-[var(--line)] bg-[var(--bg-base)] shadow-2xl transition-transform duration-200 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
            <span className="island-kicker">Account &amp; Home</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-sm p-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </div>
          <div className="px-5 py-6">
            <ConfigSidebar home={home} totalInvested={totalInvested} idPrefix="cfg-mobile" />
          </div>
        </aside>
      </div>
    </>
  );
}
