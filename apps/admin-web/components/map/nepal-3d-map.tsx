'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

interface ProvinceData {
  name: string;
  total: number;
  delayed: number;
  severity: string;
  progress?: number;
}

interface Nepal3DMapProps {
  regionData: ProvinceData[];
  onProvinceClick?: (provinceName: string) => void;
  selectedProvince?: string | null;
}

const severityColors: Record<string, { fill: string; stroke: string }> = {
  low: { fill: 'rgba(16, 185, 129, 0.4)', stroke: 'rgba(16, 185, 129, 0.7)' },
  medium: { fill: 'rgba(245, 158, 11, 0.4)', stroke: 'rgba(245, 158, 11, 0.7)' },
  high: { fill: 'rgba(249, 115, 22, 0.4)', stroke: 'rgba(249, 115, 22, 0.7)' },
  critical: { fill: 'rgba(239, 68, 68, 0.45)', stroke: 'rgba(239, 68, 68, 0.8)' },
};

const defaultColors = severityColors.low;

export function Nepal3DMap({ regionData, onProvinceClick, selectedProvince }: Nepal3DMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: ProvinceData | null }>({
    x: 0, y: 0, data: null,
  });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const pathsRef = useRef<Array<{ path: Path2D; name: string; centroid: [number, number] }>>([]);

  // Load GeoJSON
  useEffect(() => {
    fetch('/geo/nepal-provinces.geojson')
      .then(r => r.json())
      .then(data => {
        if (data && data.features) setGeoData(data);
      })
      .catch(console.error);
  }, []);

  // Map province names to data
  const dataMap = useMemo(() => {
    const map = new Map<string, ProvinceData>();
    regionData.forEach(d => map.set(d.name, d));
    return map;
  }, [regionData]);

  // Calculate bounds from GeoJSON
  const getBounds = useCallback((features: any[]) => {
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;

    for (const feat of features) {
      const coords = feat.geometry.coordinates;
      const processRing = (ring: number[][]) => {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      };

      if (feat.geometry.type === 'Polygon') {
        for (const ring of coords) processRing(ring);
      } else if (feat.geometry.type === 'MultiPolygon') {
        for (const polygon of coords) {
          for (const ring of polygon) processRing(ring);
        }
      }
    }

    return { minLng, maxLng, minLat, maxLat };
  }, []);

  // Projection function using equirectangular with latitude correction
  const createProjection = useCallback((bounds: ReturnType<typeof getBounds>, width: number, height: number) => {
    const padding = 30;
    const { minLng, maxLng, minLat, maxLat } = bounds;

    // Use equirectangular projection with cos(lat) correction for Nepal
    const midLat = (minLat + maxLat) / 2;
    const cosLat = Math.cos(midLat * Math.PI / 180);

    const lngRange = (maxLng - minLng) * cosLat;
    const latRange = maxLat - minLat;

    const availW = width - padding * 2;
    const availH = height - padding * 2;

    const scaleX = availW / lngRange;
    const scaleY = availH / latRange;
    const scale = Math.min(scaleX, scaleY);

    const mapW = lngRange * scale;
    const mapH = latRange * scale;
    const offsetX = padding + (availW - mapW) / 2;
    const offsetY = padding + (availH - mapH) / 2;

    return (lng: number, lat: number): [number, number] => {
      const x = offsetX + (lng - minLng) * cosLat * scale;
      const y = offsetY + (maxLat - lat) * scale;
      return [x, y];
    };
  }, []);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Render canvas
  useEffect(() => {
    if (!geoData || !canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const bounds = getBounds(geoData.features);
    const project = createProjection(bounds, width, height);
    const paths: typeof pathsRef.current = [];

    // Draw each province
    for (const feature of geoData.features) {
      const name = feature.properties.name as string;
      const data = dataMap.get(name);
      const severity = data?.severity ?? 'low';
      const colors = severityColors[severity] ?? defaultColors;
      const isSelected = selectedProvince === name;
      const isHovered = hoveredProvince === name;

      const path2d = new Path2D();
      const coords = feature.geometry.coordinates;

      const drawRing = (ring: number[][]) => {
        for (let i = 0; i < ring.length; i++) {
          const [x, y] = project(ring[i][0], ring[i][1]);
          if (i === 0) path2d.moveTo(x, y);
          else path2d.lineTo(x, y);
        }
        path2d.closePath();
      };

      if (feature.geometry.type === 'Polygon') {
        for (const ring of coords) drawRing(ring);
      } else if (feature.geometry.type === 'MultiPolygon') {
        for (const polygon of coords) {
          for (const ring of polygon) drawRing(ring);
        }
      }

      // Fill
      ctx.fillStyle = isSelected || isHovered ? 'rgba(59, 130, 246, 0.5)' : colors.fill;
      ctx.fill(path2d);

      // Stroke
      ctx.strokeStyle = isSelected || isHovered ? '#60a5fa' : colors.stroke;
      ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1;
      ctx.stroke(path2d);

      // Glow for selected/hovered
      if (isSelected || isHovered) {
        ctx.save();
        ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 3;
        ctx.stroke(path2d);
        ctx.restore();
      }

      // Calculate centroid for label
      const outerRing = feature.geometry.type === 'Polygon' ? coords[0] : coords[0][0];
      let cx = 0, cy = 0;
      for (const [lng, lat] of outerRing) {
        const [px, py] = project(lng, lat);
        cx += px;
        cy += py;
      }
      cx /= outerRing.length;
      cy /= outerRing.length;

      paths.push({ path: path2d, name, centroid: [cx, cy] });
    }

    // Draw province labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 11px system-ui, -apple-system, sans-serif';

    for (const { name, centroid } of paths) {
      const label = name.replace(' Province', '');

      // Text shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillText(label, centroid[0] + 1, centroid[1] + 1);

      // Main text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillText(label, centroid[0], centroid[1]);
    }

    pathsRef.current = paths;
  }, [geoData, dataMap, dimensions, selectedProvince, hoveredProvince, getBounds, createProjection]);

  // Mouse interaction handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let found = false;
    for (const { path, name } of pathsRef.current) {
      if (ctx.isPointInPath(path, x * (window.devicePixelRatio || 1), y * (window.devicePixelRatio || 1))) {
        if (hoveredProvince !== name) setHoveredProvince(name);
        const data = dataMap.get(name);
        setTooltip({
          x: e.nativeEvent.offsetX,
          y: e.nativeEvent.offsetY,
          data: data ?? { name, total: 0, delayed: 0, severity: 'low' },
        });
        found = true;
        canvas.style.cursor = 'pointer';
        break;
      }
    }

    if (!found) {
      if (hoveredProvince) setHoveredProvince(null);
      setTooltip({ x: 0, y: 0, data: null });
      canvas.style.cursor = 'default';
    }
  }, [hoveredProvince, dataMap]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (const { path, name } of pathsRef.current) {
      if (ctx.isPointInPath(path, x * (window.devicePixelRatio || 1), y * (window.devicePixelRatio || 1))) {
        onProvinceClick?.(name);
        break;
      }
    }
  }, [onProvinceClick]);

  const handleMouseLeave = useCallback(() => {
    setHoveredProvince(null);
    setTooltip({ x: 0, y: 0, data: null });
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full nepal-map-container">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.4))',
        }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
      />

      {/* Tooltip */}
      {tooltip.data && (
        <div
          className="absolute z-50 pointer-events-none animate-fade-in"
          style={{
            left: Math.min(tooltip.x + 15, dimensions.width - 200),
            top: tooltip.y - 10,
          }}
        >
          <div className="glass-card px-4 py-3 min-w-[180px]"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.1)' }}
          >
            <p className="text-sm font-bold text-white">{tooltip.data.name}</p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div>
                <span className="text-gray-400">Projects</span>
                <p className="text-white font-bold text-lg">{tooltip.data.total}</p>
              </div>
              <div>
                <span className="text-gray-400">Delayed</span>
                <p className="text-red-400 font-bold text-lg">{tooltip.data.delayed}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                tooltip.data.severity === 'critical' ? 'bg-red-500' :
                tooltip.data.severity === 'high' ? 'bg-orange-500' :
                tooltip.data.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <span className="text-xs text-gray-400 capitalize">{tooltip.data.severity} risk</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
