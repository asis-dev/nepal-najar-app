/**
 * GET /api/onboarding/reverse-geocode?lat=27.7&lng=85.3
 *
 * Maps lat/lng to Nepal administrative divisions (province/district/municipality/ward).
 * Uses a local Nepal district centroid lookup for fast, free, privacy-preserving resolution.
 * Falls back to OpenStreetMap Nominatim for finer resolution.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Nepal's 77 districts with approximate centroids
const NEPAL_DISTRICTS: Array<{
  district: string;
  province: string;
  lat: number;
  lng: number;
}> = [
  // Province 1 (Koshi)
  { district: 'Taplejung', province: '1', lat: 27.35, lng: 87.67 },
  { district: 'Panchthar', province: '1', lat: 27.13, lng: 87.78 },
  { district: 'Ilam', province: '1', lat: 26.91, lng: 87.93 },
  { district: 'Jhapa', province: '1', lat: 26.55, lng: 87.89 },
  { district: 'Morang', province: '1', lat: 26.67, lng: 87.28 },
  { district: 'Sunsari', province: '1', lat: 26.68, lng: 87.17 },
  { district: 'Dhankuta', province: '1', lat: 26.98, lng: 87.35 },
  { district: 'Terhathum', province: '1', lat: 27.13, lng: 87.55 },
  { district: 'Sankhuwasabha', province: '1', lat: 27.40, lng: 87.20 },
  { district: 'Bhojpur', province: '1', lat: 27.17, lng: 87.05 },
  { district: 'Solukhumbu', province: '1', lat: 27.79, lng: 86.74 },
  { district: 'Okhaldhunga', province: '1', lat: 27.31, lng: 86.50 },
  { district: 'Khotang', province: '1', lat: 27.02, lng: 86.85 },
  { district: 'Udayapur', province: '1', lat: 26.93, lng: 86.52 },
  // Province 2 (Madhesh)
  { district: 'Saptari', province: '2', lat: 26.63, lng: 86.73 },
  { district: 'Siraha', province: '2', lat: 26.65, lng: 86.20 },
  { district: 'Dhanusha', province: '2', lat: 26.77, lng: 85.93 },
  { district: 'Mahottari', province: '2', lat: 26.77, lng: 85.77 },
  { district: 'Sarlahi', province: '2', lat: 26.87, lng: 85.60 },
  { district: 'Rautahat', province: '2', lat: 27.00, lng: 85.28 },
  { district: 'Bara', province: '2', lat: 27.08, lng: 85.07 },
  { district: 'Parsa', province: '2', lat: 27.07, lng: 84.95 },
  // Province 3 (Bagmati)
  { district: 'Dolakha', province: '3', lat: 27.78, lng: 86.07 },
  { district: 'Sindhupalchok', province: '3', lat: 27.95, lng: 85.70 },
  { district: 'Rasuwa', province: '3', lat: 28.06, lng: 85.31 },
  { district: 'Nuwakot', province: '3', lat: 27.91, lng: 85.16 },
  { district: 'Dhading', province: '3', lat: 27.87, lng: 84.93 },
  { district: 'Kathmandu', province: '3', lat: 27.72, lng: 85.32 },
  { district: 'Lalitpur', province: '3', lat: 27.66, lng: 85.32 },
  { district: 'Bhaktapur', province: '3', lat: 27.67, lng: 85.43 },
  { district: 'Kavrepalanchok', province: '3', lat: 27.55, lng: 85.55 },
  { district: 'Ramechhap', province: '3', lat: 27.33, lng: 86.08 },
  { district: 'Sindhuli', province: '3', lat: 27.25, lng: 85.97 },
  { district: 'Makwanpur', province: '3', lat: 27.42, lng: 85.02 },
  { district: 'Chitwan', province: '3', lat: 27.53, lng: 84.35 },
  // Province 4 (Gandaki)
  { district: 'Gorkha', province: '4', lat: 28.38, lng: 84.63 },
  { district: 'Lamjung', province: '4', lat: 28.30, lng: 84.41 },
  { district: 'Tanahun', province: '4', lat: 28.05, lng: 84.23 },
  { district: 'Kaski', province: '4', lat: 28.21, lng: 83.99 },
  { district: 'Syangja', province: '4', lat: 28.10, lng: 83.82 },
  { district: 'Parbat', province: '4', lat: 28.33, lng: 83.72 },
  { district: 'Baglung', province: '4', lat: 28.27, lng: 83.60 },
  { district: 'Myagdi', province: '4', lat: 28.57, lng: 83.50 },
  { district: 'Mustang', province: '4', lat: 28.98, lng: 83.78 },
  { district: 'Manang', province: '4', lat: 28.67, lng: 84.02 },
  { district: 'Nawalparasi East', province: '4', lat: 27.72, lng: 84.10 },
  // Province 5 (Lumbini)
  { district: 'Nawalparasi West', province: '5', lat: 27.55, lng: 83.67 },
  { district: 'Rupandehi', province: '5', lat: 27.50, lng: 83.45 },
  { district: 'Kapilvastu', province: '5', lat: 27.57, lng: 83.05 },
  { district: 'Palpa', province: '5', lat: 27.87, lng: 83.55 },
  { district: 'Arghakhanchi', province: '5', lat: 28.03, lng: 83.17 },
  { district: 'Gulmi', province: '5', lat: 28.08, lng: 83.28 },
  { district: 'Pyuthan', province: '5', lat: 28.10, lng: 82.85 },
  { district: 'Rolpa', province: '5', lat: 28.50, lng: 82.65 },
  { district: 'Rukum East', province: '5', lat: 28.58, lng: 82.47 },
  { district: 'Dang', province: '5', lat: 28.12, lng: 82.30 },
  { district: 'Banke', province: '5', lat: 28.05, lng: 81.63 },
  { district: 'Bardiya', province: '5', lat: 28.37, lng: 81.35 },
  // Province 6 (Karnali)
  { district: 'Rukum West', province: '6', lat: 28.62, lng: 82.27 },
  { district: 'Salyan', province: '6', lat: 28.38, lng: 82.17 },
  { district: 'Dolpa', province: '6', lat: 29.05, lng: 82.97 },
  { district: 'Jumla', province: '6', lat: 29.27, lng: 82.18 },
  { district: 'Kalikot', province: '6', lat: 29.15, lng: 81.82 },
  { district: 'Mugu', province: '6', lat: 29.55, lng: 82.07 },
  { district: 'Humla', province: '6', lat: 29.97, lng: 81.82 },
  { district: 'Dailekh', province: '6', lat: 28.85, lng: 81.72 },
  { district: 'Jajarkot', province: '6', lat: 28.73, lng: 82.20 },
  { district: 'Surkhet', province: '6', lat: 28.60, lng: 81.62 },
  // Province 7 (Sudurpashchim)
  { district: 'Bajura', province: '7', lat: 29.48, lng: 81.33 },
  { district: 'Bajhang', province: '7', lat: 29.55, lng: 81.18 },
  { district: 'Achham', province: '7', lat: 29.05, lng: 81.25 },
  { district: 'Doti', province: '7', lat: 29.27, lng: 80.95 },
  { district: 'Kailali', province: '7', lat: 28.80, lng: 80.62 },
  { district: 'Kanchanpur', province: '7', lat: 28.98, lng: 80.33 },
  { district: 'Dadeldhura', province: '7', lat: 29.30, lng: 80.58 },
  { district: 'Baitadi', province: '7', lat: 29.53, lng: 80.42 },
  { district: 'Darchula', province: '7', lat: 29.85, lng: 80.55 },
];

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestDistrict(lat: number, lng: number) {
  let best = NEPAL_DISTRICTS[0];
  let bestDist = Infinity;
  for (const d of NEPAL_DISTRICTS) {
    const dist = distanceKm(lat, lng, d.lat, d.lng);
    if (dist < bestDist) {
      bestDist = dist;
      best = d;
    }
  }
  return { ...best, distanceKm: Math.round(bestDist * 10) / 10 };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 });
  }

  // Quick bounds check for Nepal
  if (lat < 26 || lat > 31 || lng < 79.5 || lng > 88.5) {
    return NextResponse.json({ error: 'Location outside Nepal' }, { status: 400 });
  }

  const nearest = findNearestDistrict(lat, lng);

  // Try Nominatim for finer municipality/ward resolution (best effort)
  let municipality: string | null = null;
  let locality: string | null = null;
  try {
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1&accept-language=en`,
      { headers: { 'User-Agent': 'NepalRepublic/1.0 (nepalrepublic.org)' } },
    );
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      const addr = nomData.address || {};
      municipality = addr.city || addr.town || addr.village || addr.municipality || null;
      locality = addr.suburb || addr.neighbourhood || addr.hamlet || null;
    }
  } catch {
    // Nominatim is optional enhancement
  }

  return NextResponse.json({
    district: nearest.district,
    province: nearest.province,
    municipality,
    locality,
    distanceKm: nearest.distanceKm,
    coordinates: { lat, lng },
  });
}
