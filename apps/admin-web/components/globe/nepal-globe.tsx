'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with WebGL
const Globe = dynamic(() => import('react-globe.gl').then(m => m.default), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
    </div>
  ),
});

interface GlobeProps {
  width?: number;
  height?: number;
}

// Nepal center coordinates
const NEPAL_LAT = 28.3949;
const NEPAL_LNG = 84.1240;

export function NepalGlobe({ width, height }: GlobeProps) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [nepalGeoJson, setNepalGeoJson] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Load Nepal GeoJSON
  useEffect(() => {
    fetch('/geo/nepal-country.geojson')
      .then(r => r.json())
      .then(data => setNepalGeoJson(data.features))
      .catch(() => {});
  }, []);

  // Auto-resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: width ?? containerRef.current.offsetWidth,
          height: height ?? containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width, height]);

  // Configure globe once ready
  const handleGlobeReady = useCallback(() => {
    if (!globeRef.current) return;

    const globe = globeRef.current;

    // Point of view: centered on Nepal, zoomed in
    globe.pointOfView({ lat: NEPAL_LAT, lng: NEPAL_LNG, altitude: 2.2 }, 0);

    // Auto-rotate
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
      controls.enablePan = false;
    }

    // Scene customization
    const scene = globe.scene();
    if (scene) {
      scene.fog = null;
    }

    setIsReady(true);
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          onGlobeReady={handleGlobeReady}

          // Earth appearance
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"

          // Atmosphere
          showAtmosphere={true}
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.2}

          // Nepal highlight polygon
          polygonsData={nepalGeoJson ?? []}
          polygonCapColor={() => 'rgba(59, 130, 246, 0.35)'}
          polygonSideColor={() => 'rgba(59, 130, 246, 0.15)'}
          polygonStrokeColor={() => '#60a5fa'}
          polygonAltitude={0.01}
          polygonLabel={(d: any) => `
            <div style="
              background: rgba(15,22,41,0.95);
              border: 1px solid rgba(59,130,246,0.3);
              border-radius: 12px;
              padding: 12px 16px;
              color: white;
              font-family: system-ui;
              box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            ">
              <div style="font-size: 14px; font-weight: 700;">🏔 Nepal</div>
              <div style="font-size: 11px; color: #93c5fd; margin-top: 4px;">
                Federal Democratic Republic
              </div>
            </div>
          `}
        />
      )}

      {/* Fade overlay at edges for seamless integration */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,16,0.6) 80%, rgba(5,5,16,1) 100%)',
        }}
      />
    </div>
  );
}
