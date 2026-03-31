/**
 * Status Indicator — clean circle/dot indicators for commitment status
 *
 * Used as status indicators throughout the app.
 * Each status has a distinct color and subtle icon overlay.
 */

interface GhantiIconProps {
  /** Status determines the indicator color */
  status?: 'in_progress' | 'stalled' | 'not_started' | 'delivered' | 'default';
  /** Custom color override (CSS color) */
  color?: string;
  /** Size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Show pulse animation (for stalled/urgent) */
  ring?: boolean;
}

const SIZE_MAP = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 36,
} as const;

const STATUS_COLORS: Record<string, string> = {
  in_progress: '#10b981',  // emerald
  stalled: '#ef4444',      // red
  not_started: '#f59e0b',  // amber
  delivered: '#3b82f6',    // blue
  default: '#6b7280',      // gray
};

export function GhantiIcon({
  status = 'default',
  color,
  size = 'md',
  className = '',
  ring = false,
}: GhantiIconProps) {
  const px = SIZE_MAP[size];
  const fill = color || STATUS_COLORS[status] || STATUS_COLORS.default;
  const shouldPulse = ring || status === 'stalled';

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${shouldPulse ? 'animate-[status-pulse_2s_ease-in-out_infinite]' : ''} ${className}`}
      style={{ width: px, height: px }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer circle — faint halo */}
        <circle cx="12" cy="12" r="11" fill={fill} fillOpacity={0.12} />
        {/* Main filled circle */}
        <circle cx="12" cy="12" r="8" fill={fill} fillOpacity={0.9} />

        {/* Status-specific overlays */}
        {status === 'delivered' && (
          /* Checkmark */
          <path
            d="M8.5 12.5L10.8 14.8L15.5 9.5"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {status === 'in_progress' && (
          /* Forward arrow */
          <path
            d="M10 8.5L14 12L10 15.5"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {status === 'stalled' && (
          /* Pause bars */
          <>
            <rect x="9" y="8.5" width="2" height="7" rx="0.5" fill="white" />
            <rect x="13" y="8.5" width="2" height="7" rx="0.5" fill="white" />
          </>
        )}
        {status === 'not_started' && (
          /* Horizontal dash */
          <rect x="7.5" y="11" width="9" height="2" rx="1" fill="white" />
        )}
        {status === 'default' && (
          /* Small center dot */
          <circle cx="12" cy="12" r="2.5" fill="white" fillOpacity={0.7} />
        )}
      </svg>
    </span>
  );
}

/**
 * Inline status indicator with count
 */
export function GhantiBellCount({
  status,
  count,
  size = 'sm',
}: {
  status: GhantiIconProps['status'];
  count: number;
  size?: GhantiIconProps['size'];
}) {
  const textColor = {
    in_progress: 'text-emerald-400',
    stalled: 'text-red-400',
    not_started: 'text-amber-400',
    delivered: 'text-blue-400',
    default: 'text-gray-400',
  }[status || 'default'];

  return (
    <span className={`inline-flex items-center gap-1 ${textColor} font-semibold tabular-nums`}>
      <GhantiIcon status={status} size={size} />
      {count}
    </span>
  );
}
