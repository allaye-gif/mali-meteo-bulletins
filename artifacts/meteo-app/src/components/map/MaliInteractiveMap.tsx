import React, { useEffect, useRef, useCallback } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  CITIES,
  CONDITIONS,
  VIGILANCE_NIVEAUX,
  getTempColor,
  getVigilanceColor,
} from '@/lib/constants';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface VilleData {
  nom: string;
  tmax: number | null;
  tmin: number | null;
  condition: string | null;
  directionVent: string | null;
  vitesseVent: number | null;
}
export interface VigilanceData { region: string; niveau: string; }
export type EditMode = 'temperature' | 'condition' | 'vent' | 'vigilance';
export type SelectedEntity =
  | { type: 'city'; name: string }
  | { type: 'region'; name: string }
  | null;

interface Props {
  donneesVilles: VilleData[];
  vigilanceNiveaux: VigilanceData[];
  bulletinType: string;
  geoJson: any;
  selectedEntity: SelectedEntity;
  onSelect: (entity: SelectedEntity) => void;
  editMode: EditMode;
  activeBrush: string | null;
  onPaintCity: (name: string) => void;
  onPaintRegion: (name: string) => void;
  onTempScroll?: (name: string, delta: number) => void;
}

/* ──────────────── MapContent ──────────────── */
function MapContent(props: Props) {
  const {
    donneesVilles, vigilanceNiveaux, bulletinType,
    geoJson, selectedEntity, onSelect,
    editMode, activeBrush,
    onPaintCity, onPaintRegion, onTempScroll,
  } = props;

  const map = useMap();
  const markersLayer = useRef<L.LayerGroup>(L.layerGroup());
  const isDragging = useRef(false);

  useEffect(() => {
    map.fitBounds([[10.0, -12.5], [25.2, 5.2]], { padding: [10, 10] });
    markersLayer.current.addTo(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Cursor per mode
  useEffect(() => {
    const container = map.getContainer();
    const cursors: Record<EditMode, string> = {
      temperature: 'crosshair',
      condition: 'cell',
      vent: 'crosshair',
      vigilance: 'cell',
    };
    container.style.cursor = cursors[editMode];
  }, [map, editMode]);

  // Track drag for vigilance paint-drag
  useEffect(() => {
    const container = map.getContainer();
    const down = () => { isDragging.current = true; };
    const up   = () => { isDragging.current = false; };
    container.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    return () => {
      container.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, [map]);

  const getStyle = useCallback(
    (feature?: GeoJSON.Feature): L.PathOptions => {
      const name = feature?.properties?.name as string;
      const isVigilanceView = bulletinType === 'journaux' || editMode === 'vigilance';
      if (isVigilanceView) {
        const v = vigilanceNiveaux.find((x) => x.region === name);
        const color = getVigilanceColor(v?.niveau ?? 'pas_vigilance');
        const isRegSel = selectedEntity?.type === 'region' && selectedEntity.name === name;
        return {
          fillColor: color,
          fillOpacity: editMode === 'vigilance' ? 0.75 : 0.55,
          color: isRegSel ? '#1d4ed8' : '#4b5563',
          weight: isRegSel ? 3 : 1.2,
        };
      }
      const v = donneesVilles.find((x) => x.nom === name);
      return {
        fillColor: getTempColor(v?.tmax ?? null),
        fillOpacity: 0.35,
        color: '#6b7280',
        weight: 1,
      };
    },
    [donneesVilles, vigilanceNiveaux, bulletinType, selectedEntity, editMode]
  );

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      const name = feature?.properties?.name as string;

      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (editMode === 'vigilance' && activeBrush) {
          onPaintRegion(name);
        } else if (bulletinType === 'journaux') {
          onSelect({ type: 'region', name });
        } else {
          onSelect({ type: 'city', name });
        }
      });

      layer.on('mousemove', () => {
        if (editMode === 'vigilance' && activeBrush && isDragging.current) {
          onPaintRegion(name);
        }
      });

      (layer as L.Path).bindTooltip(name, {
        permanent: false, direction: 'center',
        className: 'leaflet-tooltip-region',
      });
    },
    [bulletinType, onSelect, editMode, activeBrush, onPaintRegion]
  );

  // Build / rebuild city markers
  useEffect(() => {
    markersLayer.current.clearLayers();

    CITIES.forEach((city) => {
      const v = donneesVilles.find((d) => d.nom === city.name);
      const tmax = v?.tmax ?? null;
      const tmin = v?.tmin ?? null;
      const condition = v?.condition ?? null;
      const condEntry = CONDITIONS.find((c) => c.value === condition);
      const condIcon = condEntry?.icon ?? '';
      const isSelected = selectedEntity?.type === 'city' && selectedEntity.name === city.name;
      const bg = isSelected ? '#1d4ed8' : getTempColor(tmax);
      const border = isSelected ? '#1e3a8a' : 'rgba(255,255,255,0.85)';
      const scale = isSelected
        ? 'transform:scale(1.22);box-shadow:0 0 0 2px rgba(29,78,216,0.5),0 2px 6px rgba(0,0,0,0.3);z-index:999!important;'
        : 'box-shadow:0 1px 5px rgba(0,0,0,0.28);';

      let inner = '';
      if (editMode === 'condition') {
        inner = `<span style="font-size:14px;line-height:1;">${condIcon || '❓'}</span>`;
      } else if (editMode === 'vent') {
        const dir = v?.directionVent ?? '–';
        const spd = v?.vitesseVent ?? null;
        inner = `
          <span style="color:white;font-weight:800;font-size:8px;line-height:1.1;">${dir}</span>
          <span style="color:rgba(255,255,255,0.8);font-size:7px;">${spd !== null ? spd : '–'}</span>`;
      } else {
        inner = `<span style="color:white;font-weight:800;font-size:10px;line-height:1;">${tmax !== null ? tmax + '°' : '?'}</span>`;
        if (editMode === 'temperature' && tmin !== null) {
          inner += `<span style="color:#bfdbfe;font-size:7px;line-height:1;">${tmin}°</span>`;
        }
      }

      const icon = L.divIcon({
        className: '',
        iconSize: [26, 38],
        iconAnchor: [13, 13],
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="
              width:26px;height:26px;border-radius:50%;
              background:${bg};border:2px solid ${border};
              display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;
              cursor:pointer;transition:transform .12s;
              ${scale}
            ">${inner}</div>
            <div style="
              background:rgba(255,255,255,0.93);color:#1f2937;
              font-size:7.5px;font-weight:700;padding:1px 3px;border-radius:2px;
              margin-top:1px;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,0.18);
              ${isSelected ? 'background:#dbeafe;color:#1d4ed8;' : ''}
            ">${city.name}</div>
          </div>`,
      });

      const marker = L.marker([city.lat, city.lng], { icon });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (editMode === 'condition' && activeBrush) {
          onPaintCity(city.name);
        } else {
          onSelect({ type: 'city', name: city.name });
        }
      });

      // Scroll wheel → ±1°C in temperature mode
      marker.on('add', () => {
        const el = marker.getElement();
        if (!el) return;
        L.DomEvent.on(el, 'wheel', (e: Event) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          const we = e as WheelEvent;
          onTempScroll?.(city.name, we.deltaY < 0 ? 1 : -1);
        });
      });

      markersLayer.current.addLayer(marker);
    });
  }, [donneesVilles, selectedEntity, editMode, activeBrush, onSelect, onPaintCity, onTempScroll]);

  if (!geoJson) return null;

  return (
    <GeoJSON
      key={[
        JSON.stringify(vigilanceNiveaux),
        bulletinType, editMode, activeBrush ?? '',
        donneesVilles.map((v) => v.tmax).join(),
      ].join('|')}
      data={geoJson}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  );
}

/* ══════════════════════════════════════════════
   RESET / CENTER CONTROL
   ══════════════════════════════════════════════ */
function ResetControl() {
  const map = useMap();
  useEffect(() => {
    const MyControl = L.Control.extend({
      options: { position: 'bottomright' as const },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-control-zoom leaflet-bar leaflet-control') as HTMLDivElement;
        const link = L.DomUtil.create('a', '', container) as HTMLAnchorElement;
        link.innerHTML = '⌖';
        link.title = 'Recentrer la carte';
        link.href = '#';
        link.style.cssText = 'font-size:18px;line-height:30px;display:block;width:30px;height:30px;text-align:center;text-decoration:none;color:#333;';
        L.DomEvent.on(link, 'click', (e) => {
          L.DomEvent.stop(e as Event);
          map.fitBounds([[10.0, -12.5], [25.2, 5.2]], { padding: [10, 10] });
        });
        return container;
      },
    });
    const ctrl = new (MyControl as any)();
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  }, [map]);
  return null;
}

export function MaliInteractiveMap(props: Props) {
  return (
    <MapContainer
      center={[17, -3]} zoom={5}
      scrollWheelZoom={false}
      keyboard={false}
      zoomControl={true} attributionControl={false}
      style={{ width: '100%', height: '100%', background: '#e8f0f7' }}
    >
      <MapContent {...props} />
      <ResetControl />
    </MapContainer>
  );
}

/* ══════════════════════════════════════════════
   COMPASS ROSE
   ══════════════════════════════════════════════ */
const DIRS_8 = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;
const DIR_ANGLE: Record<string, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SO: 225, O: 270, NO: 315,
};

interface CompassProps {
  selected: string | null;
  onSelect: (dir: string) => void;
}

export function CompassRose({ selected, onSelect }: CompassProps) {
  const R = 70; const ri = 26; const size = R * 2 + 18;
  const cx = size / 2; const cy = size / 2;

  function wedge(angleDeg: number) {
    const half = 22;
    const r2d = (d: number) => (d * Math.PI) / 180;
    const a1 = r2d(angleDeg - half - 90);
    const a2 = r2d(angleDeg + half - 90);
    const pts = (rad: number) => ({
      x1: cx + rad * Math.cos(a1), y1: cy + rad * Math.sin(a1),
      x2: cx + rad * Math.cos(a2), y2: cy + rad * Math.sin(a2),
    });
    const o = pts(R); const i = pts(ri);
    return `M${i.x1},${i.y1} L${o.x1},${o.y1} A${R},${R},0,0,1,${o.x2},${o.y2} L${i.x2},${i.y2} A${ri},${ri},0,0,0,${i.x1},${i.y1}Z`;
  }

  function labelPos(angleDeg: number) {
    const mid = (R + ri) / 2;
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + mid * Math.cos(a), y: cy + mid * Math.sin(a) };
  }

  const arrowDir = selected ? DIR_ANGLE[selected] : null;

  return (
    <svg width={size} height={size} style={{ display: 'block', userSelect: 'none', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={R + 5} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
      {DIRS_8.map((dir) => {
        const angle = DIR_ANGLE[dir];
        const active = selected === dir;
        const cardinal = ['N', 'E', 'S', 'O'].includes(dir);
        const lp = labelPos(angle);
        return (
          <g key={dir} onClick={() => onSelect(dir)} style={{ cursor: 'pointer' }}>
            <path
              d={wedge(angle)}
              fill={active ? '#2e74b5' : cardinal ? '#dde8f5' : '#f8fafc'}
              stroke="#fff" strokeWidth="2"
              style={{ transition: 'fill .12s' }}
            />
            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
              fontSize={cardinal ? 11 : 9}
              fontWeight={active ? '800' : cardinal ? '700' : '600'}
              fill={active ? '#fff' : '#374151'}
              style={{ pointerEvents: 'none' }}
            >{dir}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={ri - 2} fill="white" stroke="#cbd5e1" strokeWidth="1.5" />
      {arrowDir !== null && (() => {
        const a = ((arrowDir - 90) * Math.PI) / 180;
        const tip = { x: cx + (ri - 7) * Math.cos(a), y: cy + (ri - 7) * Math.sin(a) };
        const perp = Math.PI / 2;
        return (
          <polygon
            points={`${tip.x},${tip.y} ${cx + 5 * Math.cos(a + perp)},${cy + 5 * Math.sin(a + perp)} ${cx + 5 * Math.cos(a - perp)},${cy + 5 * Math.sin(a - perp)}`}
            fill="#2e74b5" style={{ pointerEvents: 'none' }}
          />
        );
      })()}
    </svg>
  );
}

/* ══════════════════════════════════════════════
   REUSABLE STEPPER
   ══════════════════════════════════════════════ */
export function Stepper({
  label, value, min, max, color, onChange,
}: {
  label: string; value: number | null; min: number; max: number; color: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      {label && (
        <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <button
          onClick={() => onChange(Math.max(min, (value ?? Math.round((min + max) / 2)) - 1))}
          style={{
            width: 34, height: 34, borderRadius: 8, border: `2px solid ${color}`,
            background: 'white', color, fontSize: 20, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >−</button>
        <input
          type="number" min={min} max={max} value={value ?? ''}
          placeholder="–"
          onChange={(e) => onChange(e.target.value !== '' ? Number(e.target.value) : null)}
          style={{
            width: 54, height: 34, border: `2px solid ${color}`, borderRadius: 8,
            textAlign: 'center', fontSize: 20, fontWeight: 800, color, outline: 'none', background: 'white',
          }}
        />
        <button
          onClick={() => onChange(Math.min(max, (value ?? Math.round((min + max) / 2)) + 1))}
          style={{
            width: 34, height: 34, borderRadius: 8, border: `2px solid ${color}`,
            background: 'white', color, fontSize: 20, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >+</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PANEL HEADER (shared)
   ══════════════════════════════════════════════ */
function PanelHeader({
  icon, cityName, clipboard, onCopy, onPaste, onClose,
}: {
  icon: string; cityName: string;
  clipboard: VilleData | null;
  onCopy: () => void; onPaste: () => void; onClose: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px', background: '#0d1f3c',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{cityName}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <button onClick={onCopy} style={btnStyle('#fff3')}>📋 Copier</button>
        {clipboard && clipboard.nom !== cityName && (
          <button onClick={onPaste} style={btnStyle('#fff4')}>
            📌 Coller depuis <strong>{clipboard.nom}</strong>
          </button>
        )}
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.65)', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    fontSize: 11, padding: '3px 10px', borderRadius: 6,
    background: bg, color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600,
    whiteSpace: 'nowrap',
  };
}

/* ══════════════════════════════════════════════
   TEMPERATURE PANEL
   ══════════════════════════════════════════════ */
interface TempPanelProps {
  cityName: string; villeData: VilleData; showTmin: boolean;
  clipboard: VilleData | null;
  onUpdate: (field: string, value: any) => void;
  onCopy: () => void; onPaste: () => void; onClose: () => void;
}

export function TempPanel({ cityName, villeData, showTmin, clipboard, onUpdate, onCopy, onPaste, onClose }: TempPanelProps) {
  return (
    <div style={{ borderTop: '3px solid #dc2626', background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.13)' }}>
      <PanelHeader icon="🌡️" cityName={cityName} clipboard={clipboard} onCopy={onCopy} onPaste={onPaste} onClose={onClose} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '14px 24px' }}>
        <Stepper label="T.Max °C" value={villeData.tmax} min={15} max={52} color="#dc2626" onChange={(v) => onUpdate('tmax', v)} />
        {showTmin && (
          <>
            <div style={{ width: 1, height: 60, background: '#e5e7eb', flexShrink: 0 }} />
            <Stepper label="T.Min °C" value={villeData.tmin} min={5} max={35} color="#2563eb" onChange={(v) => onUpdate('tmin', v)} />
          </>
        )}
        <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.8, marginLeft: 8 }}>
          🖱️ Molette<br/>sur marqueur<br/>= ±1°C
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   WIND PANEL
   ══════════════════════════════════════════════ */
interface WindPanelProps {
  cityName: string; villeData: VilleData;
  clipboard: VilleData | null;
  onUpdate: (field: string, value: any) => void;
  onCopy: () => void; onPaste: () => void; onClose: () => void;
}

export function WindPanel({ cityName, villeData, clipboard, onUpdate, onCopy, onPaste, onClose }: WindPanelProps) {
  return (
    <div style={{ borderTop: '3px solid #0ea5e9', background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.13)' }}>
      <PanelHeader icon="💨" cityName={cityName} clipboard={clipboard} onCopy={onCopy} onPaste={onPaste} onClose={onClose} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 20px' }}>
        <CompassRose
          selected={villeData.directionVent}
          onSelect={(dir) => onUpdate('directionVent', dir)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Stepper label="Vitesse km/h" value={villeData.vitesseVent} min={0} max={150} color="#0ea5e9"
            onChange={(v) => onUpdate('vitesseVent', v)} />
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
            Direction : <strong style={{ fontSize: 17, color: '#0d1f3c' }}>{villeData.directionVent ?? '–'}</strong>
            {villeData.vitesseVent !== null && <span style={{ marginLeft: 8, color: '#6b7280' }}>{villeData.vitesseVent} km/h</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   VIGILANCE EDIT PANEL (legacy — kept for region click in non-paint mode)
   ══════════════════════════════════════════════ */
interface VigilancePanelProps {
  regionName: string; niveau: string;
  onUpdate: (niveau: string) => void; onClose: () => void;
}
export function VigilanceEditPanel({ regionName, niveau, onUpdate, onClose }: VigilancePanelProps) {
  return (
    <div style={{ borderTop: '3px solid #f59e0b', background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.13)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#0d1f3c' }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>🚨 Vigilance — {regionName}</span>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.65)', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', flexWrap: 'wrap' }}>
        {VIGILANCE_NIVEAUX.map((v) => (
          <button key={v.value} onClick={() => onUpdate(v.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 10, border: `2px solid ${v.color}`,
              background: niveau === v.value ? v.color : v.bg,
              color: niveau === v.value ? 'white' : v.color,
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              transform: niveau === v.value ? 'scale(1.06)' : 'scale(1)',
              transition: 'all .15s',
            }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: niveau === v.value ? 'white' : v.color, display: 'inline-block' }} />
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
