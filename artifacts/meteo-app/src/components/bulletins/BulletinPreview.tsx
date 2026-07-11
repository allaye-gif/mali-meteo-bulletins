import React from 'react';
import { Bulletin } from '@workspace/api-client-react';
import { CONDITIONS, VIGILANCE_NIVEAUX } from '@/lib/constants';

/* ══════════════════════════════════════════════════════════
   DESIGN TOKENS — exactly from the official bulletin format
   ══════════════════════════════════════════════════════════ */
const FONT = '"Segoe UI", "Liberation Sans", Arial, Helvetica, sans-serif';
const BLUE = '#2e74b5';          // info bar, section titles, borders, footer
const ORANGE_TITLE = '#c86a1f'; // temperature section heading
const CELL_VILLE = '#c9c9c9';   // grey: Ville header cell
const CELL_TMAX = '#d9a066';    // orange: Tmax row
const CELL_TMIN = '#dce6f1';    // light blue: Tmin row
const CELL_BORDER = '2px solid #ffffff';
const PRINT = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties;

interface Props { data: Bulletin; }

/* ─── Label per bulletin type ─── */
function getTypeLabel(type: string, dateStr: string, heure?: string | null): string {
  const h = heure ? ` A ${heure}` : '';
  const map: Record<string, string> = {
    radio:    `Bulletin radio du ${dateStr}${h}`,
    matinal:  `Bulletin matinal du ${dateStr}`,
    journaux: `Bulletin météo journaux du ${dateStr}`,
    ortm:     `Bulletin météo ORTM du ${dateStr}`,
    national: `Bulletin météo national du ${dateStr}`,
  };
  return map[type] ?? `Bulletin du ${dateStr}`;
}

/* ══════════════════════════════════════════════════════════
   HEADER — uses the real scanned header image
   ══════════════════════════════════════════════════════════ */
function Header({ data }: { data: Bulletin }) {
  const base = import.meta.env.BASE_URL;
  const typeLabel = getTypeLabel(data.type, data.periodLabel || '', data.heureLabel);
  const validite = data.validiteLabel || '';

  return (
    <>
      {/* Real scanned bulletin header */}
      <img
        src={`${base}assets/header-full.jpg`}
        alt="Mali-Météo"
        style={{ width: '100%', display: 'block' }}
        onError={(e) => {
          // Fallback to CSS header if image fails
          const el = e.currentTarget as HTMLImageElement;
          el.style.display = 'none';
          const fallback = el.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
      {/* CSS fallback header (hidden by default) */}
      <div style={{
        display: 'none',
        background: '#1a3a6b', alignItems: 'center', justifyContent: 'center',
        padding: '20px', gap: 16, fontFamily: FONT,
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
            MINISTÈRE DES TRANSPORTS &amp; DES INFRASTRUCTURES
          </div>
          <div style={{ fontSize: 10, opacity: 0.8, margin: '2px 0' }}>
            Agence Nationale de la Météorologie
          </div>
          <div style={{ color: '#c8a44a', fontSize: 28, fontWeight: 900, fontStyle: 'italic', letterSpacing: 3 }}>
            MALI-METEO
          </div>
        </div>
      </div>

      {/* Blue info bar */}
      <div style={{
        background: BLUE, color: 'white',
        padding: '7px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontFamily: FONT, fontSize: 15,
        ...PRINT,
      }}>
        <span>{typeLabel}</span>
        <span style={{ fontStyle: 'italic' }}>Valide jusqu'à {validite}</span>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   SITUATION GÉNÉRALE
   ══════════════════════════════════════════════════════════ */
function SituationGenerale({ s }: { s: Bulletin['situationGenerale'] }) {
  const items = [s.ciel, s.vents, s.visibilite, s.orages, s.temperatures].filter(Boolean);

  return (
    <div style={{ padding: '20px 30px 8px', fontFamily: FONT }}>
      <h2 style={{ color: BLUE, fontSize: 22, fontWeight: 700, marginBottom: 10, margin: '0 0 12px 0' }}>
        Situation générale
      </h2>
      <div style={{
        border: `2px solid ${BLUE}`, padding: '16px 20px',
        fontSize: 15, lineHeight: 1.9, color: '#000', textAlign: 'justify',
      }}>
        <p style={{ fontWeight: 700, marginBottom: 12 }}>Le temps sera marqué par :</p>
        {items.map((item, i) => (
          <p key={i} style={{ marginBottom: i < items.length - 1 ? 10 : 0 }}>
            •&nbsp;{item}
          </p>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TEMPERATURE TABLES
   ══════════════════════════════════════════════════════════ */
type CellData = { nom: string; tmax: number | null; tmin: number | null };

function TempTable({ data, showTmin }: { data: CellData[]; showTmin: boolean }) {
  const totalCols = 1 + data.length;
  // Each column = 1/7 of the full page width; table width proportional
  const colPct = 100 / 7;

  return (
    <table style={{
      width: `${(totalCols / 7) * 100}%`,
      tableLayout: 'fixed',
      borderCollapse: 'collapse',
      marginBottom: 12,
      fontSize: 15,
      fontFamily: FONT,
    }}>
      <colgroup>
        {Array.from({ length: totalCols }).map((_, i) => (
          <col key={i} style={{ width: `${colPct}%` }} />
        ))}
      </colgroup>
      <tbody>
        {/* Ville row */}
        <tr>
          <td style={{ background: CELL_VILLE, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', color: '#000', ...PRINT }}>
            Ville
          </td>
          {data.map((c, i) => (
            <td key={i} style={{ background: CELL_VILLE, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', color: '#000', ...PRINT }}>
              {c.nom}
            </td>
          ))}
        </tr>

        {/* Tmax row */}
        <tr>
          <td style={{ background: CELL_TMAX, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', color: '#000', ...PRINT }}>
            Tmax (°C)
          </td>
          {data.map((c, i) => (
            <td key={i} style={{ background: CELL_TMAX, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', color: '#000', ...PRINT }}>
              {c.tmax !== null ? c.tmax : '–'}
            </td>
          ))}
        </tr>

        {/* Tmin row (Radio / National / Journaux) */}
        {showTmin && (
          <tr>
            <td style={{ background: CELL_TMIN, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', color: '#000', ...PRINT }}>
              Tmin (°C)
            </td>
            {data.map((c, i) => (
              <td key={i} style={{ background: CELL_TMIN, border: CELL_BORDER, textAlign: 'center', padding: '10px 6px', color: '#000', ...PRINT }}>
                {c.tmin !== null ? c.tmin : '–'}
              </td>
            ))}
          </tr>
        )}
      </tbody>
    </table>
  );
}

function TempSection({
  villes,
  showTmin,
  title,
}: {
  villes: Bulletin['donneesVilles'];
  showTmin: boolean;
  title?: string;
}) {
  const groups: CellData[][] = [];
  for (let i = 0; i < villes.length; i += 6) {
    groups.push(villes.slice(i, i + 6).map((v) => ({ nom: v.nom, tmax: v.tmax, tmin: v.tmin })));
  }

  return (
    <div style={{ padding: '0 30px 20px', fontFamily: FONT }}>
      <h2 style={{ color: ORANGE_TITLE, fontSize: 22, fontWeight: 700, margin: '20px 0 16px 0' }}>
        {title ?? (showTmin
          ? 'Prévision des températures maximales et minimales de la journée'
          : 'Prévision des températures maximales de la journée')}
      </h2>
      {groups.map((group, i) => (
        <TempTable key={i} data={group} showTmin={showTmin} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   JOURNAUX: vigilance map + city grid + temperature tables
   ══════════════════════════════════════════════════════════ */
function JournauxSection({ data }: { data: Bulletin }) {
  const base = import.meta.env.BASE_URL;

  return (
    <div style={{ padding: '8px 30px', fontFamily: FONT }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 16 }}>
        {/* Left: vigilance map */}
        <div>
          <h3 style={{ color: BLUE, fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Carte de vigilance
          </h3>
          <img
            src={`${base}assets/mali-vigilance-map.png`}
            alt="Carte de vigilance"
            style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid #ccc' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{ marginTop: 8 }}>
            {VIGILANCE_NIVEAUX.map((v) => (
              <div key={v.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, marginBottom: 4 }}>
                <span style={{ width: 14, height: 14, background: v.color, display: 'inline-block', flexShrink: 0 }} />
                <span>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: city grid */}
        <div>
          <h3 style={{ color: BLUE, fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Prévisions par ville
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FONT }}>
            <tbody>
              {data.donneesVilles.map((v, i) => {
                const cond = CONDITIONS.find((c) => c.value === v.condition);
                const vigilance = data.vigilanceNiveaux?.find((x) => x.region === v.nom);
                const vigColor = VIGILANCE_NIVEAUX.find((x) => x.value === vigilance?.niveau)?.color ?? '#fff';
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '4px 8px', fontWeight: 600, fontSize: 12 }}>{v.nom}</td>
                    <td style={{ padding: '4px 4px', textAlign: 'center', fontSize: 14 }}>{cond?.icon ?? ''}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center', color: '#c86a1f', fontWeight: 700 }}>
                      {v.tmax !== null ? `${v.tmax}°` : '–'}
                    </td>
                    <td style={{ padding: '4px 6px', textAlign: 'center', color: '#1a5fa8', fontWeight: 700 }}>
                      {v.tmin !== null ? `${v.tmin}°` : '–'}
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, background: vigColor, borderRadius: 2 }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ORTM / NATIONAL: mali map with city overlays
   ══════════════════════════════════════════════════════════ */
const CITY_POSITIONS: Record<string, { top: string; left: string }> = {
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
    <div style={{ padding: '4px 30px 16px', fontFamily: FONT }}>
      <div style={{ position: 'relative', width: '85%', margin: '0 auto', aspectRatio: '4 / 3' }}>
        <img
          src={mapSrc}
          alt="Carte du Mali"
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        {data.donneesVilles.map((v) => {
          const pos = CITY_POSITIONS[v.nom];
          if (!pos) return null;
          const cond = CONDITIONS.find((c) => c.value === v.condition);
          return (
            <div
              key={v.nom}
              style={{
                position: 'absolute', top: pos.top, left: pos.left,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255,255,255,0.93)',
                border: '1px solid #999',
                borderRadius: 3,
                padding: '1px 5px',
                fontSize: 8.5, textAlign: 'center', lineHeight: 1.35,
                minWidth: 34,
                boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 8 }}>{v.nom}</div>
              {cond && <div style={{ fontSize: 10 }}>{cond.icon}</div>}
              <div style={{ color: '#c86a1f', fontWeight: 700 }}>{v.tmax !== null ? `${v.tmax}°` : '–'}</div>
              <div style={{ color: '#1a5fa8', fontWeight: 700 }}>{v.tmin !== null ? `${v.tmin}°` : '–'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <div style={{
      background: BLUE, color: 'white',
      padding: '10px 20px', textAlign: 'center',
      fontSize: 13, lineHeight: 1.7, fontFamily: FONT,
      ...PRINT,
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
   PAGE BREAK (National bulletin, between page 1 and 2)
   ══════════════════════════════════════════════════════════ */
function PageBreak() {
  return (
    <div style={{
      borderTop: '2px dashed #ccc', margin: '12px 0',
      textAlign: 'center', fontSize: 10, color: '#999', fontFamily: FONT,
    }}>
      ── Page 2 ──
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════ */
export function BulletinPreview({ data }: Props) {
  const base = import.meta.env.BASE_URL;

  return (
    <div style={{
      background: 'white', color: '#000',
      fontFamily: FONT,
      width: '100%',
      minHeight: '297mm',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
    }}>
      <Header data={data} />

      {/* ── Radio: SG + Tmax + Tmin ── */}
      {data.type === 'radio' && (
        <>
          <SituationGenerale s={data.situationGenerale} />
          <TempSection villes={data.donneesVilles} showTmin={true} />
        </>
      )}

      {/* ── Matinal: SG + Tmax only ── */}
      {data.type === 'matinal' && (
        <>
          <SituationGenerale s={data.situationGenerale} />
          <TempSection villes={data.donneesVilles} showTmin={false} />
        </>
      )}

      {/* ── Journaux: SG + vigilance + city grid + Tmax + Tmin ── */}
      {data.type === 'journaux' && (
        <>
          <SituationGenerale s={data.situationGenerale} />
          <JournauxSection data={data} />
          <TempSection
            villes={data.donneesVilles}
            showTmin={true}
            title="Prévision des températures maximales et minimales de la journée"
          />
        </>
      )}

      {/* ── ORTM: map with city overlays ── */}
      {data.type === 'ortm' && (
        <>
          <MapOverlay data={data} mapSrc={`${base}assets/mali-map-ortm.png`} />
        </>
      )}

      {/* ── National: page 1 (map) + page 2 (header + tables) ── */}
      {data.type === 'national' && (
        <>
          <SituationGenerale s={data.situationGenerale} />
          <MapOverlay data={data} mapSrc={`${base}assets/mali-map-national.png`} />
          <Footer />
          <PageBreak />
          <Header data={data} />
          <TempSection villes={data.donneesVilles} showTmin={true} />
        </>
      )}

      <div style={{ flex: 1 }} />
      <Footer />
    </div>
  );
}
