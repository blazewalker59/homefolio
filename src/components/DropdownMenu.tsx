import { useState, useEffect, useRef, type ReactNode } from "react";

interface DropdownMenuProps {
  children: ReactNode;
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] px-2 py-1 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
        aria-label="Actions"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-32 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] py-1 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

DropdownMenu.Item = function DropdownMenuItem({
  children,
  onClick,
  variant = "default",
  disabled = false,
}: DropdownMenuItemProps) {
  const baseClasses = "block w-full px-4 py-2 text-left text-sm transition";
  const variantClasses =
    variant === "danger"
      ? "text-[var(--danger-fg)] hover:bg-[var(--danger-bg)] disabled:opacity-50"
      : "text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]";

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variantClasses}`}>
      {children}
    </button>
  );
};
