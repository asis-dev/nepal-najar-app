'use client';

/**
 * Calm civic backdrop for Nepal Republic.
 * Keeps a hint of Nepal through elevation lines and a soft horizon,
 * without turning the whole app into a scene.
 */
export function CivicSkyBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            #08111d 0%,
            #0d1726 38%,
            #101b2d 68%,
            #132034 100%
          )`,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 18% 14%, rgba(0,56,147,0.12), transparent 30%), radial-gradient(circle at 82% 0%, rgba(220,20,60,0.08), transparent 28%)',
        }}
      />

      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: '18%',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(220,20,60,0.035) 58%, rgba(217,164,65,0.045) 100%)',
        }}
      />

      <svg
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.02 }}
        preserveAspectRatio="none"
        viewBox="0 0 1200 800"
      >
        <defs>
          <pattern id="contour-lines" x="0" y="0" width="200" height="100" patternUnits="userSpaceOnUse">
            <path
              d="M0,50 Q50,20 100,45 T200,50"
              fill="none"
              stroke="#DDE7F0"
              strokeWidth="0.5"
            />
            <path
              d="M0,70 Q60,40 120,65 T200,70"
              fill="none"
              stroke="#DDE7F0"
              strokeWidth="0.4"
            />
            <path
              d="M0,30 Q40,10 80,28 T200,30"
              fill="none"
              stroke="#DDE7F0"
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        <rect x="0" y="200" width="1200" height="400" fill="url(#contour-lines)" />
      </svg>

      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: '20%',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(221,231,240,0.015) 58%, rgba(221,231,240,0.03) 100%)',
        }}
      />
    </div>
  );
}
