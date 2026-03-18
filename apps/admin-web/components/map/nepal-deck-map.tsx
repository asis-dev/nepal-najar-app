'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { GeoJsonLayer, TextLayer, ScatterplotLayer } from '@deck.gl/layers';
import { FlyToInterpolator } from '@deck.gl/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProvinceData {
  name: string;
  total: number;
  delayed: number;
  severity: string;
}

export interface NepalDeckMapProps {
  regionData: Array<{
    name: string;
    total: number;
    delayed: number;
    severity: string;
  }>;
  selectedProvince?: string | null;
  onProvinceClick?: (provinceName: string) => void;
}

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionDuration?: number;
  transitionInterpolator?: FlyToInterpolator;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const INITIAL_VIEW_STATE: ViewState = {
  longitude: 84.1,
  latitude: 28.3,
  zoom: 6.5,
  pitch: 30,
  bearing: 0,
};

const SEVERITY_FILL: Record<string, [number, number, number, number]> = {
  low: [16, 185, 129, 128],
  medium: [245, 158, 11, 128],
  high: [249, 115, 22, 128],
  critical: [239, 68, 68, 140],
};

const SEVERITY_FILL_HOVER: Record<string, [number, number, number, number]> = {
  low: [16, 185, 129, 190],
  medium: [245, 158, 11, 190],
  high: [249, 115, 22, 190],
  critical: [239, 68, 68, 200],
};

const SEVERITY_LINE: Record<string, [number, number, number, number]> = {
  low: [16, 185, 129, 200],
  medium: [245, 158, 11, 200],
  high: [249, 115, 22, 200],
  critical: [239, 68, 68, 220],
};

const SELECTED_FILL: [number, number, number, number] = [59, 200, 255, 170];
const SELECTED_LINE: [number, number, number, number] = [0, 255, 255, 255];
const DEFAULT_FILL = SEVERITY_FILL.low;
const DEFAULT_LINE = SEVERITY_LINE.low;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeCentroid(feature: any): [number, number] {
  const coords =
    feature.geometry.type === 'Polygon'
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates[0][0];

  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of coords) {
    sumLng += lng;
    sumLat += lat;
  }
  return [sumLng / coords.length, sumLat / coords.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NepalDeckMap({
  regionData,
  selectedProvince,
  onProvinceClick,
}: NepalDeckMapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: ProvinceData | null;
  }>({ x: 0, y: 0, data: null });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load GeoJSON
  useEffect(() => {
    fetch('/geo/nepal-provinces.geojson')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.features) setGeoData(data);
      })
      .catch(console.error);
  }, []);

  // Map province names to data
  const dataMap = useMemo(() => {
    const map = new Map<string, ProvinceData>();
    regionData.forEach((d) => map.set(d.name, d));
    return map;
  }, [regionData]);

  // Compute centroids for labels
  const centroids = useMemo(() => {
    if (!geoData) return [];
    return geoData.features.map((f: any) => {
      const [lng, lat] = computeCentroid(f);
      return {
        name: f.properties.name as string,
        coordinates: [lng, lat] as [number, number],
      };
    });
  }, [geoData]);

  // Compute border points for ambient glow
  const borderGlowPoints = useMemo(() => {
    if (!geoData) return [];
    const points: Array<{ position: [number, number] }> = [];
    for (const feature of geoData.features) {
      const geom = feature.geometry;
      const rings: number[][][] =
        geom.type === 'Polygon'
          ? geom.coordinates
          : geom.coordinates.flatMap((poly: number[][][]) => poly);
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i += 3) {
          points.push({ position: [ring[i][0], ring[i][1]] });
        }
      }
    }
    return points;
  }, [geoData]);

  // Elevation based on project count
  const getElevation = useCallback(
    (f: any) => {
      const name = f.properties.name as string;
      const d = dataMap.get(name);
      const total = d?.total ?? (f.properties.projects ?? 0);
      return 2000 + total * 30;
    },
    [dataMap]
  );

  // Click handler -- fly to province
  const handleProvinceClick = useCallback(
    (info: any) => {
      if (!info.object) return;
      const name = info.object.properties.name as string;
      onProvinceClick?.(name);

      const [lng, lat] = computeCentroid(info.object);
      setViewState((prev) => ({
        ...prev,
        longitude: lng,
        latitude: lat,
        zoom: 7.5,
        transitionDuration: 800,
        transitionInterpolator: new FlyToInterpolator(),
      }));
    },
    [onProvinceClick]
  );

  // Reset view when province is deselected
  useEffect(() => {
    if (!selectedProvince) {
      setViewState((prev) => ({
        ...prev,
        ...INITIAL_VIEW_STATE,
        transitionDuration: 800,
        transitionInterpolator: new FlyToInterpolator(),
      }));
    }
  }, [selectedProvince]);

  // Hover handler
  const handleHover = useCallback(
    (info: any) => {
      if (info.object) {
        const name = info.object.properties.name as string;
        setHoveredProvince(name);
        const d = dataMap.get(name);
        const props = info.object.properties;
        setTooltip({
          x: info.x,
          y: info.y,
          data: d ?? {
            name,
            total: props.projects ?? 0,
            delayed: props.delayed ?? 0,
            severity: props.severity ?? 'low',
          },
        });
      } else {
        setHoveredProvince(null);
        setTooltip({ x: 0, y: 0, data: null });
      }
    },
    [dataMap]
  );

  // Build layers
  const layers = useMemo(() => {
    if (!geoData) return [];

    const borderGlow = new ScatterplotLayer({
      id: 'border-glow',
      data: borderGlowPoints,
      getPosition: (d: any) => d.position,
      getRadius: 800,
      getFillColor: [0, 200, 255, 15],
      radiusMinPixels: 1,
      radiusMaxPixels: 4,
      pickable: false,
    });

    const provincesLayer = new GeoJsonLayer({
      id: 'provinces',
      data: geoData,
      pickable: true,
      stroked: true,
      filled: true,
      extruded: true,
      wireframe: true,
      getElevation,
      getFillColor: (f: any) => {
        const name = f.properties.name as string;
        if (selectedProvince === name) return SELECTED_FILL;
        const d = dataMap.get(name);
        const severity = d?.severity ?? (f.properties.severity ?? 'low');
        if (hoveredProvince === name)
          return SEVERITY_FILL_HOVER[severity] ?? SEVERITY_FILL_HOVER.low;
        return SEVERITY_FILL[severity] ?? DEFAULT_FILL;
      },
      getLineColor: (f: any) => {
        const name = f.properties.name as string;
        if (selectedProvince === name) return SELECTED_LINE;
        if (hoveredProvince === name)
          return [255, 255, 255, 200] as [number, number, number, number];
        const d = dataMap.get(name);
        const severity = d?.severity ?? (f.properties.severity ?? 'low');
        return SEVERITY_LINE[severity] ?? DEFAULT_LINE;
      },
      getLineWidth: (f: any) => {
        const name = f.properties.name as string;
        if (selectedProvince === name) return 3;
        if (hoveredProvince === name) return 2;
        return 1;
      },
      lineWidthMinPixels: 1,
      lineWidthMaxPixels: 4,
      onClick: handleProvinceClick,
      onHover: handleHover,
      updateTriggers: {
        getFillColor: [selectedProvince, hoveredProvince, dataMap],
        getLineColor: [selectedProvince, hoveredProvince, dataMap],
        getLineWidth: [selectedProvince, hoveredProvince],
        getElevation: [dataMap],
      },
      material: {
        ambient: 0.65,
        diffuse: 0.5,
        shininess: 40,
      },
    });

    const labelsLayer = new TextLayer({
      id: 'labels',
      data: centroids,
      getPosition: (d: any) => d.coordinates,
      getText: (d: any) => d.name.replace(' Province', ''),
      getSize: 13,
      getColor: [255, 255, 255, 220],
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'center' as const,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 600,
      outlineWidth: 3,
      outlineColor: [0, 0, 0, 200],
      billboard: true,
      sizeUnits: 'pixels' as const,
      sizeMinPixels: 10,
      sizeMaxPixels: 18,
    });

    return [borderGlow, provincesLayer, labelsLayer];
  }, [
    geoData,
    selectedProvince,
    hoveredProvince,
    dataMap,
    centroids,
    borderGlowPoints,
    getElevation,
    handleProvinceClick,
    handleHover,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ background: '#050510' }}
    >
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
        controller={{ dragRotate: false }}
        layers={layers}
        getCursor={({ isHovering }: { isHovering: boolean }) =>
          isHovering ? 'pointer' : 'grab'
        }
        style={{ position: 'absolute', inset: '0' }}
      />

      {/* Tooltip */}
      {tooltip.data && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.x + 15,
            top: tooltip.y - 10,
            animation: 'fade-in 0.15s ease-out',
          }}
        >
          <div
            className="rounded-xl px-4 py-3 min-w-[200px] backdrop-blur-xl border"
            style={{
              background: 'rgba(10, 14, 26, 0.92)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <p className="text-sm font-bold text-white">{tooltip.data.name}</p>
            <div className="flex items-center gap-5 mt-2">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Projects
                </p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {tooltip.data.total}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Delayed
                </p>
                <p className="text-lg font-bold text-red-400 tabular-nums">
                  {tooltip.data.delayed}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  On Track
                </p>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">
                  {tooltip.data.total - tooltip.data.delayed}
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  tooltip.data.severity === 'critical'
                    ? 'bg-red-500'
                    : tooltip.data.severity === 'high'
                      ? 'bg-orange-500'
                      : tooltip.data.severity === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                }`}
              />
              <span className="text-[11px] text-gray-400 capitalize">
                {tooltip.data.severity} risk
              </span>
              {/* Mini progress bar */}
              {tooltip.data.total > 0 && (
                <div className="flex-1 h-1 rounded-full bg-white/5 ml-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${((tooltip.data.total - tooltip.data.delayed) / tooltip.data.total) * 100}%`,
                      background:
                        'linear-gradient(90deg, rgba(16,185,129,0.8), rgba(59,130,246,0.8))',
                    }}
                  />
                </div>
              )}
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
