import React, { useMemo } from 'react';
import { VIGILANCE_NIVEAUX } from '@/lib/constants';

/* ─────────────────────────────────────────────────────────
   Minimal GeoJSON types (no @types/geojson needed)
   ───────────────────────────────────────────────────────── */
type Position = [number, number];
type Ring = Position[];
interface GeoPolygon    { type: 'Polygon';      coordinates: Ring[]; }
interface GeoMultiPoly  { type: 'MultiPolygon'; coordinates: Ring[][]; }
interface GeoFeature    { type: 'Feature'; geometry: GeoPolygon | GeoMultiPoly; properties: Record<string, string | number>; }
interface GeoCollection { type: 'FeatureCollection'; features: GeoFeature[]; }

/* ─────────────────────────────────────────────────────────
   GeoJSON bounds  (mali-admin1.geojson)
   lon: -12.2392 → 4.2447   lat: 10.1414 → 24.9995
   ───────────────────────────────────────────────────────── */
const LON_MIN = -12.2392;
const LON_MAX =  4.2447;
const LAT_MIN = 10.1414;
const LAT_MAX = 24.9995;
const VW = 300;
const VH = 270;

function project(lon: number, lat: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * VW;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VH;
  return [x, y];
}

function ringToPath(ring: Ring): string {
  return ring
    .map(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ') + ' Z';
}

function featureToPath(feat: GeoFeature): string {
  const geom = feat.geometry;
  if (geom.type === 'Polygon')
    return geom.coordinates.map(ringToPath).join(' ');
  return geom.coordinates.flatMap((poly) => poly.map(ringToPath)).join(' ');
}

/* ─────────────────────────────────────────────────────────
   Props
   ───────────────────────────────────────────────────────── */
interface Props {
  vigilanceData: { region: string; niveau: string }[];
  width?: number;
}

const COLOR_MAP: Record<string, string> = Object.fromEntries(
  VIGILANCE_NIVEAUX.map((v) => [v.value, v.color])
);

export function MiniVigilanceMap({ vigilanceData, width = 260 }: Props) {
  const byRegion = useMemo(() => {
    const m: Record<string, string> = {};
    vigilanceData.forEach(({ region, niveau }) => { m[region] = niveau; });
    return m;
  }, [vigilanceData]);

  const [geojson, setGeojson] = React.useState<GeoCollection | null>(null);

  React.useEffect(() => {
    const base = (import.meta as { env: Record<string, string> }).env.BASE_URL ?? '/';
    fetch(`${base}mali-admin1.geojson`)
      .then((r) => r.json())
      .then(setGeojson)
      .catch(console.error);
  }, []);

  if (!geojson) {
    return (
      <div style={{
        width, aspectRatio: '300 / 270',
        background: '#f0f4f8', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: '#888',
      }}>
        Chargement…
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width={width}
      style={{ display: 'block' }}
      aria-label="Carte de vigilance du Mali"
    >
      {geojson.features.map((feat) => {
        const name = String(feat.properties.name ?? '');
        const niveau = byRegion[name] ?? 'pas_vigilance';
        const fill = COLOR_MAP[niveau] ?? '#2fb84a';
        return (
          <path
            key={name}
            d={featureToPath(feat)}
            fill={fill}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
