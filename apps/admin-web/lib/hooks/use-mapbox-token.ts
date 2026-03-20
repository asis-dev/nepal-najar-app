'use client';

export function useMapboxToken() {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null;
  return { token, hasToken: !!token };
}
