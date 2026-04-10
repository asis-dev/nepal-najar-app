'use client';

import { useState, useCallback, useRef } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ReverseGeoResult {
  province?: string;
  district?: string;
  municipality?: string;
  ward?: string;
  locality?: string;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  geoResult: ReverseGeoResult | null;
  loading: boolean;
  error: string | null;
  isSupported: boolean;
  requestLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [geoResult, setGeoResult] = useState<ReverseGeoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  const isSupported = typeof window !== 'undefined' && 'geolocation' in navigator;

  const requestLocation = useCallback(() => {
    if (!isSupported) {
      setError('Geolocation not supported on this device');
      return;
    }
    if (requested.current && position) return; // Already have it
    requested.current = true;
    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const geo: GeoPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setPosition(geo);

        // Reverse geocode
        try {
          const res = await fetch(`/api/onboarding/reverse-geocode?lat=${geo.latitude}&lng=${geo.longitude}`);
          if (res.ok) {
            const data = await res.json();
            setGeoResult(data);
          }
        } catch {
          // Non-blocking — we still have coordinates
        }

        setLoading(false);
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location permission denied. You can type your location instead.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable. Please type your location.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('Could not get your location.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [isSupported, position]);

  return { position, geoResult, loading, error, isSupported, requestLocation };
}
