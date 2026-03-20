'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Map, config, MapStyle } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

interface ProvinceData {
  name: string;
  total: number;
  delayed: number;
  severity: string;
  progress?: number;
}

interface NepalMapTilerMapProps {
  regionData: ProvinceData[];
  onProvinceClick?: (provinceName: string) => void;
  onDistrictClick?: (districtName: string, provinceName: string) => void;
  selectedProvince?: string | null;
  className?: string;
  interactive?: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  name: string;
  nameNe?: string;
  total?: number;
  delayed?: number;
  severity?: string;
  type: 'province' | 'district';
  province?: string;
}

export function NepalMapTilerMap({
  regionData,
  onProvinceClick,
  onDistrictClick,
  selectedProvince,
  className,
  interactive = true,
}: NepalMapTilerMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY || null;

  // Build a lookup from province name to regionData
  const dataMapRef = useRef<Record<string, ProvinceData>>({});
  useEffect(() => {
    const m: Record<string, ProvinceData> = {};
    for (const d of regionData) {
      m[d.name] = d;
    }
    dataMapRef.current = m;
  }, [regionData]);

  // Initialize the map
  useEffect(() => {
    if (!containerRef.current || !token) return;

    config.apiKey = token;

    const map = new Map({
      container: containerRef.current,
      style: MapStyle.BACKDROP.DARK,
      center: [84.12, 28.39],
      zoom: 6.5,
      pitch: 45,
      bearing: 0,
      terrain: true,
      terrainExaggeration: 1.5,
      navigationControl: true,
      geolocateControl: false,
      interactive,
    });

    mapRef.current = map;

    map.on('load', () => {
      // --- Province layers ---
      map.addSource('provinces', {
        type: 'geojson',
        data: '/geo/nepal-provinces.geojson',
        promoteId: 'name',
      });

      map.addLayer({
        id: 'province-fill',
        type: 'fill',
        source: 'provinces',
        paint: {
          'fill-color': [
            'match',
            ['get', 'severity'],
            'low', 'rgba(16, 185, 129, 0.35)',
            'medium', 'rgba(245, 158, 11, 0.35)',
            'high', 'rgba(249, 115, 22, 0.35)',
            'critical', 'rgba(239, 68, 68, 0.4)',
            'rgba(16, 185, 129, 0.35)',
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.85,
            0.6,
          ],
        },
      });

      // Selected province highlight layer
      map.addLayer({
        id: 'province-highlight',
        type: 'fill',
        source: 'provinces',
        paint: {
          'fill-color': 'rgba(59, 130, 246, 0.5)',
          'fill-opacity': 0.8,
        },
        filter: ['==', ['get', 'name'], ''],
      });

      map.addLayer({
        id: 'province-highlight-border',
        type: 'line',
        source: 'provinces',
        paint: {
          'line-color': '#60a5fa',
          'line-width': 3,
        },
        filter: ['==', ['get', 'name'], ''],
      });

      map.addLayer({
        id: 'province-border',
        type: 'line',
        source: 'provinces',
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.5)',
          'line-width': 2,
        },
      });

      map.addLayer({
        id: 'province-labels',
        type: 'symbol',
        source: 'provinces',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-font': ['Open Sans Bold'],
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.8)',
          'text-halo-width': 1.5,
        },
      });

      // --- District layers ---
      map.addSource('districts', {
        type: 'geojson',
        data: '/geo/nepal-districts.geojson',
      });

      map.addLayer({
        id: 'district-fill',
        type: 'fill',
        source: 'districts',
        minzoom: 7,
        paint: {
          'fill-color': 'rgba(59, 130, 246, 0.1)',
          'fill-opacity': 0.4,
        },
      });

      map.addLayer({
        id: 'district-border',
        type: 'line',
        source: 'districts',
        minzoom: 7,
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.25)',
          'line-width': 1,
        },
      });

      map.addLayer({
        id: 'district-labels',
        type: 'symbol',
        source: 'districts',
        minzoom: 8,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['Open Sans Regular'],
          'text-anchor': 'center',
        },
        paint: {
          'text-color': 'rgba(255, 255, 255, 0.7)',
          'text-halo-color': 'rgba(0, 0, 0, 0.7)',
          'text-halo-width': 1,
        },
      });

      setMapReady(true);
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, interactive]);

  // --- Hover interactions ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let hoveredProvinceId: string | null = null;

    const onProvinceMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const name = feature.properties?.name as string;
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      // Reset previous hover
      if (hoveredProvinceId && hoveredProvinceId !== name) {
        map.setFeatureState({ source: 'provinces', id: hoveredProvinceId }, { hover: false });
      }

      hoveredProvinceId = name;
      map.setFeatureState({ source: 'provinces', id: name }, { hover: true });
      map.getCanvas().style.cursor = 'pointer';

      const data = dataMapRef.current[name];
      setTooltipData({
        x: e.point.x,
        y: e.point.y,
        name,
        nameNe: feature.properties?.name_ne as string | undefined,
        total: data?.total,
        delayed: data?.delayed,
        severity: data?.severity ?? feature.properties?.severity,
        type: 'province',
      });
    };

    const onProvinceLeave = () => {
      if (hoveredProvinceId) {
        map.setFeatureState({ source: 'provinces', id: hoveredProvinceId }, { hover: false });
        hoveredProvinceId = null;
      }
      map.getCanvas().style.cursor = '';
      setTooltipData(null);
    };

    const onDistrictMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      map.getCanvas().style.cursor = 'pointer';

      setTooltipData({
        x: e.point.x,
        y: e.point.y,
        name: feature.properties?.name as string,
        nameNe: feature.properties?.name_ne as string | undefined,
        type: 'district',
        province: feature.properties?.province as string,
      });
    };

    const onDistrictLeave = () => {
      map.getCanvas().style.cursor = '';
      setTooltipData(null);
    };

    const onProvinceClickHandler = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const name = e.features[0].properties?.name as string;
      onProvinceClick?.(name);
    };

    const onDistrictClickHandler = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (!e.features || e.features.length === 0) return;
      const props = e.features[0].properties;
      onDistrictClick?.(props?.name as string, props?.province as string);
    };

    map.on('mousemove', 'province-fill', onProvinceMove);
    map.on('mouseleave', 'province-fill', onProvinceLeave);
    map.on('mousemove', 'district-fill', onDistrictMove);
    map.on('mouseleave', 'district-fill', onDistrictLeave);
    map.on('click', 'province-fill', onProvinceClickHandler);
    map.on('click', 'district-fill', onDistrictClickHandler);

    return () => {
      map.off('mousemove', 'province-fill', onProvinceMove);
      map.off('mouseleave', 'province-fill', onProvinceLeave);
      map.off('mousemove', 'district-fill', onDistrictMove);
      map.off('mouseleave', 'district-fill', onDistrictLeave);
      map.off('click', 'province-fill', onProvinceClickHandler);
      map.off('click', 'district-fill', onDistrictClickHandler);
    };
  }, [mapReady, onProvinceClick, onDistrictClick]);

  // --- Selected province highlighting ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const filterValue = selectedProvince || '';
    map.setFilter('province-highlight', ['==', ['get', 'name'], filterValue]);
    map.setFilter('province-highlight-border', ['==', ['get', 'name'], filterValue]);
  }, [selectedProvince, mapReady]);

  // --- No token placeholder ---
  if (!token) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center ${className || ''}`}>
        <div className="glass-card px-8 py-6 text-center">
          <p className="text-gray-400 text-sm">Map requires MapTiler API key</p>
          <p className="text-gray-500 text-xs mt-2">
            Set <code className="text-blue-400">NEXT_PUBLIC_MAPTILER_KEY</code> in your environment
          </p>
        </div>
      </div>
    );
  }

  const severityDot = (severity?: string) => {
    if (severity === 'critical') return 'bg-red-500';
    if (severity === 'high') return 'bg-orange-500';
    if (severity === 'medium') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden" />
      {tooltipData && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{ left: tooltipData.x + 15, top: tooltipData.y - 10 }}
        >
          <div
            className="glass-card px-4 py-3 min-w-[180px]"
            style={{
              boxShadow:
                '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(59,130,246,0.1)',
            }}
          >
            <p className="text-sm font-bold text-white">{tooltipData.name}</p>
            {tooltipData.nameNe && (
              <p className="text-xs text-gray-400">{tooltipData.nameNe}</p>
            )}
            {tooltipData.type === 'province' && (
              <>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div>
                    <span className="text-gray-400">Projects</span>
                    <p className="text-white font-bold text-lg">
                      {tooltipData.total ?? 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Delayed</span>
                    <p className="text-red-400 font-bold text-lg">
                      {tooltipData.delayed ?? 0}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${severityDot(tooltipData.severity)}`}
                  />
                  <span className="text-xs text-gray-400 capitalize">
                    {tooltipData.severity ?? 'low'} risk
                  </span>
                </div>
              </>
            )}
            {tooltipData.type === 'district' && tooltipData.province && (
              <p className="text-xs text-gray-500 mt-1">
                {tooltipData.province}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
