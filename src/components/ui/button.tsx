import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost" | "danger";
  }
>(function Button({ className, variant = "default", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss/40 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-moss text-white shadow-sm hover:bg-moss/90":
            variant === "default",
          "border border-line bg-white text-ink hover:bg-canvas":
            variant === "outline",
          "text-muted hover:bg-canvas hover:text-ink": variant === "ghost",
          "bg-red-50 text-red-700 hover:bg-red-100": variant === "danger",
        },
        className,
      )}
      {...props}
    />
  );
});
