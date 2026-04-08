'use client';

/**
 * Tiny Leaflet map for office locations.
 * No npm dependency — loads leaflet from unpkg CDN on mount.
 * SSR-safe (renders nothing on server).
 */

import { useEffect, useRef } from 'react';

interface Marker {
  lat: number;
  lng: number;
  label: string;
}

interface Props {
  markers: Marker[];
  height?: number;
}

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function loadLeaflet(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('ssr');
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    if (document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
      const check = setInterval(() => {
        if ((window as any).L) { clearInterval(check); resolve((window as any).L); }
      }, 50);
      return;
    }
    const s = document.createElement('script');
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve((window as any).L);
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function OfficeMap({ markers, height = 260 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current || markers.length === 0) return;
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !ref.current) return;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        const center: [number, number] = [markers[0].lat, markers[0].lng];
        const map = L.map(ref.current, { scrollWheelZoom: false }).setView(center, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        const bounds: any[] = [];
        for (const m of markers) {
          L.marker([m.lat, m.lng]).addTo(map).bindPopup(m.label);
          bounds.push([m.lat, m.lng]);
        }
        if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
        mapRef.current = map;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [markers]);

  if (markers.length === 0) return null;

  return (
    <div
      ref={ref}
      className="rounded-xl overflow-hidden border border-zinc-800"
      style={{ height, width: '100%' }}
      aria-label="Office locations map"
    />
  );
}
