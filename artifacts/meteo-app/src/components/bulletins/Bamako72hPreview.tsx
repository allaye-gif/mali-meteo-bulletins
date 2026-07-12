/**
 * Bamako72hPreview — prévisionniste 3 jours pour Bamako et environs.
 *
 * Référence visuelle : bulletin MALI-METEO "Prévisions pour les 3 jours suivants
 * pour Bamako et environs". Layout : 3 lignes, alternant la colonne avec les
 * températures+icône et la colonne avec la mini-carte de Bamako + vent.
 */
import React from 'react';
import { Bulletin } from '@workspace/api-client-react';
import { CONDITIONS } from '@/lib/constants';

const FONT = '"Segoe UI", "Liberation Sans", Arial, Helvetica, sans-serif';
const PRINT = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties;
const BLUE = '#2e74b5';

/* ── Bamako district SVG path (from mali-admin1.geojson, viewBox 0 0 140 130) ── */
const BAMAKO_PATH =
  'M117.3,35.5 L116.5,66.2 L131.7,64.9 L135.0,67.4 L131.1,93.2 ' +
  'L138.3,105.3 L133.2,115.1 L125.4,119.4 L92.3,117.4 L75.4,127.7 ' +
  'L61.9,130.0 L25.1,128.4 L28.7,112.8 L40.8,89.3 L21.0,90.0 ' +
  'L13.1,87.4 L8.9,80.2 L16.8,61.1 L0.0,62.0 L22.2,31.6 ' +
  'L37.2,21.9 L47.7,20.2 L61.0,0.0 L94.9,13.4 L106.9,5.9 ' +
  'L130.4,3.0 L140.0,27.1 L125.4,33.7 L117.3,35.5 Z';

const DIR_ROT: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SO: 225, O: 270, NO: 315,
};

/* ── Weather icon (same as BulletinPreview) ── */
function condToType(cond: string | null): 'soleil' | 'nuageux' | 'pluie' {
  if (!cond) return 'pluie';
  if (cond === 'ensoleille') return 'soleil';
  if (cond === 'partiellement_nuageux' || cond === 'nuageux' || cond === 'couvert') return 'nuageux';
  return 'pluie';
}

function WeatherIcon({ cond }: { cond: string | null }) {
  const type = condToType(cond);
  if (type === 'soleil') {
    return (
      <svg width="80" height="65" viewBox="0 0 64 52" aria-hidden>
        <circle cx="32" cy="26" r="12" fill="#f5c518" stroke="#e0a800" strokeWidth="1.5" />
        {[0,45,90,135,180,225,270,315].map((a) => (
          <line key={a} x1="32" y1="26" x2="32" y2="4"
            stroke="#f5c518" strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${a} 32 26)`} />
        ))}
        <circle cx="32" cy="26" r="10" fill="#ffd633" />
      </svg>
    );
  }
  if (type === 'nuageux') {
    return (
      <svg width="90" height="65" viewBox="0 0 70 52" aria-hidden>
        <ellipse cx="28" cy="20" rx="12" ry="10" fill="#f5c518" />
        <path d="M14 40 Q10 28 22 26 Q26 16 38 20 Q52 18 54 30 Q64 32 60 42 Q56 48 46 46 L20 46 Q10 46 14 40 Z"
          fill="#d0d0d0" stroke="#7a7a7a" strokeWidth="1.2" />
      </svg>
    );
  }
  return (
    <svg width="90" height="75" viewBox="0 0 70 58" aria-hidden>
      <circle cx="22" cy="16" r="9" fill="#f5c518" />
      <path d="M10 38 Q6 26 18 24 Q22 14 34 18 Q48 16 50 28 Q60 30 56 40 Q52 46 42 44 L16 44 Q6 44 10 38 Z"
        fill="#bcbcbc" stroke="#666" strokeWidth="1" />
      <path d="M22 46 L18 54" stroke="#4aa3ff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M40 46 L36 54" stroke="#4aa3ff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M31 44 L27 52 L31 52 L28 58" fill="none" stroke="#f5b400" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Mini Bamako map with wind direction ── */
function BamakoMiniMap({
  windDir, windSpeed,
}: { windDir: string | null; windSpeed: number | null }) {
  const rot = DIR_ROT[windDir ?? 'SO'] ?? 225;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 8, ...PRINT,
    }}>
      <div style={{ position: 'relative', width: 170, height: 158 }}>
        {/* District outline */}
        <svg viewBox="0 0 140 130" width="170" height="158" style={{ display: 'block' }}>
          <path d={BAMAKO_PATH} fill="none" stroke="#555" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>

        {/* Wind direction label + arrow centred over map */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: FONT, color: '#222' }}>
            {windDir ?? '–'}
          </div>
          <svg width="36" height="36" viewBox="0 0 36 36"
            style={{ transform: `rotate(${rot}deg)` }} aria-hidden>
            {/* Arrow pointing towards the direction */}
            <polygon points="18,2 23,28 18,23 13,28" fill="#111" />
          </svg>
          <div style={{ fontSize: 12, fontFamily: FONT, color: '#333', marginTop: 2 }}>
            {windSpeed !== null && windSpeed !== undefined ? `${windSpeed}km/h` : '–'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Single day temperature cell ── */
function TempCell({
  dateLabel, tmin, tmax, condition,
}: { dateLabel: string; tmin: number | null; tmax: number | null; condition: string | null }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: '8px 16px', ...PRINT,
    }}>
      <div style={{ fontSize: 12, color: '#333', fontFamily: FONT, marginBottom: 4 }}>{dateLabel}</div>
      <div style={{ fontSize: 38, fontWeight: 700, color: '#1f4e9c', fontFamily: FONT, lineHeight: 1 }}>
        {tmin !== null ? `${tmin}°C` : '–'}
      </div>
      <WeatherIcon cond={condition} />
      <div style={{ fontSize: 38, fontWeight: 700, color: '#c00000', fontFamily: FONT, lineHeight: 1 }}>
        {tmax !== null ? `${tmax}°C` : '–'}
      </div>
    </div>
  );
}

/* ── Day row ── */
function DayRow({
  day, flip,
}: { day: Bulletin['donneesVilles'][number]; flip: boolean }) {
  const tempCell = (
    <div style={{
      flex: 1, background: '#d6e9f5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...PRINT,
    }}>
      <TempCell
        dateLabel={day.nom}
        tmin={day.tmin}
        tmax={day.tmax}
        condition={day.condition ?? null}
      />
    </div>
  );
  const mapCell = (
    <div style={{
      flex: 1, background: '#bdd8eb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...PRINT,
    }}>
      <BamakoMiniMap windDir={day.directionVent ?? null} windSpeed={day.vitesseVent ?? null} />
    </div>
  );
  return (
    <div style={{ display: 'flex', border: '1px solid #8ab4cc', minHeight: 220 }}>
      {flip ? <>{mapCell}{tempCell}</> : <>{tempCell}{mapCell}</>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════ */
export function Bamako72hPreview({ data }: { data: Bulletin }) {
  const base = import.meta.env.BASE_URL;
  const days = data.donneesVilles.slice(0, 3);

  return (
    <div id="bulletin-print-content" style={{
      background: 'white', color: '#000', fontFamily: FONT,
      width: '100%', minHeight: '297mm',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
    }}>
      {/* Header image */}
      <img src={`${base}assets/header-full.jpg`} alt="Mali-Météo" style={{ width: '100%', display: 'block' }} />
      {/* Blue bar */}
      <div style={{
        background: BLUE, color: 'white', padding: '7px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: FONT, fontSize: 15, ...PRINT,
      }}>
        <span>Bulletin météorologique du {data.periodLabel}</span>
        {data.validiteLabel && (
          <span style={{ fontStyle: 'italic' }}>Valide jusqu'à {data.validiteLabel}</span>
        )}
      </div>

      {/* Section title */}
      <div style={{ padding: '16px 28px 12px', fontFamily: FONT }}>
        <h2 style={{
          color: '#c86a1f', fontSize: 20, fontWeight: 700, margin: 0,
          fontFamily: FONT,
        }}>
          Prévisions pour les 3 jours suivants pour Bamako et environs
        </h2>
      </div>

      {/* 3-day rows */}
      <div style={{ padding: '0 28px', display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
        {days.map((day, i) => (
          <DayRow key={i} day={day} flip={i % 2 === 1} />
        ))}
        {/* Placeholder rows if < 3 days */}
        {days.length < 3 && Array.from({ length: 3 - days.length }).map((_, i) => (
          <div key={`empty-${i}`} style={{
            flex: 1, minHeight: 200, background: '#edf5fb',
            border: '1px dashed #8ab4cc', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#94a3b8', fontSize: 12,
          }}>Jour {days.length + i + 1} — données manquantes</div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div style={{
        background: BLUE, color: 'white', padding: '10px 20px',
        textAlign: 'center', fontSize: 13, lineHeight: 1.7,
        fontFamily: FONT, ...PRINT,
        marginTop: 16,
      }}>
        <p style={{ margin: 0 }}>
          <strong>Agence Nationale de la Météorologie</strong> (MALI-METEO) sise Zone Aéroportuaire de Bamako-Sénou
        </p>
        <p style={{ margin: 0 }}>
          BP : 237&nbsp;|&nbsp;Tél. (223) 20 20 62 04&nbsp;|&nbsp;Fax : (223) 20 20 21 10&nbsp;|&nbsp;
          <strong>malimeteo@malimeteo.ml</strong>
        </p>
      </div>
    </div>
  );
}
