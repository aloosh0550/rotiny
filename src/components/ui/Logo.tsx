import { cn } from "@/lib/utils/cn";

/**
 * Routini brand mark — an original geometric monogram: a rounded tile in the
 * brand gradient with a "daily loop" ring (a habit/routine cycle) and a node
 * marking today's progress.
 */
export function Logo({
  size = 40,
  className,
  rounded = "rounded-[28%]",
}: {
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const mark = Math.round(size * 0.58);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-[image:var(--brand-gradient)] text-white",
        rounded,
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={mark} height={mark} viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3.5a8.5 8.5 0 1 1-6.01 2.49"
          stroke="currentColor"
          strokeOpacity="0.9"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="12" cy="3.5" r="2.6" fill="currentColor" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" fillOpacity="0.55" />
      </svg>
    </span>
  );
}
