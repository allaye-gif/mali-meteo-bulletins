import React, { useMemo } from 'react';
import { VIGILANCE_NIVEAUX, VIGILANCE_TYPES } from '@/lib/constants';

type Position = [number, number];
type Ring = Position[];
interface GeoPolygon    { type: 'Polygon';      coordinates: Ring[]; }
interface GeoMultiPoly  { type: 'MultiPolygon'; coordinates: Ring[][]; }
interface GeoFeature    { type: 'Feature'; geometry: GeoPolygon | GeoMultiPoly; properties: Record<string, string | number>; }
interface GeoCollection { type: 'FeatureCollection'; features: GeoFeature[]; }

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

/** Rough centroid: average projected coords of largest ring */
function featureCentroid(feat: GeoFeature): [number, number] {
  const geom = feat.geometry;
  let ring: Ring;
  if (geom.type === 'Polygon') {
    ring = geom.coordinates[0];
  } else {
    // pick largest polygon (most coords)
    const biggest = geom.coordinates.reduce((a, b) => (a[0].length > b[0].length ? a : b));
    ring = biggest[0];
  }
  let sx = 0, sy = 0;
  for (const [lon, lat] of ring) {
    const [x, y] = project(lon, lat);
    sx += x; sy += y;
  }
  return [sx / ring.length, sy / ring.length];
}

interface VigilanceItem {
  region: string;
  niveau: string;
  type?: string;
}

interface Props {
  vigilanceData: VigilanceItem[];
  width?: number;
}

const COLOR_MAP: Record<string, string> = Object.fromEntries(
  VIGILANCE_NIVEAUX.map((v) => [v.value, v.color])
);
const TYPE_ICON: Record<string, string> = Object.fromEntries(
  VIGILANCE_TYPES.map((t) => [t.value, t.icon])
);

export function MiniVigilanceMap({ vigilanceData, width = 260 }: Props) {
  const byRegion = useMemo(() => {
    const m: Record<string, { niveau: string; type: string }> = {};
    vigilanceData.forEach(({ region, niveau, type }) => {
      m[region] = { niveau, type: type ?? 'aucun' };
    });
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

  const scale = width / VW;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      width={width}
      style={{ display: 'block' }}
      aria-label="Carte de vigilance du Mali"
    >
      {/* Regions */}
      {geojson.features.map((feat) => {
        const name = String(feat.properties.name ?? '');
        const info = byRegion[name] ?? { niveau: 'pas_vigilance', type: 'aucun' };
        const fill = COLOR_MAP[info.niveau] ?? '#2fb84a';
        return (
          <path
            key={name}
            d={featureToPath(feat)}
            fill={fill}
            fillOpacity={0.85}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Type icons overlay */}
      {geojson.features.map((feat) => {
        const name = String(feat.properties.name ?? '');
        const info = byRegion[name] ?? { niveau: 'pas_vigilance', type: 'aucun' };
        if (!info.type || info.type === 'aucun' || info.niveau === 'pas_vigilance') return null;
        const icon = TYPE_ICON[info.type] ?? '';
        if (!icon || icon === '–') return null;
        const [cx, cy] = featureCentroid(feat);
        // font-size in viewBox units (later scaled by the SVG width)
        const fs = 18;
        return (
          <text
            key={`icon-${name}`}
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={fs}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {icon}
          </text>
        );
      })}
    </svg>
  );
}
