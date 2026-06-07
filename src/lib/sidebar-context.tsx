import { createContext, useContext, useState } from "react";

/**
 * Shared open/close state for the config sidebar's mobile drawer. The trigger
 * lives in the global <Header /> while the drawer itself is rendered by the
 * `_app` layout (which has the home/total-invested loader data), so the state
 * is lifted here into a provider that wraps both.
 */
type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  setOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <SidebarContext.Provider value={{ open, setOpen }}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  return useContext(SidebarContext);
}
