/**
 * Nepal's unique double-pennant flag icon.
 * The only non-rectangular national flag in the world.
 */
export function NepalFlagIcon({ className = '', size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Nepal flag"
    >
      {/* Flag shape — double pennant */}
      <path
        d="M2,2 L22,10 L2,18 L22,26 L2,28 L2,2 Z"
        fill="#DC143C"
        stroke="#003893"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Moon symbol (top pennant) */}
      <circle cx="9" cy="8" r="2.5" fill="white" opacity="0.9" />
      <circle cx="10.2" cy="7.5" r="2" fill="#DC143C" />
      {/* Sun/star symbol (bottom pennant) */}
      <circle cx="9" cy="21" r="2.5" fill="white" opacity="0.9" />
    </svg>
  );
}
