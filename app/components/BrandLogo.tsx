type Props = { size?: number; className?: string };

/**
 * Brand mark: shield filled with purple→cyan gradient and "AI" overlay.
 * Used in Header and Footer.
 */
export default function BrandLogo({ size = 28, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 drop-shadow-[0_0_10px_rgba(168,85,247,0.45)] ${className}`}
    >
      <defs>
        <linearGradient id="brand-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="55%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="brand-shield-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#67e8f9" />
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
  );
}
