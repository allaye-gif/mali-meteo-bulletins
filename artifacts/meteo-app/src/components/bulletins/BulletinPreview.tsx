import React from 'react';
import { Bulletin } from '@workspace/api-client-react';
import { CONDITIONS, VIGILANCE_NIVEAUX } from '@/lib/constants';
import { MiniVigilanceMap } from './MiniVigilanceMap';

/* ══════════════════════════════════════════════════════════
   DESIGN TOKENS — from official MALI-METEO bulletin format
   ══════════════════════════════════════════════════════════ */
const FONT = '"Segoe UI", "Liberation Sans", Arial, Helvetica, sans-serif';
const BLUE = '#2e74b5';
const ORANGE_TITLE = '#c86a1f';
const CELL_VILLE = '#c9c9c9';
const CELL_TMAX = '#d9a066';
const CELL_TMIN = '#dce6f1';
const CELL_BORDER = '2px solid #ffffff';
const PRINT = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties;

const DIR_ROT: Record<string, number> = {
  N: 180, NE: 225, E: 270, SE: 315, S: 0, SO: 45, O: 90, NO: 135,
};

interface Props { data: Bulletin; }

/* ── condition → icon type ── */
function condToType(cond: string | null): 'soleil' | 'nuageux' | 'pluie' {
  if (!cond) return 'pluie';
  if (cond === 'ensoleille') return 'soleil';
  if (cond === 'partiellement_nuageux' || cond === 'nuageux' || cond === 'couvert') return 'nuageux';
  return 'pluie'; // pluvieux, orageux
}

/* ══════════════════════════════════════════════════════════
   SVG WEATHER ICONS (exact from Lovable reference)
   ══════════════════════════════════════════════════════════ */
function WeatherIcon({ cond }: { cond: string | null }) {
  const type = condToType(cond);

  if (type === 'soleil') {
    return (
      <svg width="52" height="42" viewBox="0 0 64 52" aria-hidden>
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
      <svg width="60" height="42" viewBox="0 0 70 52" aria-hidden>
        <ellipse cx="28" cy="20" rx="12" ry="10" fill="#f5c518" />
        <path d="M14 40 Q10 28 22 26 Q26 16 38 20 Q52 18 54 30 Q64 32 60 42 Q56 48 46 46 L20 46 Q10 46 14 40 Z"
          fill="#d0d0d0" stroke="#7a7a7a" strokeWidth="1.2" />
      </svg>
    );
  }

  // pluie / orage
  return (
    <svg width="60" height="48" viewBox="0 0 70 58" aria-hidden>
      <circle cx="22" cy="16" r="9" fill="#f5c518" />
      <path d="M10 38 Q6 26 18 24 Q22 14 34 18 Q48 16 50 28 Q60 30 56 40 Q52 46 42 44 L16 44 Q6 44 10 38 Z"
        fill="#bcbcbc" stroke="#666" strokeWidth="1" />
      <path d="M22 46 L18 54" stroke="#4aa3ff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M40 46 L36 54" stroke="#4aa3ff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M31 44 L27 52 L31 52 L28 58" fill="none" stroke="#f5b400" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════
   WIND ARROW (exact from Lovable reference)
   ══════════════════════════════════════════════════════════ */
function WindArrow({ dir }: { dir: string | null }) {
  const rot = DIR_ROT[dir ?? 'S'] ?? 0;
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 46, height: 46 }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1.5px solid #333' }} />
      <svg width="34" height="34" viewBox="0 0 34 34" style={{ transform: `rotate(${rot}deg)` }}>
        <polygon points="17,3 27,27 17,22 7,27" fill="#111" />
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HEADER — real scanned header image + blue info bar
   ══════════════════════════════════════════════════════════ */
function Header({ data }: { data: Bulletin }) {
  const base = import.meta.env.BASE_URL;

  const labels: Record<string, string> = {
    radio:    `Bulletin radio du ${data.periodLabel}${data.heureLabel ? ` A ${data.heureLabel}` : ''}`,
    matinal:  `Bulletin matinal du ${data.periodLabel}`,
    journaux: `Bulletin météorologique du ${data.periodLabel}`,
    ortm:     `Bulletin météo ORTM du ${data.periodLabel}`,
    national: `Bulletin météo national du ${data.periodLabel}`,
  };
  const leftText = labels[data.type] ?? `Bulletin du ${data.periodLabel}`;
  const validite = data.validiteLabel;
  const showValidity = data.type !== 'journaux';

  return (
    <>
      <img src={`${base}assets/header-full.jpg`} alt="Mali-Météo" style={{ width: '100%', display: 'block' }} />
      <div style={{
        background: BLUE, color: 'white', padding: '7px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: FONT, fontSize: 15, ...PRINT,
      }}>
        <span>{leftText}</span>
        {showValidity && validite && (
          <span style={{ fontStyle: 'italic' }}>Valide jusqu'à {validite}</span>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <div style={{
      background: BLUE, color: 'white', padding: '10px 20px',
      textAlign: 'center', fontSize: 13, lineHeight: 1.7,
      fontFamily: FONT, ...PRINT,
    }}>
      <p style={{ margin: 0 }}>
        <strong>Agence Nationale de la Météorologie</strong> (MALI-METEO) sise Zone Aéroportuaire de Bamako-Sénou
      </p>
      <p style={{ margin: 0 }}>
        BP : 237&nbsp;|&nbsp;Tél. (223) 20 20 62 04&nbsp;|&nbsp;Fax : (223) 20 20 21 10&nbsp;|&nbsp;
        <strong>malimeteo@malimeteo.ml</strong>
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SITUATION GÉNÉRALE
   ══════════════════════════════════════════════════════════ */
function SituationGenerale({ s, italic = false }: { s: Bulletin['situationGenerale']; italic?: boolean }) {
  const items = [s.ciel, s.vents, s.visibilite, s.orages, s.temperatures].filter(Boolean);
  return (
    <div>
      <h2 style={{ color: BLUE, fontSize: 22, fontWeight: 700, margin: '0 0 10px 0', fontFamily: FONT }}>
        Situation générale
      </h2>
      <div style={{
        border: `1.5px solid ${BLUE}`, padding: '14px 18px',
        fontSize: 13.5, lineHeight: 1.75, color: '#000', textAlign: 'justify',
        fontStyle: italic ? 'italic' : 'normal', fontFamily: FONT,
      }}>
        <p style={{ fontWeight: 700, fontStyle: 'normal', marginBottom: 8 }}>Le temps sera marqué par :</p>
        {items.map((item, i) => (
          <p key={i} style={{ marginBottom: i < items.length - 1 ? 8 : 0 }}>•&nbsp;{item}</p>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TEMPERATURE TABLES (Radio / Matinal / National)
   ══════════════════════════════════════════════════════════ */
type CellData = { nom: string; tmax: number | null; tmin: number | null };

function TempTable({ data, showTmin }: { data: CellData[]; showTmin: boolean }) {
  const totalCols = 1 + data.length;
  const colPct = 100 / 7;
  return (
    <table style={{
      width: `${(totalCols / 7) * 100}%`, tableLayout: 'fixed',
      borderCollapse: 'collapse', marginBottom: 12,
      fontSize: 15, fontFamily: FONT,
    }}>
      <colgroup>
        {Array.from({ length: totalCols }).map((_, i) => (
          <col key={i} style={{ width: `${colPct}%` }} />
        ))}
      </colgroup>
      <tbody>
        <tr>
          <td style={{ background: CELL_VILLE, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', ...PRINT }}>Ville</td>
          {data.map((c, i) => (
            <td key={i} style={{ background: CELL_VILLE, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', ...PRINT }}>{c.nom}</td>
          ))}
        </tr>
        <tr>
          <td style={{ background: CELL_TMAX, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', ...PRINT }}>Tmax (°C)</td>
          {data.map((c, i) => (
            <td key={i} style={{ background: CELL_TMAX, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', ...PRINT }}>
              {c.tmax !== null ? c.tmax : '–'}
            </td>
          ))}
        </tr>
        {showTmin && (
          <tr>
            <td style={{ background: CELL_TMIN, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', ...PRINT }}>Tmin (°C)</td>
            {data.map((c, i) => (
              <td key={i} style={{ background: CELL_TMIN, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', ...PRINT }}>
                {c.tmin !== null ? c.tmin : '–'}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
}

function TempSection({ villes, showTmin, title }: {
  villes: Bulletin['donneesVilles']; showTmin: boolean; title?: string;
}) {
  const groups: CellData[][] = [];
  for (let i = 0; i < villes.length; i += 6) {
    groups.push(villes.slice(i, i + 6).map((v) => ({ nom: v.nom, tmax: v.tmax, tmin: v.tmin })));
  }
  return (
    <div style={{ padding: '0 28px 20px', fontFamily: FONT }}>
      <h2 style={{ color: ORANGE_TITLE, fontSize: 22, fontWeight: 700, margin: '18px 0 14px 0' }}>
        {title ?? (showTmin
          ? 'Prévision des températures maximales et minimales de la journée'
          : 'Prévision des températures maximales de la journée')}
      </h2>
      {groups.map((group, i) => <TempTable key={i} data={group} showTmin={showTmin} />)}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   JOURNAUX — city row
   ══════════════════════════════════════════════════════════ */
type VilleRow = Bulletin['donneesVilles'][number];

function CityRow({ v, zebra }: { v: VilleRow; zebra: boolean }) {
  return (
    <div className="city-row" style={{
      display: 'grid',
      gridTemplateColumns: '28% 20% 17% 15% 20%',
      alignItems: 'center',
      padding: '4px 6px',
      background: zebra ? '#e8f1fb' : '#ffffff',
      borderBottom: '1px solid #cfd8dc',
      minHeight: 56,
      fontFamily: FONT,
      ...PRINT,
    }}>
      {/* Ville */}
      <div style={{ fontSize: 12, color: '#000', fontWeight: 500, lineHeight: 1.2, wordBreak: 'break-word' }}>{v.nom}</div>

      {/* Weather icon */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <WeatherIcon cond={v.condition} />
      </div>

      {/* Tmax / Tmin */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: '#c00000' }}>{v.tmax !== null ? v.tmax : '–'}</span>
          <span style={{ fontSize: 17, fontWeight: 600, color: '#1f4e9c' }}>{v.tmin !== null ? v.tmin : '–'}</span>
        </div>
        <span style={{ fontSize: 9, color: '#000' }}>°C</span>
      </div>

      {/* Wind arrow */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <WindArrow dir={v.directionVent} />
      </div>

      {/* Direction + speed — explicit overflow guard */}
      <div style={{ fontSize: 11.5, color: '#000', lineHeight: 1.4, overflowWrap: 'break-word', wordBreak: 'break-all' }}>
        <div style={{ fontWeight: 600 }}>{v.directionVent ?? '–'}</div>
        <div style={{ color: '#444' }}>{v.vitesseVent !== null ? `${v.vitesseVent}km/h` : '–'}</div>
      </div>
    </div>
  );
}

function CityColumn({ items }: { items: VilleRow[] }) {
  return (
    <div style={{ border: `1.5px solid ${BLUE}` }}>
      {items.map((v, i) => <CityRow key={v.nom} v={v} zebra={i % 2 === 0} />)}
    </div>
  );
}

function BamakoCard({ v }: { v: VilleRow }) {
  return (
    <div style={{
      border: `1.5px solid ${BLUE}`, padding: 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      fontFamily: FONT,
    }}>
      <div style={{ fontSize: 15, color: '#000', alignSelf: 'flex-start' }}>{v.nom}</div>
      <WeatherIcon cond={v.condition} />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
          <span style={{ fontSize: 22, fontWeight: 600, color: '#c00000' }}>{v.tmax !== null ? v.tmax : '–'}</span>
          <span style={{ fontSize: 20, fontWeight: 600, color: '#1f4e9c' }}>{v.tmin !== null ? v.tmin : '–'}</span>
        </div>
        <span style={{ fontSize: 11, color: '#000' }}>°C</span>
      </div>
      <WindArrow dir={v.directionVent} />
      <div style={{ fontSize: 13, color: '#000', textAlign: 'center', lineHeight: 1.35 }}>
        <div>{v.directionVent ?? '–'}</div>
        <div>{v.vitesseVent !== null ? `${v.vitesseVent}km/h` : '–'}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   JOURNAUX BULLETIN
   ══════════════════════════════════════════════════════════ */
function JournauxBulletin({ data }: { data: Bulletin }) {
  const base = import.meta.env.BASE_URL;
  const villes = data.donneesVilles;
  const leftCol = villes.slice(0, 10);   // Kayes → Taoudéni
  const rightCol = villes.slice(10, 19); // Bougouni → Bandiagara
  const bamako = villes[19] ?? villes[villes.length - 1];

  return (
    <div style={{ padding: '20px 24px', fontFamily: FONT }}>
      {/* Top 2-col: SG + vigilance map */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Left: Situation générale (italic) */}
        <SituationGenerale s={data.situationGenerale} italic />

        {/* Right: Vigilance map (dynamic SVG) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ color: BLUE, fontSize: 20, fontWeight: 700, textAlign: 'center', margin: '0 0 8px 0', fontFamily: FONT }}>
            Vigilance sur le pays dans les prochaines 24h
          </h2>
          <MiniVigilanceMap
            vigilanceData={data.vigilanceNiveaux ?? []}
            width={300}
          />
          {/* Legend */}
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'flex-start', width: '100%' }}>
            {VIGILANCE_NIVEAUX.slice().reverse().map((v) => (
              <div key={v.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#000', fontFamily: FONT }}>
                <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: v.color, flexShrink: 0, border: '1px solid rgba(0,0,0,0.15)' }} />
                {v.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* City forecast section */}
      <h2 style={{ color: BLUE, fontSize: 22, fontWeight: 700, margin: '0 0 12px 0', fontFamily: FONT }}>
        Prévision pour les villes
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.55fr', gap: 16 }}>
        <CityColumn items={leftCol} />
        <CityColumn items={rightCol} />
        <BamakoCard v={bamako} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ORTM / NATIONAL — map with city overlay labels
   ══════════════════════════════════════════════════════════ */
const CITY_POS: Record<string, { top: string; left: string }> = {
  'Kayes':      { top: '65%', left: '12%' },
  'Koulikoro':  { top: '73%', left: '27%' },
  'Sikasso':    { top: '87%', left: '31%' },
  'Ségou':      { top: '70%', left: '38%' },
  'Mopti':      { top: '63%', left: '47%' },
  'Tombouctou': { top: '39%', left: '43%' },
  'Gao':        { top: '44%', left: '67%' },
  'Ménaka':     { top: '51%', left: '82%' },
  'Kidal':      { top: '27%', left: '77%' },
  'Taoudéni':   { top: '11%', left: '37%' },
  'Bougouni':   { top: '85%', left: '29%' },
  'Koutiala':   { top: '80%', left: '38%' },
  'Dioïla':     { top: '75%', left: '32%' },
  'Nioro':      { top: '57%', left: '17%' },
  'Nara':       { top: '59%', left: '30%' },
  'Kita':       { top: '72%', left: '18%' },
  'San':        { top: '69%', left: '44%' },
  'Douentza':   { top: '56%', left: '54%' },
  'Bandiagara': { top: '62%', left: '47%' },
  'Bamako':     { top: '76%', left: '24%' },
};

function MapOverlay({ data, mapSrc }: { data: Bulletin; mapSrc: string }) {
  return (
    <div style={{ padding: '4px 28px 16px', fontFamily: FONT }}>
      <div style={{ position: 'relative', width: '85%', margin: '0 auto', aspectRatio: '4 / 3' }}>
        <img
          src={mapSrc} alt="Carte du Mali"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        {data.donneesVilles.map((v) => {
          const pos = CITY_POS[v.nom];
          if (!pos) return null;
          const cond = CONDITIONS.find((c) => c.value === v.condition);
          return (
            <div key={v.nom} style={{
              position: 'absolute', top: pos.top, left: pos.left,
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255,255,255,0.93)',
              border: '1px solid #999', borderRadius: 3,
              padding: '1px 5px', fontSize: 8.5, textAlign: 'center',
              lineHeight: 1.35, minWidth: 34,
              boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
            }}>
              <div style={{ fontWeight: 700, fontSize: 8 }}>{v.nom}</div>
              {cond && <div style={{ fontSize: 10 }}>{cond.icon}</div>}
              <div style={{ color: '#c00000', fontWeight: 700 }}>{v.tmax !== null ? `${v.tmax}°` : '–'}</div>
              <div style={{ color: '#1f4e9c', fontWeight: 700 }}>{v.tmin !== null ? `${v.tmin}°` : '–'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE BREAK
   ══════════════════════════════════════════════════════════ */
function PageBreak() {
  return (
    <div style={{
      borderTop: '2px dashed #ccc', margin: '12px 0',
      textAlign: 'center', fontSize: 10, color: '#999', fontFamily: FONT,
    }}>── Page 2 ──</div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════ */
export function BulletinPreview({ data }: Props) {
  const base = import.meta.env.BASE_URL;

  return (
    <div style={{
      background: 'white', color: '#000', fontFamily: FONT,
      width: '100%', minHeight: '297mm',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
    }}>
      <Header data={data} />

      {/* ── Radio: SG + Tmax + Tmin ── */}
      {data.type === 'radio' && (
        <div style={{ padding: '20px 28px 0', fontFamily: FONT }}>
          <SituationGenerale s={data.situationGenerale} />
        </div>
      )}
      {data.type === 'radio' && (
        <TempSection villes={data.donneesVilles} showTmin={true} />
      )}

      {/* ── Matinal: SG + Tmax only ── */}
      {data.type === 'matinal' && (
        <div style={{ padding: '20px 28px 0', fontFamily: FONT }}>
          <SituationGenerale s={data.situationGenerale} />
        </div>
      )}
      {data.type === 'matinal' && (
        <TempSection villes={data.donneesVilles} showTmin={false} />
      )}

      {/* ── Journaux: 2-col SG+map + city grid ── */}
      {data.type === 'journaux' && <JournauxBulletin data={data} />}

      {/* ── ORTM: map overlay only ── */}
      {data.type === 'ortm' && (
        <MapOverlay data={data} mapSrc={`${base}assets/mali-map-ortm.png`} />
      )}

      {/* ── National: SG + map p1 → footer → break → p2 tables ── */}
      {data.type === 'national' && (
        <>
          <div style={{ padding: '20px 28px 0', fontFamily: FONT }}>
            <SituationGenerale s={data.situationGenerale} />
          </div>
          <MapOverlay data={data} mapSrc={`${base}assets/mali-map-national.png`} />
          <Footer />
          <PageBreak />
          <Header data={data} />
          <TempSection
            villes={data.donneesVilles}
            showTmin={true}
            title="Prévision des températures maximales et minimales de la journée"
          />
        </>
      )}

      <div style={{ flex: 1 }} />
      <Footer />
    </div>
  );
}
