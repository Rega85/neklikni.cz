type Props = { size?: number; className?: string };

/**
 * Brand mark: shield with a blue gradient and "AI" overlay, plus a slow
 * pulsing glow ring (the one ambient effect kept in the redesign).
 * Used in Header and Footer.
 */
export default function BrandLogo({ size = 28, className = "" }: Props) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        aria-hidden="true"
        className="logo-glow-ring motion-safe:animate-logo-glow"
      />
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        aria-hidden="true"
        className={`shrink-0 drop-shadow-[0_0_10px_rgba(59,130,246,0.45)] ${className}`}
      >
        <defs>
          <linearGradient id="brand-shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="brand-shield-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#bfdbfe" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <path
          d="M16 2 L5 6 V14 C5 22 10 27 16 30 C22 27 27 22 27 14 V6 Z"
          fill="url(#brand-shield)"
          stroke="url(#brand-shield-stroke)"
          strokeWidth="0.7"
        />
        <text
          x="16"
          y="20"
          textAnchor="middle"
          fontSize="11"
          fontWeight="900"
          fill="#ffffff"
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="-0.5"
        >
          AI
        </text>
      </svg>
    </span>
  );
}
