'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProvinceInfo {
  name: string;
  name_ne: string;
  projects: number;
  delayed: number;
  severity: string;
}

export interface NepalDeckMapProps {
  onProvinceClick?: (province: ProvinceInfo) => void;
  selectedProvince?: string | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Severity palette
// ---------------------------------------------------------------------------
const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  low:      [16, 185, 129],   // emerald
  medium:   [245, 158, 11],   // amber
  high:     [249, 115, 22],   // orange
  critical: [239, 68, 68],    // red
};

const SEVERITY_FILL_ALPHA = 140;
const SEVERITY_FILL_HOVER = 200;
const SEVERITY_FILL_SELECTED = 220;

function severityColor(severity: string, alpha: number): [number, number, number, number] {
  const rgb = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.low;
  return [rgb[0], rgb[1], rgb[2], alpha];
}

// Elevation scale factor – projects count drives extrusion height
const ELEVATION_SCALE = 120;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NepalDeckMap({ onProvinceClick, selectedProvince, className }: NepalDeckMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    props: ProvinceInfo | null;
  }>({ x: 0, y: 0, props: null });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const pathsRef = useRef<Array<{ path: Path2D; name: string; centroid: [number, number]; props: ProvinceInfo }>>([]);
  const animRef = useRef<number>(0);
  const glowPhaseRef = useRef(0);

  // -----------------------------------------------------------------------
  // Load GeoJSON
  // -----------------------------------------------------------------------
  useEffect(() => {
    fetch('/geo/nepal-provinces.geojson')
      .then((r) => r.json())
      .then((data) => {
        if (data?.features) setGeoData(data as GeoJSON.FeatureCollection);
      })
      .catch(console.error);
  }, []);

  // -----------------------------------------------------------------------
  // Resize observer
  // -----------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // -----------------------------------------------------------------------
  // Projection (equirectangular with cos-lat correction for Nepal)
  // -----------------------------------------------------------------------
  const createProjection = useCallback(
    (features: GeoJSON.Feature[], width: number, height: number) => {
      let minLng = Infinity,
        maxLng = -Infinity,
        minLat = Infinity,
        maxLat = -Infinity;

      const scan = (ring: number[][]) => {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      };

      for (const f of features) {
        const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
        if (g.type === 'Polygon') g.coordinates.forEach(scan);
        else if (g.type === 'MultiPolygon')
          g.coordinates.forEach((poly) => poly.forEach(scan));
      }

      const padding = 40;
      const midLat = (minLat + maxLat) / 2;
      const cosLat = Math.cos((midLat * Math.PI) / 180);
      const lngRange = (maxLng - minLng) * cosLat;
      const latRange = maxLat - minLat;
      const availW = width - padding * 2;
      const availH = height - padding * 2;
      const scale = Math.min(availW / lngRange, availH / latRange);
      const mapW = lngRange * scale;
      const mapH = latRange * scale;
      const offX = padding + (availW - mapW) / 2;
      const offY = padding + (availH - mapH) / 2;

      return {
        project: (lng: number, lat: number): [number, number] => [
          offX + (lng - minLng) * cosLat * scale,
          offY + (maxLat - lat) * scale,
        ],
        bounds: { minLng, maxLng, minLat, maxLat },
      };
    },
    [],
  );

  // -----------------------------------------------------------------------
  // 3D isometric offset for faux-3D extrusion
  // -----------------------------------------------------------------------
  const isoOffset = useCallback(
    (x: number, y: number, height: number): [number, number] => {
      // Simple isometric: shift up by height, slight x shift for perspective
      const pitch = 0.35; // ~20 degrees
      return [x + height * 0.08, y - height * pitch];
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Render loop
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!geoData || !canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const { project } = createProjection(geoData.features, width, height);

    // Sort features by latitude so southern provinces render first (back-to-front for 3D)
    const sortedFeatures = [...geoData.features].sort((a, b) => {
      const aLat = getCentroidLat(a);
      const bLat = getCentroidLat(b);
      return bLat - aLat; // higher lat (north) renders first = behind
    });

    const render = () => {
      glowPhaseRef.current += 0.015;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Background gradient
      const bgGrad = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7,
      );
      bgGrad.addColorStop(0, '#0f1629');
      bgGrad.addColorStop(1, '#060810');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle grid lines
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.04)';
      ctx.lineWidth = 0.5;
      for (let gx = 0; gx < width; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, height);
        ctx.stroke();
      }
      for (let gy = 0; gy < height; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(width, gy);
        ctx.stroke();
      }

      const paths: typeof pathsRef.current = [];

      for (const feature of sortedFeatures) {
        const fp = feature.properties as Record<string, unknown>;
        const name = fp.name as string;
        const severity = (fp.severity as string) ?? 'low';
        const projects = (fp.projects as number) ?? 0;
        const name_ne = (fp.name_ne as string) ?? name;
        const delayed = (fp.delayed as number) ?? 0;

        const isSelected = selectedProvince === name;
        const isHovered = hoveredFeature === name;

        // Extrusion height
        const extH = Math.max(projects * ELEVATION_SCALE / 312, 8); // normalize against max

        const buildPath = (offsetFn: (x: number, y: number) => [number, number]) => {
          const p2d = new Path2D();
          const g = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
          const drawRing = (ring: number[][]) => {
            for (let i = 0; i < ring.length; i++) {
              const [px, py] = offsetFn(...project(ring[i][0], ring[i][1]));
              if (i === 0) p2d.moveTo(px, py);
              else p2d.lineTo(px, py);
            }
            p2d.closePath();
          };
          if (g.type === 'Polygon') g.coordinates.forEach(drawRing);
          else g.coordinates.forEach((poly) => poly.forEach(drawRing));
          return p2d;
        };

        // --- Side faces (3D extrusion effect) ---
        const g = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
        const outerRings: number[][][] =
          g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]);

        const sideColor = severityColor(severity, 80);
        ctx.fillStyle = `rgba(${sideColor[0]},${sideColor[1]},${sideColor[2]},0.3)`;
        ctx.strokeStyle = `rgba(${sideColor[0]},${sideColor[1]},${sideColor[2]},0.15)`;
        ctx.lineWidth = 0.5;

        for (const ring of outerRings) {
          for (let i = 0; i < ring.length - 1; i++) {
            const [bx1, by1] = project(ring[i][0], ring[i][1]);
            const [bx2, by2] = project(ring[i + 1][0], ring[i + 1][1]);
            const [tx1, ty1] = isoOffset(bx1, by1, extH);
            const [tx2, ty2] = isoOffset(bx2, by2, extH);

            // Only draw sides that face "forward" (south-facing)
            if (by1 >= ty1 || by2 >= ty2) {
              ctx.beginPath();
              ctx.moveTo(bx1, by1);
              ctx.lineTo(bx2, by2);
              ctx.lineTo(tx2, ty2);
              ctx.lineTo(tx1, ty1);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          }
        }

        // --- Top face ---
        const topPath = buildPath((x, y) => isoOffset(x, y, extH));

        // Glow underneath for selected/hovered
        if (isSelected || isHovered) {
          ctx.save();
          ctx.shadowColor = isSelected
            ? 'rgba(59, 130, 246, 0.8)'
            : 'rgba(59, 130, 246, 0.5)';
          ctx.shadowBlur = isSelected ? 30 : 20;
          ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
          ctx.fill(topPath);
          ctx.restore();
        }

        // Fill top
        const alpha = isSelected
          ? SEVERITY_FILL_SELECTED
          : isHovered
            ? SEVERITY_FILL_HOVER
            : SEVERITY_FILL_ALPHA;
        const [r, g2, b] = SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.low;

        // Gradient fill for top face
        const topGrad = ctx.createLinearGradient(0, 0, width, height);
        topGrad.addColorStop(0, `rgba(${r},${g2},${b},${alpha / 255 * 0.9})`);
        topGrad.addColorStop(1, `rgba(${r},${g2},${b},${alpha / 255 * 0.5})`);
        ctx.fillStyle = topGrad;
        ctx.fill(topPath);

        // Animated glow border for selected
        if (isSelected) {
          const glowAlpha = 0.5 + Math.sin(glowPhaseRef.current * 2) * 0.3;
          ctx.save();
          ctx.strokeStyle = `rgba(96, 165, 250, ${glowAlpha})`;
          ctx.lineWidth = 3;
          ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
          ctx.shadowBlur = 15;
          ctx.stroke(topPath);
          ctx.restore();
        }

        // Border
        ctx.strokeStyle = isSelected
          ? 'rgba(96, 165, 250, 0.9)'
          : isHovered
            ? 'rgba(96, 165, 250, 0.7)'
            : `rgba(${r},${g2},${b},0.5)`;
        ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
        ctx.stroke(topPath);

        // Centroid for labels
        const ring0 = outerRings[0];
        let cx = 0,
          cy = 0;
        for (const [lng, lat] of ring0) {
          const [px, py] = isoOffset(...project(lng, lat), extH);
          cx += px;
          cy += py;
        }
        cx /= ring0.length;
        cy /= ring0.length;

        paths.push({
          path: topPath,
          name,
          centroid: [cx, cy],
          props: { name, name_ne, projects, delayed, severity },
        });
      }

      // --- Labels ---
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const { name, centroid, props } of paths) {
        const isSelected = selectedProvince === name;
        const isHovered = hoveredFeature === name;
        const label = name.replace(' Province', '');

        // Nepali name (small, above)
        ctx.font = '500 10px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(props.name_ne, centroid[0], centroid[1] - 12);

        // English name
        ctx.font = `${isSelected || isHovered ? '700' : '600'} 11px system-ui, -apple-system, sans-serif`;

        // Text shadow
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillText(label, centroid[0] + 1, centroid[1] + 3);

        ctx.fillStyle = isSelected
          ? 'rgba(96, 165, 250, 1)'
          : isHovered
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.75)';
        ctx.fillText(label, centroid[0], centroid[1] + 2);

        // Project count badge
        ctx.font = '700 9px system-ui, -apple-system, sans-serif';
        const badge = `${props.projects}`;
        const bw = ctx.measureText(badge).width + 10;
        const bx = centroid[0] - bw / 2;
        const by = centroid[1] + 14;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, bx, by, bw, 16, 4);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(badge, centroid[0], by + 8);
      }

      // --- Outer glow around entire Nepal ---
      const glowAlpha = 0.08 + Math.sin(glowPhaseRef.current) * 0.04;
      ctx.save();
      ctx.shadowColor = `rgba(59, 130, 246, ${glowAlpha})`;
      ctx.shadowBlur = 40;
      for (const { path } of paths) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
        ctx.lineWidth = 4;
        ctx.stroke(path);
      }
      ctx.restore();

      pathsRef.current = paths;
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [geoData, dimensions, selectedProvince, hoveredFeature, createProjection, isoOffset]);

  // -----------------------------------------------------------------------
  // Mouse interactions
  // -----------------------------------------------------------------------
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      let found = false;

      // Check in reverse order (top-most = last rendered)
      for (let i = pathsRef.current.length - 1; i >= 0; i--) {
        const { path, name, props } = pathsRef.current[i];
        if (ctx.isPointInPath(path, x * dpr, y * dpr)) {
          if (hoveredFeature !== name) setHoveredFeature(name);
          setTooltip({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, props });
          found = true;
          canvas.style.cursor = 'pointer';
          break;
        }
      }

      if (!found) {
        if (hoveredFeature) setHoveredFeature(null);
        setTooltip({ x: 0, y: 0, props: null });
        canvas.style.cursor = 'default';
      }
    },
    [hoveredFeature],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      for (let i = pathsRef.current.length - 1; i >= 0; i--) {
        const { path, props } = pathsRef.current[i];
        if (ctx.isPointInPath(path, x * dpr, y * dpr)) {
          onProvinceClick?.(props);
          break;
        }
      }
    },
    [onProvinceClick],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredFeature(null);
    setTooltip({ x: 0, y: 0, props: null });
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className ?? ''}`}
      style={{ background: '#060810' }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {tooltip.props && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: Math.min(tooltip.x + 16, dimensions.width - 220),
            top: Math.max(tooltip.y - 10, 10),
            animation: 'fade-in 0.15s ease-out',
          }}
        >
          <div
            className="rounded-xl px-4 py-3 min-w-[200px] backdrop-blur-xl border"
            style={{
              background: 'rgba(10, 14, 26, 0.9)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <p className="text-xs text-gray-400 font-medium">
              {tooltip.props.name_ne}
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {tooltip.props.name}
            </p>
            <div className="flex items-center gap-5 mt-2.5">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Projects
                </p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {tooltip.props.projects}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Delayed
                </p>
                <p className="text-lg font-bold text-red-400 tabular-nums">
                  {tooltip.props.delayed}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  On Track
                </p>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">
                  {tooltip.props.projects - tooltip.props.delayed}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  tooltip.props.severity === 'critical'
                    ? 'bg-red-500'
                    : tooltip.props.severity === 'high'
                      ? 'bg-orange-500'
                      : tooltip.props.severity === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                }`}
              />
              <span className="text-[11px] text-gray-400 capitalize">
                {tooltip.props.severity} risk
              </span>
              {/* Mini progress bar */}
              <div className="flex-1 h-1 rounded-full bg-white/5 ml-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${((tooltip.props.projects - tooltip.props.delayed) / tooltip.props.projects) * 100}%`,
                    background: 'linear-gradient(90deg, rgba(16,185,129,0.8), rgba(59,130,246,0.8))',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none">
        <div className="absolute top-2 left-2 w-6 h-[1px] bg-gradient-to-r from-primary-500/40 to-transparent" />
        <div className="absolute top-2 left-2 w-[1px] h-6 bg-gradient-to-b from-primary-500/40 to-transparent" />
      </div>
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
        <div className="absolute top-2 right-2 w-6 h-[1px] bg-gradient-to-l from-primary-500/40 to-transparent" />
        <div className="absolute top-2 right-2 w-[1px] h-6 bg-gradient-to-b from-primary-500/40 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none">
        <div className="absolute bottom-2 left-2 w-6 h-[1px] bg-gradient-to-r from-primary-500/40 to-transparent" />
        <div className="absolute bottom-2 left-2 w-[1px] h-6 bg-gradient-to-t from-primary-500/40 to-transparent" />
      </div>
      <div className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none">
        <div className="absolute bottom-2 right-2 w-6 h-[1px] bg-gradient-to-l from-primary-500/40 to-transparent" />
        <div className="absolute bottom-2 right-2 w-[1px] h-6 bg-gradient-to-t from-primary-500/40 to-transparent" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getCentroidLat(feature: GeoJSON.Feature): number {
  const g = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon;
  const ring =
    g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0];
  let sum = 0;
  for (const [, lat] of ring) sum += lat;
  return sum / ring.length;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
