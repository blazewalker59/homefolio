import type { ReactNode } from "react";
import { Menu } from "@base-ui-components/react/menu";

interface DropdownMenuProps {
  children: ReactNode;
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

/**
 * Actions menu built on Base UI's Menu primitive. The popup renders in a
 * portal, so it escapes the card's `overflow: hidden` / stacking context
 * (the bug the old hand-rolled absolute-positioned menu had) and gets
 * keyboard nav, focus management, and outside-click handling for free.
 */
export function DropdownMenu({ children }: DropdownMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Actions"
        className="shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1 text-[var(--sea-ink-soft)] outline-none transition hover:bg-[var(--link-bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] data-[popup-open]:bg-[var(--link-bg-hover)]"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="z-[70]">
          <Menu.Popup className="min-w-[8rem] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] py-1 shadow-lg outline-none">
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

DropdownMenu.Item = function DropdownMenuItem({
  children,
  onClick,
  variant = "default",
  disabled = false,
}: DropdownMenuItemProps) {
  const variantClasses =
    variant === "danger"
      ? "text-[var(--danger-fg)] data-[highlighted]:bg-[var(--danger-bg)]"
      : "text-[var(--sea-ink)] data-[highlighted]:bg-[var(--link-bg-hover)]";

  return (
    <Menu.Item
      disabled={disabled}
      onClick={onClick}
      className={`block w-full cursor-pointer px-4 py-2 text-left text-sm outline-none transition data-[disabled]:cursor-default data-[disabled]:opacity-50 ${variantClasses}`}
    >
      {children}
    </Menu.Item>
  );
};
