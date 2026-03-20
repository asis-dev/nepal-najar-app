'use client';

export function useMapTilerToken() {
  const token = process.env.NEXT_PUBLIC_MAPTILER_KEY || null;
  return { token, hasToken: !!token };
}
