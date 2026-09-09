import type { MouseEvent, ReactNode } from "react";

export function ActionMenu({ children }: { children: ReactNode }) {
  return (
    <div
      className="absolute right-3 top-12 z-50 w-44 overflow-hidden rounded-lg border border-line bg-white py-1 shadow-panel"
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function MenuButton({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex h-9 w-full items-center gap-2 px-3 text-left text-sm font-medium transition hover:bg-canvas ${
        danger ? "text-red-600" : "text-ink"
      }`}
      onClick={onClick}
    >
      <span className={danger ? "text-red-600" : "text-muted"}>{icon}</span>
      {label}
    </button>
  );
}

export function MenuLink({
  href,
  icon,
  label,
  target,
  onClick,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  target?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <a
      className="flex h-9 w-full items-center gap-2 px-3 text-sm font-medium text-ink transition hover:bg-canvas"
      href={href}
      target={target}
      rel={target ? "noreferrer" : undefined}
      onClick={onClick}
    >
      <span className="text-muted">{icon}</span>
      {label}
    </a>
  );
}
