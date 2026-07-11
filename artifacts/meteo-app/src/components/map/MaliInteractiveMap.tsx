import React, { useEffect, useRef, useCallback } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  CITIES,
  CONDITIONS,
  DIRECTIONS_VENT,
  VIGILANCE_NIVEAUX,
  getTempColor,
  getVigilanceColor,
} from '@/lib/constants';

// Fix Leaflet default icon paths broken by Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface VilleData {
  nom: string;
  tmax: number | null;
  tmin: number | null;
  condition: string | null;
  directionVent: string | null;
  vitesseVent: number | null;
}

export interface VigilanceData {
  region: string;
  niveau: string;
}

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
}

/* ─── Inner component that runs after MapContainer is ready ─── */
function MapContent({
  donneesVilles,
  vigilanceNiveaux,
  bulletinType,
  geoJson,
  selectedEntity,
  onSelect,
}: Props) {
  const map = useMap();
  const markersLayer = useRef<L.LayerGroup>(L.layerGroup());

  // Fit Mali bounds once
  useEffect(() => {
    map.fitBounds(
      [
        [10.0, -12.5],
        [25.2, 5.2],
      ],
      { padding: [10, 10] }
    );
    markersLayer.current.addTo(map);
  }, [map]);

  // ALL hooks must be called before any conditional return — define them first
  const getStyle = useCallback(
    (feature?: GeoJSON.Feature): L.PathOptions => {
      const name = feature?.properties?.name as string;
      if (bulletinType === 'journaux') {
        const v = vigilanceNiveaux.find((x) => x.region === name);
        const color = getVigilanceColor(v?.niveau ?? 'pas_vigilance');
        const isRegSel =
          selectedEntity?.type === 'region' && selectedEntity.name === name;
        return {
          fillColor: color,
          fillOpacity: 0.55,
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
    [donneesVilles, vigilanceNiveaux, bulletinType, selectedEntity]
  );

  const onEachFeature = useCallback(
    (feature: GeoJSON.Feature, layer: L.Layer) => {
      const name = feature?.properties?.name as string;
      layer.on('click', () => {
        if (bulletinType === 'journaux') {
          onSelect({ type: 'region', name });
        } else {
          onSelect({ type: 'city', name });
        }
      });
      (layer as L.Path).bindTooltip(name, {
        permanent: false,
        direction: 'center',
        className: 'leaflet-tooltip-region',
      });
    },
    [bulletinType, onSelect]
  );

  // Rebuild city markers whenever data / selection changes
  useEffect(() => {
    markersLayer.current.clearLayers();

    CITIES.forEach((city) => {
      const v = donneesVilles.find((d) => d.nom === city.name);
      const tmax = v?.tmax ?? null;
      const condition = v?.condition ?? null;
      const isSelected =
        selectedEntity?.type === 'city' && selectedEntity.name === city.name;

      const condIcon = CONDITIONS.find((c) => c.value === condition)?.icon ?? '';
      const bg = isSelected ? '#1d4ed8' : getTempColor(tmax);
      const border = isSelected ? '#1e3a8a' : 'rgba(255,255,255,0.9)';

      const icon = L.divIcon({
        className: '',
        iconSize: [40, 56],
        iconAnchor: [20, 20],
        html: `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="
              width:38px;height:38px;border-radius:50%;
              background:${bg};border:2.5px solid ${border};
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.35);
              transition:transform .15s;
              ${isSelected ? 'transform:scale(1.25);' : ''}
            ">
              <span style="color:white;font-weight:800;font-size:11px;line-height:1.1;">${tmax !== null ? tmax + '°' : '?'}</span>
              ${condIcon ? `<span style="font-size:9px;line-height:1;">${condIcon}</span>` : ''}
            </div>
            <div style="
              background:rgba(255,255,255,0.95);color:#1f2937;
              font-size:9px;font-weight:700;padding:1px 4px;
              border-radius:3px;margin-top:2px;white-space:nowrap;
              box-shadow:0 1px 3px rgba(0,0,0,0.2);
              ${isSelected ? 'background:#dbeafe;color:#1d4ed8;' : ''}
            ">${city.name}</div>
          </div>`,
      });

      const marker = L.marker([city.lat, city.lng], { icon });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelect({ type: 'city', name: city.name });
      });
      markersLayer.current.addLayer(marker);
    });
  }, [donneesVilles, selectedEntity, bulletinType, onSelect]);

  // Only render GeoJSON layer when data is ready
  if (!geoJson) return null;

  return (
    <GeoJSON
      key={JSON.stringify(vigilanceNiveaux) + bulletinType + JSON.stringify(donneesVilles.map((v) => v.tmax))}
      data={geoJson}
      style={getStyle}
      onEachFeature={onEachFeature}
    />
  );
}

/* ─── Public component ─── */
export function MaliInteractiveMap(props: Props) {
  return (
    <MapContainer
      center={[17, -3]}
      zoom={5}
      zoomControl={true}
      attributionControl={false}
      style={{ width: '100%', height: '100%', background: '#e8f0f7' }}
    >
      {/* No tile layer — clean political map look */}
      <MapContent {...props} />
    </MapContainer>
  );
}

/* ─── City Edit Panel ─── */
interface CityPanelProps {
  cityName: string;
  villeData: VilleData;
  bulletinType: string;
  onUpdate: (field: string, value: any) => void;
  onClose: () => void;
}

export function CityEditPanel({
  cityName,
  villeData,
  bulletinType,
  onUpdate,
  onClose,
}: CityPanelProps) {
  const showTmin = ['radio', 'national', 'journaux'].includes(bulletinType);

  return (
    <div className="border-t bg-white shadow-2xl flex flex-col" style={{ minHeight: 172 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: '#0d1f3c' }}
      >
        <span className="text-white font-bold text-base">{cityName}</span>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5 px-4 py-3 overflow-x-auto flex-1">
        {/* T.Max */}
        <div className="flex flex-col gap-1 min-w-[110px]">
          <span className="text-xs font-bold text-red-600 uppercase">T.Max °C</span>
          <div className="flex items-center gap-2">
            <input
              type="range" min={15} max={52}
              value={villeData.tmax ?? 30}
              onChange={(e) => onUpdate('tmax', Number(e.target.value))}
              className="w-20 accent-red-500"
            />
            <input
              type="number" min={15} max={52}
              value={villeData.tmax ?? ''}
              placeholder="–"
              onChange={(e) =>
                onUpdate('tmax', e.target.value !== '' ? Number(e.target.value) : null)
              }
              className="w-12 border rounded text-center font-bold text-red-600 text-sm p-1"
            />
          </div>
        </div>

        {/* T.Min */}
        {showTmin && (
          <div className="flex flex-col gap-1 min-w-[110px]">
            <span className="text-xs font-bold text-blue-600 uppercase">T.Min °C</span>
            <div className="flex items-center gap-2">
              <input
                type="range" min={5} max={35}
                value={villeData.tmin ?? 20}
                onChange={(e) => onUpdate('tmin', Number(e.target.value))}
                className="w-20 accent-blue-500"
              />
              <input
                type="number" min={5} max={35}
                value={villeData.tmin ?? ''}
                placeholder="–"
                onChange={(e) =>
                  onUpdate('tmin', e.target.value !== '' ? Number(e.target.value) : null)
                }
                className="w-12 border rounded text-center font-bold text-blue-600 text-sm p-1"
              />
            </div>
          </div>
        )}

        {/* Separator */}
        <div className="h-12 w-px bg-gray-200 shrink-0" />

        {/* Condition */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-gray-500">Condition</span>
          <div className="flex gap-1">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => onUpdate('condition', c.value)}
                className={`text-xl p-1.5 rounded transition-all ${
                  villeData.condition === c.value
                    ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                    : 'hover:bg-gray-100'
                }`}
              >
                {c.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Separator */}
        <div className="h-12 w-px bg-gray-200 shrink-0" />

        {/* Wind */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-gray-500">Direction vent</span>
          <div className="flex gap-1 flex-wrap max-w-[140px]">
            {DIRECTIONS_VENT.map((d) => (
              <button
                key={d}
                onClick={() => onUpdate('directionVent', d)}
                className={`text-xs px-2 py-0.5 border rounded font-mono transition-all ${
                  villeData.directionVent === d
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'hover:bg-gray-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-gray-500">Vitesse (km/h)</span>
          <input
            type="number" min={0} max={200}
            value={villeData.vitesseVent ?? ''}
            placeholder="–"
            onChange={(e) =>
              onUpdate('vitesseVent', e.target.value !== '' ? Number(e.target.value) : null)
            }
            className="w-20 border rounded text-center text-sm p-1"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Vigilance Edit Panel ─── */
interface VigilancePanelProps {
  regionName: string;
  niveau: string;
  onUpdate: (niveau: string) => void;
  onClose: () => void;
}

export function VigilanceEditPanel({
  regionName,
  niveau,
  onUpdate,
  onClose,
}: VigilancePanelProps) {
  return (
    <div className="border-t bg-white shadow-2xl flex flex-col" style={{ minHeight: 120 }}>
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ background: '#0d1f3c' }}
      >
        <span className="text-white font-bold">
          Vigilance — {regionName}
        </span>
        <button onClick={onClose} className="text-white/70 hover:text-white text-xl">
          ×
        </button>
      </div>
      <div className="flex items-center gap-3 px-4 py-4">
        {VIGILANCE_NIVEAUX.map((v) => (
          <button
            key={v.value}
            onClick={() => onUpdate(v.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
              niveau === v.value
                ? 'ring-2 ring-offset-2 ring-gray-400 scale-105'
                : 'opacity-70 hover:opacity-100'
            }`}
            style={{
              background: v.bg,
              borderColor: v.color,
              color: v.color,
            }}
          >
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: v.color }}
            />
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
