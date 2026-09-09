type HaoBoxLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function HaoBoxLogo({
  compact = false,
  inverse = false,
  className = "",
  size = "md",
}: HaoBoxLogoProps) {
  const sizeClass = compact
    ? "h-10 w-16 object-left"
    : size === "lg"
      ? "h-16 w-auto max-w-[260px]"
      : size === "sm"
        ? "h-10 w-auto max-w-[170px]"
        : "h-12 w-auto max-w-[220px]";

  return (
    <img
      src="/logo.png"
      alt="HaoBox"
      className={[
        "block object-contain",
        sizeClass,
        inverse ? "brightness-0 invert" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
