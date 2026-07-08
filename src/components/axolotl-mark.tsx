type AxolotlMarkProps = {
  /** Rendered width/height in px. */
  size?: number;
  /** Show the six side gills (off = just the face, for small/footer marks). */
  gills?: boolean;
  /** Gill fill colour. Defaults to the CSS brand pink so it adapts per theme. */
  gillColor?: string;
  className?: string;
  title?: string;
};

/**
 * "Axel" — the TutorStar axolotl mascot, built from plain SVG shapes so it
 * scales crisply at every size (110 hero · 84 login · 40/38 nav · 30/20 chrome).
 */
export function AxolotlMark({
  size = 40,
  gills = true,
  gillColor = "var(--axo-pink-soft)",
  className,
  title,
}: AxolotlMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {gills && (
        <>
          <ellipse cx="13" cy="22" rx="10" ry="4.5" fill={gillColor} transform="rotate(-32 13 22)" />
          <ellipse cx="9.5" cy="34" rx="10" ry="4.5" fill={gillColor} />
          <ellipse cx="13" cy="46" rx="10" ry="4.5" fill={gillColor} transform="rotate(32 13 46)" />
          <ellipse cx="51" cy="22" rx="10" ry="4.5" fill={gillColor} transform="rotate(32 51 22)" />
          <ellipse cx="54.5" cy="34" rx="10" ry="4.5" fill={gillColor} />
          <ellipse cx="51" cy="46" rx="10" ry="4.5" fill={gillColor} transform="rotate(-32 51 46)" />
        </>
      )}
      <circle cx="32" cy="34" r="20" fill="#f9c7d4" />
      <circle cx="25" cy="31" r="2.6" fill="#16343a" />
      <circle cx="39" cy="31" r="2.6" fill="#16343a" />
      <path
        d="M25.5 40 Q32 46 38.5 40"
        stroke="#16343a"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
      {gills && (
        <>
          <circle cx="20" cy="37.5" r="3.4" fill={gillColor} opacity="0.7" />
          <circle cx="44" cy="37.5" r="3.4" fill={gillColor} opacity="0.7" />
        </>
      )}
    </svg>
  );
}
