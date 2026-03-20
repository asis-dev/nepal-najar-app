'use client';

import { useMapTilerToken } from '@/lib/hooks/use-maptiler-token';
import { NepalMapTilerMap } from './nepal-maptiler-map';
import { Nepal3DMap } from './nepal-3d-map';

interface ProvinceData {
  name: string;
  total: number;
  delayed: number;
  severity: string;
  progress?: number;
}

interface MapFallbackProps {
  regionData: ProvinceData[];
  onProvinceClick?: (provinceName: string) => void;
  onDistrictClick?: (districtName: string, provinceName: string) => void;
  selectedProvince?: string | null;
  className?: string;
}

export function MapFallback({
  regionData,
  onProvinceClick,
  onDistrictClick,
  selectedProvince,
  className,
}: MapFallbackProps) {
  const { hasToken } = useMapTilerToken();

  if (hasToken) {
    return (
      <NepalMapTilerMap
        regionData={regionData}
        onProvinceClick={onProvinceClick}
        onDistrictClick={onDistrictClick}
        selectedProvince={selectedProvince}
        className={className}
      />
    );
  }

  return (
    <Nepal3DMap
      regionData={regionData}
      onProvinceClick={onProvinceClick}
      selectedProvince={selectedProvince}
    />
  );
}
