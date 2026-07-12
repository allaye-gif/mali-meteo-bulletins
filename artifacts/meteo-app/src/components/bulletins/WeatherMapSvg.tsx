/**
 * WeatherMapSvg — SVG-based weather map for National / ORTM bulletins.
 *
 * Replaces the old MapOverlay (which used a scanned PNG that had SG text baked in).
 * The Mali outline is drawn from mali-admin1.geojson (same projection as MiniVigilanceMap).
 * City labels are positioned with computed % values from actual lat/lng coordinates.
 */
import React from 'react';
import { CITIES, CONDITIONS } from '@/lib/constants';
import { Bulletin } from '@workspace/api-client-react';

const FONT = '"Segoe UI", "Liberation Sans", Arial, Helvetica, sans-serif';
const PRINT = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties;

/* ── Geo projection (identical bounds/logic to MiniVigilanceMap) ─────────── */
const LON_MIN = -12.2392, LON_MAX = 4.2447;
const LAT_MIN = 10.1414, LAT_MAX = 24.9995;
const VW = 300, VH = 270; // SVG viewBox (same aspect ratio as MiniVigilanceMap)

function projectSvg(lng: number, lat: number): [number, number] {
  return [
    ((lng - LON_MIN) / (LON_MAX - LON_MIN)) * VW,
    ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * VH,
  ];
}

/** Convert lat/lng → % position over the SVG container (for HTML overlay labels) */
function cityToPct(lng: number, lat: number) {
  return {
    left: ((lng - LON_MIN) / (LON_MAX - LON_MIN) * 100).toFixed(2) + '%',
    top:  ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN) * 100).toFixed(2) + '%',
  };
}

/* ── GeoJSON types ───────────────────────────────────────────────────────── */
type Pos = [number, number];
interface GeoFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: Pos[][] | Pos[][][] };
  properties: Record<string, unknown>;
}
interface GeoCollection { type: 'FeatureCollection'; features: GeoFeature[]; }

function ringPath(ring: Pos[]): string {
  return ring.map(([ln, la], i) => {
    const [x, y] = projectSvg(ln, la);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function featurePath(feat: GeoFeature): string {
  const g = feat.geometry;
  if (g.type === 'Polygon')
    return (g.coordinates as Pos[][]).map(ringPath).join(' ');
  return (g.coordinates as Pos[][][]).flatMap(p => p.map(ringPath)).join(' ');
}

/* ── Wind arrow rotation map ─────────────────────────────────────────────── */
const DIR_ROT: Record<string, number> = {
  N: 180, NE: 225, E: 270, SE: 315, S: 0, SO: 45, O: 90, NO: 135,
};

/**
 * Manual % nudges for dense southern cities where computed lat/lng positions
 * cause label overlap. Values are added to the projected left/top %.
 * Tuned so each label has at least ~5% clearance from its neighbours.
 */
const CITY_NUDGE: Record<string, { dx: number; dy: number }> = {
  // Bamako/Koulikoro/Dioïla cluster (all within ~8% horizontal, ~5% vertical)
  'Bamako':     { dx: -4,  dy:  2 },  // nudge left + slightly down
  'Koulikoro':  { dx:  6,  dy: -5 },  // nudge right + up (above Bamako)
  'Dioïla':     { dx:  7,  dy:  3 },  // nudge right + slightly down
  'Kita':       { dx: -3,  dy:  1 },  // minor left to clear Bamako left side
  'Bougouni':   { dx: -4,  dy:  1 },  // pull left so it's under Kita not Bamako
  // Mopti/Bandiagara cluster (3.6% apart horizontally)
  'Mopti':      { dx: -5,  dy: -1 },  // nudge left
  'Bandiagara': { dx:  4,  dy:  3 },  // nudge right + down
  // Douentza/Bandiagara separation (also close)
  'Douentza':   { dx:  3,  dy: -2 },  // nudge right + up
  // Koutiala sits close to Dioïla after its nudge
  'Koutiala':   { dx:  5,  dy: -1 },  // nudge right
};

/* ── Component ───────────────────────────────────────────────────────────── */
interface Props {
  data: Bulletin;
  /** Show per-city wind arrows. Default true (National). ORTM = false. */
  showWindArrows?: boolean;
}

export function WeatherMapSvg({ data, showWindArrows = true }: Props) {
  const [geojson, setGeojson] = React.useState<GeoCollection | null>(null);

  React.useEffect(() => {
    const base = (import.meta as { env: Record<string, string> }).env.BASE_URL ?? '/';
    fetch(`${base}mali-admin1.geojson`)
      .then(r => r.json())
      .then(setGeojson)
      .catch(console.error);
  }, []);

  /* Lookup: ville name → donnees */
  const villeMap = React.useMemo(() => {
    const m: Record<string, Bulletin['donneesVilles'][number]> = {};
    data.donneesVilles.forEach(v => { m[v.nom] = v; });
    return m;
  }, [data.donneesVilles]);

  return (
    <div style={{ padding: '4px 28px 16px', fontFamily: FONT }}>
      {/* Section title */}
      <div style={{
        color: '#c86a1f', fontSize: 17, fontWeight: 700,
        fontFamily: FONT, marginBottom: 4,
      }}>Prévision</div>

      {/* Map container: SVG background + HTML label overlays */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${VW} / ${VH}`,
        ...PRINT,
      }}>
        {/* ── SVG Mali outline ── */}
        {geojson ? (
          <svg
            viewBox={`0 0 ${VW} ${VH}`}
            width="100%" height="100%"
            style={{ position: 'absolute', inset: 0, display: 'block' }}
            aria-hidden
          >
            {geojson.features.map(feat => (
              <path
                key={String(feat.properties.name ?? '')}
                d={featurePath(feat)}
                fill="#c8a055"
                stroke="#7a6030"
                strokeWidth="0.7"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        ) : (
          /* Placeholder while GeoJSON loads */
          <div style={{
            position: 'absolute', inset: 0,
            background: '#e4cc80',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#888',
          }}>Chargement…</div>
        )}

        {/* ── Legend (top-left) ── */}
        <div style={{
          position: 'absolute', top: '2%', left: '1%',
          background: 'rgba(255,255,255,0.94)',
          border: '1px solid #aaa', borderRadius: 2,
          padding: '3px 5px',
          fontSize: 7, lineHeight: 1.6,
          fontFamily: FONT, zIndex: 10,
          maxWidth: '28%',
          ...PRINT,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2, fontSize: 7.5 }}>Légende</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <polygon points="6,1 8.5,9 6,7 3.5,9" fill="#333" />
            </svg>
            <span>: direction du vent</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
            <span style={{ fontSize: 9, lineHeight: 1 }}>⛈️</span>
            <span>: temps significatif (le symbole représente<br/>le temps le plus dégradé de la journée)</span>
          </div>

          <div>
            <span style={{ color: '#c00000', fontWeight: 600 }}>Tmax</span>
            {' '}: température maximale (°C)
          </div>
          <div style={{ color: '#1f4e9c' }}>température minimale</div>
        </div>

        {/* ── Compass rose (top-right) — N, O, E, S ── */}
        <div style={{ position: 'absolute', top: '2%', right: '2%', zIndex: 10, ...PRINT }}>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-label="Rose des vents">
            {/* Cross lines */}
            <line x1="24" y1="5" x2="24" y2="43" stroke="#333" strokeWidth="0.7" />
            <line x1="5" y1="24" x2="43" y2="24" stroke="#333" strokeWidth="0.7" />
            {/* N arrow (filled north, hollow south) */}
            <polygon points="24,2 27,13 24,11 21,13" fill="#222" />
            <polygon points="24,46 27,35 24,37 21,35" fill="none" stroke="#555" strokeWidth="0.6" />
            {/* Cardinal labels */}
            <text x="24" y="19" textAnchor="middle" fontSize="8" fontWeight="bold" fontFamily="Arial" fill="#111">N</text>
            <text x="24" y="34" textAnchor="middle" fontSize="7" fontFamily="Arial" fill="#444">S</text>
            <text x="38" y="26.5" textAnchor="middle" fontSize="7" fontFamily="Arial" fill="#444">E</text>
            <text x="10" y="26.5" textAnchor="middle" fontSize="7" fontFamily="Arial" fill="#444">O</text>
          </svg>
        </div>

        {/* ── City weather labels ── */}
        {CITIES.map(city => {
          const v = villeMap[city.name];
          if (!v) return null;
          const { left, top } = cityToPct(city.lng, city.lat);
          const nudge = CITY_NUDGE[city.name] ?? { dx: 0, dy: 0 };
          const finalLeft = nudge.dx ? `calc(${left} + ${nudge.dx}%)` : left;
          const finalTop  = nudge.dy ? `calc(${top}  + ${nudge.dy}%)` : top;
          const condIcon = CONDITIONS.find(c => c.value === v.condition)?.icon ?? '';
          const windRot = DIR_ROT[v.directionVent ?? 'S'] ?? 0;

          return (
            <div
              key={city.id}
              style={{
                position: 'absolute',
                left: finalLeft, top: finalTop,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #999',
                borderRadius: 2,
                padding: '1px 4px',
                textAlign: 'center',
                fontFamily: FONT,
                zIndex: 5,
                minWidth: 28,
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                ...PRINT,
              }}
            >
              {/* Wind arrow (National only) */}
              {showWindArrows && v.directionVent && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10"
                    style={{ transform: `rotate(${windRot}deg)` }} aria-hidden>
                    <polygon points="5,1 7.5,9 5,7 2.5,9" fill="#444" />
                  </svg>
                </div>
              )}
              {/* City name */}
              <div style={{ fontSize: 6.5, fontWeight: 700, lineHeight: 1.2, color: '#000' }}>
                {city.name}
              </div>
              {/* Weather icon */}
              {condIcon && (
                <div style={{ fontSize: 9, lineHeight: 1 }}>{condIcon}</div>
              )}
              {/* Tmax */}
              <div style={{ fontSize: 8, fontWeight: 700, color: '#c00000', lineHeight: 1.2 }}>
                {v.tmax !== null ? `${v.tmax}°` : '–'}
              </div>
              {/* Tmin */}
              <div style={{ fontSize: 8, fontWeight: 700, color: '#1f4e9c', lineHeight: 1.2 }}>
                {v.tmin !== null ? `${v.tmin}°` : '–'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
