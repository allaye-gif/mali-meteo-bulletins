import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  useGetBulletin,
  useUpdateBulletin,
  useListTemplates,
  useListBulletins,
  getGetBulletinQueryKey,
  Bulletin,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft, Printer, RefreshCw, Loader2, Undo2, Redo2, Map, AlertTriangle, FileText,
} from 'lucide-react';
import { printBulletin } from '@/lib/print';
import { BulletinPreview } from '@/components/bulletins/BulletinPreview';
import {
  MaliInteractiveMap,
  TempPanel, WindPanel,
  SelectedEntity, VilleData, VigilanceData, EditMode,
} from '@/components/map/MaliInteractiveMap';
import {
  CITIES, CONDITIONS, VIGILANCE_NIVEAUX, VIGILANCE_TYPES,
  getInitialVilleData, getInitialVigilanceData,
} from '@/lib/constants';
import { fetchMaliWeather } from '@/lib/weather-api';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

/* ─── History snapshot ─── */
interface Snapshot { villes: VilleData[]; vigilance: VigilanceData[]; }
const MAX_HISTORY = 40;

/* ─── Bulletin type config ─── */
const BULLETIN_TYPES = [
  { value: 'radio',    label: 'Radio',    emoji: '📻' },
  { value: 'matinal',  label: 'Matinal',  emoji: '🌅' },
  { value: 'journaux', label: 'Journaux', emoji: '📰' },
  { value: 'ortm',     label: 'ORTM',     emoji: '📺' },
  { value: 'national', label: 'National', emoji: '🗺️' },
];

/* ─── Studio tabs ─── */
type StudioTab = 'carte' | 'vigilance' | 'textes';
type CarteMode = 'temperature' | 'condition' | 'vent';

/* ══════════════════════════════════════════════
   TEMPLATE SELECTOR
   ══════════════════════════════════════════════ */
function TemplateSelector({ categorie, onSelect }: { categorie: string; onSelect: (t: string) => void }) {
  const { data: templates } = useListTemplates({ categorie });
  if (!templates?.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 text-xs px-2">Modèles ▾</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-72 overflow-y-auto">
        {templates.map((t) => (
          <DropdownMenuItem key={t.id} className="flex flex-col items-start py-2 cursor-pointer" onClick={() => onSelect(t.texte)}>
            <span className="font-semibold text-xs">{t.nom}</span>
            <span className="text-xs text-muted-foreground line-clamp-2 whitespace-normal">{t.texte}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ══════════════════════════════════════════════
   STUDIO TAB BAR
   ══════════════════════════════════════════════ */
function StudioTabBar({ active, onChange, canUndo, canRedo, onUndo, onRedo }: {
  active: StudioTab; onChange: (t: StudioTab) => void;
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void;
}) {
  const tabs: { id: StudioTab; icon: React.ReactNode; label: string; color: string }[] = [
    { id: 'carte',      icon: <Map size={13} />,           label: 'Carte météo',    color: '#2563eb' },
    { id: 'vigilance',  icon: <AlertTriangle size={13} />, label: 'Vigilance',      color: '#d97706' },
    { id: 'textes',     icon: <FileText size={13} />,      label: 'Situation générale', color: '#7c3aed' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0, paddingLeft: 8, paddingRight: 8 }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px',
              border: 'none', borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
              background: 'none', cursor: 'pointer',
              color: isActive ? tab.color : '#64748b',
              fontWeight: isActive ? 700 : 500, fontSize: 12,
              transition: 'all .12s',
              marginBottom: -1,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button onClick={onUndo} disabled={!canUndo} title="Annuler (Ctrl+Z)"
        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: canUndo ? 'white' : '#f9fafb', color: canUndo ? '#374151' : '#d1d5db', fontSize: 11, cursor: canUndo ? 'pointer' : 'default', margin: '0 2px' }}>
        <Undo2 size={11} /> Annuler
      </button>
      <button onClick={onRedo} disabled={!canRedo} title="Rétablir (Ctrl+Y)"
        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: canRedo ? 'white' : '#f9fafb', color: canRedo ? '#374151' : '#d1d5db', fontSize: 11, cursor: canRedo ? 'pointer' : 'default' }}>
        <Redo2 size={11} /> Rétablir
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CARTE TAB — mode bar + context bar
   ══════════════════════════════════════════════ */
const CARTE_MODES: { mode: CarteMode; icon: string; label: string; color: string }[] = [
  { mode: 'temperature', icon: '🌡️', label: 'Températures', color: '#dc2626' },
  { mode: 'condition',   icon: '☁️',  label: 'Nébulosité',  color: '#8b5cf6' },
  { mode: 'vent',        icon: '💨',  label: 'Vent',        color: '#0ea5e9' },
];

function CarteModeBar({ active, onChange }: { active: CarteMode; onChange: (m: CarteMode) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>Mode</span>
      {CARTE_MODES.map(({ mode, icon, label, color }) => {
        const isActive = active === mode;
        return (
          <button key={mode} onClick={() => onChange(mode)} title={label}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              borderRadius: 7, background: isActive ? color : 'white',
              border: `1.5px solid ${isActive ? color : '#e2e8f0'}`,
              color: isActive ? 'white' : '#374151', fontWeight: isActive ? 700 : 500,
              fontSize: 11, cursor: 'pointer', transition: 'all .12s',
              boxShadow: isActive ? `0 2px 8px ${color}44` : 'none',
            }}>
            <span style={{ fontSize: 13 }}>{icon}</span> {label}
          </button>
        );
      })}
    </div>
  );
}

function CarteContextBar({ mode, activeBrush, setActiveBrush, onApplyAll }: {
  mode: CarteMode; activeBrush: string | null; setActiveBrush: (b: string | null) => void; onApplyAll: () => void;
}) {
  if (mode === 'condition') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: '#faf5ff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 1 }}>☁️ Pinceau</span>
        {CONDITIONS.map((c) => {
          const active = activeBrush === c.value;
          return (
            <button key={c.value} onClick={() => setActiveBrush(active ? null : c.value)} title={c.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 6px', borderRadius: 7,
                border: `2px solid ${active ? '#8b5cf6' : '#e2e8f0'}`, background: active ? '#f3e8ff' : 'white',
                cursor: 'pointer', gap: 1, transform: active ? 'scale(1.08)' : 'scale(1)', transition: 'all .12s',
              }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <span style={{ fontSize: 8, fontWeight: active ? 800 : 500, color: active ? '#7c3aed' : '#6b7280' }}>{c.label}</span>
            </button>
          );
        })}
        {activeBrush && (
          <button onClick={onApplyAll} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#8b5cf6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, marginLeft: 'auto' }}>
            Appliquer à toutes les villes
          </button>
        )}
        {!activeBrush && <span style={{ fontSize: 10, color: '#94a3b8' }}>← Choisissez un état, puis cliquez les villes</span>}
      </div>
    );
  }
  if (mode === 'temperature') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: '#fff5f5', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 1 }}>🌡️ Températures</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Cliquez un marqueur · Molette = ±1°C</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
          {[['<25°','#3b82f6'],['25–30°','#10b981'],['30–35°','#f59e0b'],['35–40°','#f97316'],['>40°','#ef4444']].map(([l,c]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 9, color: '#374151' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (mode === 'vent') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: '#f0f9ff', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1 }}>💨 Vent</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>Cliquez un marqueur → rose des vents + vitesse</span>
      </div>
    );
  }
  return null;
}

/* ══════════════════════════════════════════════
   REGION TABLE (Vigilance tab sidebar)
   ══════════════════════════════════════════════ */
function RegionTable({ vigilanceNiveaux, onUpdate }: {
  vigilanceNiveaux: any[];
  onUpdate: (region: string, patch: { type?: string; niveau?: string }) => void;
}) {
  return (
    <div style={{ width: 240, flexShrink: 0, borderLeft: '1px solid #e2e8f0', background: '#fafafa', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '5px 8px', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        Régions — vigilance individuelle
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {(vigilanceNiveaux ?? []).map((v: any) => {
          const niveauInfo = VIGILANCE_NIVEAUX.find((n) => n.value === v.niveau);
          return (
            <div key={v.region} style={{
              padding: '7px 8px', borderBottom: '1px solid #f1f5f9',
              borderLeft: `3px solid ${niveauInfo?.color ?? '#2fb84a'}`,
            }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: '#1f2937', marginBottom: 4 }}>{v.region}</div>
              {/* Type dropdown */}
              <select
                value={v.type ?? 'aucun'}
                onChange={(e) => onUpdate(v.region, { type: e.target.value })}
                style={{ fontSize: 10, padding: '2px 4px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', width: '100%', marginBottom: 5 }}
              >
                {VIGILANCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
              {/* Level dots */}
              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                {VIGILANCE_NIVEAUX.map((n) => (
                  <button key={n.value} onClick={() => onUpdate(v.region, { niveau: n.value })} title={n.label}
                    style={{
                      width: 16, height: 16, borderRadius: '50%', background: n.color,
                      border: v.niveau === n.value ? '2px solid #1d4ed8' : '1.5px solid rgba(0,0,0,0.25)',
                      cursor: 'pointer', padding: 0, transition: 'transform .1s',
                      transform: v.niveau === n.value ? 'scale(1.25)' : 'scale(1)',
                    }}
                  />
                ))}
                <span style={{ fontSize: 9, color: '#94a3b8', marginLeft: 2 }}>{niveauInfo?.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   VIGILANCE CONTEXT BAR (type + level brush)
   ══════════════════════════════════════════════ */
function VigilanceContextBar({ activeBrush, brushType, setBrushType, brushNiveau, setBrushNiveau, onApplyAll }: {
  activeBrush: string | null;
  brushType: string | null; setBrushType: (t: string | null) => void;
  brushNiveau: string | null; setBrushNiveau: (n: string | null) => void;
  onApplyAll: () => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#fffbeb', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
      {/* Row 1 — Phenomenon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', flexWrap: 'wrap', borderBottom: '1px solid #fde68a' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1, minWidth: 70 }}>① Phénomène</span>
        {VIGILANCE_TYPES.filter((t) => t.value !== 'aucun').map((t) => {
          const active = brushType === t.value;
          return (
            <button key={t.value} onClick={() => setBrushType(active ? null : t.value)} title={t.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 6px', borderRadius: 6,
                border: `2px solid ${active ? '#b45309' : '#fde68a'}`, background: active ? '#fef3c7' : 'white',
                cursor: 'pointer', gap: 1, boxShadow: active ? '0 0 0 2px #b4530966' : 'none', transition: 'all .1s',
              }}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <span style={{ fontSize: 7.5, fontWeight: active ? 800 : 500, color: active ? '#92400e' : '#6b7280', whiteSpace: 'nowrap' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
      {/* Row 2 — Level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: 1, minWidth: 70 }}>② Niveau</span>
        {VIGILANCE_NIVEAUX.map((v) => {
          const active = brushNiveau === v.value;
          return (
            <button key={v.value} onClick={() => setBrushNiveau(active ? null : v.value)} title={v.label}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 7,
                border: `2px solid ${v.color}`, background: active ? v.color : v.bg,
                color: active ? 'white' : v.color, fontWeight: active ? 800 : 600, fontSize: 10,
                cursor: 'pointer', transform: active ? 'scale(1.05)' : 'scale(1)', transition: 'all .1s',
              }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? 'white' : v.color, display: 'inline-block', flexShrink: 0 }} />
              {v.label}
            </button>
          );
        })}
        {activeBrush && (
          <>
            <div style={{ width: 1, height: 24, background: '#fde68a', marginLeft: 4 }} />
            <span style={{ fontSize: 10, color: '#92400e', fontWeight: 600 }}>
              {VIGILANCE_TYPES.find((t) => t.value === brushType)?.icon} + {VIGILANCE_NIVEAUX.find((n) => n.value === brushNiveau)?.label} → cliquez / glissez
            </span>
            <button onClick={onApplyAll}
              style={{ marginLeft: 'auto', fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              Toutes les régions
            </button>
          </>
        )}
        {!activeBrush && (
          <span style={{ fontSize: 10, color: '#a16207' }}>← ① Phénomène + ② Niveau, puis peignez les régions</span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TEXTES TAB
   ══════════════════════════════════════════════ */
const SG_FIELDS = [
  { key: 'ciel',         label: '☁️ Ciel',        placeholder: 'Ex: un ciel partiellement nuageux à couvert…',       categorie: 'ciel'         },
  { key: 'vents',        label: '💨 Vents',        placeholder: 'Ex: des vents de mousson d\'intensité modérée…',     categorie: 'vents'        },
  { key: 'visibilite',   label: '👁️ Visibilité',   placeholder: 'Ex: une visibilité assez bonne dans l\'ensemble…',   categorie: 'visibilite'   },
  { key: 'orages',       label: '⛈️ Orages',       placeholder: 'Ex: des orages isolés accompagnés de pluies…',      categorie: 'orages'       },
  { key: 'temperatures', label: '🌡️ Températures', placeholder: 'Ex: des températures en légère hausse…',            categorie: 'temperatures' },
];

function TextesTab({ sg, onChange, previousBulletin, onImportFromPrevious }: {
  sg: Bulletin['situationGenerale'];
  onChange: (field: string, value: string) => void;
  previousBulletin: Bulletin | null;
  onImportFromPrevious: () => void;
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Import banner */}
      {previousBulletin && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#0369a1' }}>📅 Bulletin du <strong>{previousBulletin.periodLabel}</strong> disponible</span>
          <button onClick={onImportFromPrevious}
            style={{ fontSize: 11, padding: '3px 12px', borderRadius: 6, background: '#0369a1', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, marginLeft: 'auto' }}>
            Importer les textes de la veille
          </button>
        </div>
      )}

      {/* Text fields */}
      {SG_FIELDS.map((f) => (
        <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{f.label}</label>
            <TemplateSelector categorie={f.categorie} onSelect={(text) => onChange(f.key, text)} />
          </div>
          <Textarea
            rows={3}
            value={(sg as any)[f.key] || ''}
            placeholder={f.placeholder}
            onChange={(e) => onChange(f.key, e.target.value)}
            className="text-xs resize-y"
          />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */
export function EditBulletin() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = parseInt(idParam || '0', 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bulletin, isLoading } = useGetBulletin(id, {
    query: { enabled: !!id, queryKey: getGetBulletinQueryKey(id) },
  });
  const { data: allBulletins } = useListBulletins();
  const updateMutation = useUpdateBulletin();

  const [formData, setFormData] = useState<Bulletin | null>(null);
  const initializedRef = useRef<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  /* Studio state */
  const [activeTab, setActiveTab] = useState<StudioTab>('carte');
  const [carteMode, setCarteMode] = useState<CarteMode>('temperature');
  const [activeBrush, setActiveBrush] = useState<string | null>(null);
  const [brushType, setBrushType]   = useState<string | null>(null);
  const [brushNiveau, setBrushNiveau] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<VilleData | null>(null);

  /* Derived editMode for the map component */
  const editMode: EditMode = activeTab === 'vigilance' ? 'vigilance' : carteMode;

  /* Undo / redo history */
  const history = useRef<Snapshot[]>([]);
  const historyIdx = useRef<number>(-1);

  const pushHistory = useCallback((snap: Snapshot) => {
    history.current = history.current.slice(0, historyIdx.current + 1);
    history.current.push(snap);
    if (history.current.length > MAX_HISTORY) history.current.shift();
    historyIdx.current = history.current.length - 1;
  }, []);

  const canUndo = historyIdx.current > 0;
  const canRedo = historyIdx.current < history.current.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    historyIdx.current -= 1;
    const snap = history.current[historyIdx.current];
    setFormData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, donneesVilles: snap.villes, vigilanceNiveaux: snap.vigilance };
      triggerSaveRef.current(next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    historyIdx.current += 1;
    const snap = history.current[historyIdx.current];
    setFormData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, donneesVilles: snap.villes, vigilanceNiveaux: snap.vigilance };
      triggerSaveRef.current(next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRedo]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  /* Load GeoJSON */
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}mali-admin1.geojson`)
      .then((r) => r.json()).then(setGeoJson).catch(() => {});
  }, []);

  /* Init form */
  useEffect(() => {
    if (bulletin && initializedRef.current !== id) {
      initializedRef.current = id;
      const base = getInitialVilleData();
      const merged = base.map((def) => {
        const ex = bulletin.donneesVilles?.find((v) => v.nom === def.nom);
        return ex ? { ...def, ...ex } : def;
      });
      const vigilance = bulletin.vigilanceNiveaux?.length
        ? bulletin.vigilanceNiveaux : getInitialVigilanceData();
      const fd = { ...bulletin, donneesVilles: merged, vigilanceNiveaux: vigilance };
      setFormData(fd);
      history.current = [{ villes: merged, vigilance }];
      historyIdx.current = 0;
    }
  }, [bulletin, id]);

  /* Auto-save ref */
  const triggerSaveRef = useRef<(data: Bulletin) => void>(() => {});
  useEffect(() => {
    triggerSaveRef.current = (newData: Bulletin) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setIsSaving(true);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await updateMutation.mutateAsync({
            id,
            data: {
              type: newData.type, bulletinDate: newData.bulletinDate,
              periodLabel: newData.periodLabel, validiteLabel: newData.validiteLabel,
              heureLabel: newData.heureLabel, situationGenerale: newData.situationGenerale,
              donneesVilles: newData.donneesVilles, vigilanceNiveaux: newData.vigilanceNiveaux,
            },
          });
          queryClient.setQueryData(getGetBulletinQueryKey(id), newData);
        } catch {
          toast({ title: 'Erreur de sauvegarde', variant: 'destructive' });
        } finally { setIsSaving(false); }
      }, 900);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* Generic update */
  const update = useCallback((patch: Partial<Bulletin>) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      triggerSaveRef.current(next);
      return next;
    });
  }, []);

  /* Update one city */
  const updateVille = useCallback((cityName: string, field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const donneesVilles = prev.donneesVilles.map((v) =>
        v.nom === cityName ? { ...v, [field]: value } : v
      );
      const next = { ...prev, donneesVilles };
      pushHistory({ villes: donneesVilles, vigilance: prev.vigilanceNiveaux ?? [] });
      triggerSaveRef.current(next);
      return next;
    });
  }, [pushHistory]);

  /* Update one vigilance region */
  const updateVigilanceRegion = useCallback((regionName: string, patch: { type?: string; niveau?: string }) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const vigilanceNiveaux = (prev.vigilanceNiveaux ?? []).map((v: any) =>
        v.region === regionName ? { ...v, ...patch } : v
      );
      const next = { ...prev, vigilanceNiveaux };
      pushHistory({ villes: prev.donneesVilles, vigilance: vigilanceNiveaux });
      triggerSaveRef.current(next);
      return next;
    });
  }, [pushHistory]);

  /* Paste clipboard to city */
  const pasteToCity = useCallback((cityName: string) => {
    if (!clipboard) return;
    setFormData((prev) => {
      if (!prev) return prev;
      const donneesVilles = prev.donneesVilles.map((v) =>
        v.nom === cityName ? { ...clipboard, nom: cityName } : v
      );
      const next = { ...prev, donneesVilles };
      pushHistory({ villes: donneesVilles, vigilance: prev.vigilanceNiveaux ?? [] });
      triggerSaveRef.current(next);
      toast({ title: `Collé sur ${cityName}`, description: `Source : ${clipboard.nom}` });
      return next;
    });
  }, [clipboard, pushHistory, toast]);

  /* Scroll wheel ±1°C */
  const handleTempScroll = useCallback((cityName: string, delta: number) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const donneesVilles = prev.donneesVilles.map((v) => {
        if (v.nom !== cityName) return v;
        const tmax = v.tmax !== null ? Math.min(52, Math.max(15, v.tmax + delta)) : 30 + delta;
        return { ...v, tmax };
      });
      const next = { ...prev, donneesVilles };
      triggerSaveRef.current(next);
      return next;
    });
  }, []);

  /* Paint city condition */
  const paintCity = useCallback((cityName: string) => {
    if (!activeBrush) return;
    updateVille(cityName, 'condition', activeBrush);
  }, [activeBrush, updateVille]);

  /* Paint region vigilance */
  const paintRegion = useCallback((regionName: string) => {
    if (!activeBrush) return;
    const [type, niveau] = activeBrush.includes('|')
      ? activeBrush.split('|') : ['aucun', activeBrush];
    setFormData((prev) => {
      if (!prev) return prev;
      const vigilanceNiveaux = (prev.vigilanceNiveaux ?? []).map((v: any) =>
        v.region === regionName ? { ...v, niveau, type } : v
      );
      const next = { ...prev, vigilanceNiveaux };
      triggerSaveRef.current(next);
      return next;
    });
  }, [activeBrush]);

  /* Apply brush to ALL */
  const applyBrushAll = useCallback(() => {
    if (!activeBrush || !formData) return;
    if (editMode === 'condition') {
      setFormData((prev) => {
        if (!prev) return prev;
        const donneesVilles = prev.donneesVilles.map((v) => ({ ...v, condition: activeBrush }));
        const next = { ...prev, donneesVilles };
        pushHistory({ villes: donneesVilles, vigilance: prev.vigilanceNiveaux ?? [] });
        triggerSaveRef.current(next);
        toast({ title: 'Condition appliquée à toutes les villes' });
        return next;
      });
    } else if (editMode === 'vigilance') {
      const [type, niveau] = activeBrush.includes('|')
        ? activeBrush.split('|') : ['aucun', activeBrush];
      setFormData((prev) => {
        if (!prev) return prev;
        const vigilanceNiveaux = (prev.vigilanceNiveaux ?? []).map((v: any) => ({ ...v, niveau, type }));
        const next = { ...prev, vigilanceNiveaux };
        pushHistory({ villes: prev.donneesVilles, vigilance: vigilanceNiveaux });
        triggerSaveRef.current(next);
        toast({ title: 'Vigilance appliquée à toutes les régions' });
        return next;
      });
    }
  }, [activeBrush, editMode, formData, pushHistory, toast]);

  /* Sync vigilance brush */
  useEffect(() => {
    if (activeTab === 'vigilance' && brushType && brushNiveau) {
      setActiveBrush(`${brushType}|${brushNiveau}`);
    } else if (activeTab === 'vigilance') {
      setActiveBrush(null);
    }
  }, [activeTab, brushType, brushNiveau]);

  /* Switch tabs */
  const switchTab = (tab: StudioTab) => {
    setActiveTab(tab);
    setSelectedEntity(null);
    if (tab !== 'vigilance') {
      setActiveBrush(null);
    }
    if (tab !== 'carte') {
      setActiveBrush(null);
    }
  };

  /* Live weather */
  const loadWeather = useCallback(async () => {
    if (!formData) return;
    setWeatherLoading(true);
    try {
      const weather = await fetchMaliWeather();
      setFormData((prev) => {
        if (!prev) return prev;
        const donneesVilles = prev.donneesVilles.map((v) => {
          const w = weather[v.nom];
          return w ? { ...v, tmax: w.tmax, tmin: w.tmin } : v;
        });
        const next = { ...prev, donneesVilles };
        pushHistory({ villes: donneesVilles, vigilance: prev.vigilanceNiveaux ?? [] });
        triggerSaveRef.current(next);
        return next;
      });
      toast({ title: '✓ Températures chargées via Open-Meteo' });
    } catch {
      toast({ title: 'Erreur météo', variant: 'destructive' });
    } finally { setWeatherLoading(false); }
  }, [formData, pushHistory, toast]);

  /* Date change */
  const handleDateChange = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    update({ bulletinDate: dateStr, periodLabel: label });
  };

  /* Previous bulletin (for copy from yesterday) */
  const previousBulletin = useMemo(() => {
    if (!allBulletins || !formData) return null;
    return (allBulletins as Bulletin[])
      .filter((b) => b.type === formData.type && b.bulletinDate < formData.bulletinDate && b.id !== formData.id)
      .sort((a, b) => b.bulletinDate.localeCompare(a.bulletinDate))[0] ?? null;
  }, [allBulletins, formData]);

  /* Import SG from yesterday */
  const importFromPrevious = useCallback(() => {
    if (!previousBulletin) return;
    update({ situationGenerale: previousBulletin.situationGenerale });
    toast({ title: 'Textes importés', description: `Depuis le ${previousBulletin.periodLabel}` });
  }, [previousBulletin, update, toast]);

  /* ── Loading ── */
  if (isLoading || !formData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const selectedVille = selectedEntity?.type === 'city'
    ? formData.donneesVilles.find((v) => v.nom === selectedEntity.name) ?? null : null;
  const showTmin = ['radio', 'national', 'journaux'].includes(formData.type);

  /* ══════════ RENDER ══════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0 flex-wrap no-print"
        style={{ background: '#0d1f3c', minHeight: 52 }}>
        <button onClick={() => setLocation('/historique')}
          className="text-white/80 hover:text-white flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> Retour
        </button>
        <div className="h-4 w-px bg-white/20" />

        {/* Type pills — affect preview output */}
        <div className="flex gap-1">
          {BULLETIN_TYPES.map((bt) => (
            <button key={bt.value} onClick={() => update({ type: bt.value as Bulletin['type'] })}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                formData.type === bt.value
                  ? 'bg-white text-[#0d1f3c]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}>
              {bt.emoji} {bt.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-white/20" />

        {/* Date + metadata */}
        <div className="flex items-center gap-1">
          <span className="text-white/60 text-xs">Date:</span>
          <input type="date" value={formData.bulletinDate} onChange={(e) => handleDateChange(e.target.value)}
            className="text-xs border-0 rounded px-2 py-0.5 bg-white/10 text-white focus:ring-1 focus:ring-white/50 focus:outline-none" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-white/60 text-xs">Valide:</span>
          <input value={formData.validiteLabel || ''} onChange={(e) => update({ validiteLabel: e.target.value })}
            placeholder="aujourd'hui 18h TU"
            className="text-xs border-0 rounded px-2 py-0.5 bg-white/10 text-white placeholder-white/30 focus:ring-1 focus:ring-white/50 focus:outline-none w-36" />
        </div>
        {formData.type === 'radio' && (
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">Heure:</span>
            <input value={formData.heureLabel || ''} onChange={(e) => update({ heureLabel: e.target.value })}
              placeholder="12h TU"
              className="text-xs border-0 rounded px-2 py-0.5 bg-white/10 text-white placeholder-white/30 focus:ring-1 focus:ring-white/50 focus:outline-none w-20" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/50">{isSaving ? '● Sauvegarde…' : '✓ Enregistré'}</span>
          <button onClick={loadWeather} disabled={weatherLoading} title="Charger depuis Open-Meteo"
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50">
            {weatherLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Météo live
          </button>
          <button onClick={() => printBulletin()}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-bold transition-all"
            style={{ background: '#c8a44a', color: '#0d1f3c' }}>
            <Printer size={13} /> Imprimer PDF
          </button>
        </div>
      </div>

      {/* ── MAIN SPLIT ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ════ LEFT: Studio tabs ════ */}
        <div className="flex flex-col border-r overflow-hidden" style={{ width: '52%' }}>

          {/* Tab bar + undo/redo */}
          <StudioTabBar
            active={activeTab}
            onChange={switchTab}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />

          {/* ── TAB: Carte météo ── */}
          {activeTab === 'carte' && (
            <>
              <CarteModeBar active={carteMode} onChange={(m) => { setCarteMode(m); setActiveBrush(null); setSelectedEntity(null); }} />
              <CarteContextBar mode={carteMode} activeBrush={activeBrush} setActiveBrush={setActiveBrush} onApplyAll={applyBrushAll} />

              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* City list sidebar */}
                <CityListSidebar
                  villes={formData.donneesVilles as VilleData[]}
                  selectedName={selectedEntity?.type === 'city' ? selectedEntity.name : null}
                  onSelect={(name) => setSelectedEntity({ type: 'city', name })}
                  clipboard={clipboard}
                  onCopyCity={(name) => {
                    const v = formData.donneesVilles.find((d) => d.nom === name);
                    if (v) { setClipboard(v as VilleData); toast({ title: `${name} copié` }); }
                  }}
                  onPasteCity={pasteToCity}
                />
                {/* Map */}
                <div className="flex-1 min-h-0 min-w-0">
                  <MaliInteractiveMap
                    donneesVilles={formData.donneesVilles as VilleData[]}
                    vigilanceNiveaux={formData.vigilanceNiveaux ?? []}
                    bulletinType={formData.type}
                    geoJson={geoJson}
                    selectedEntity={selectedEntity}
                    onSelect={setSelectedEntity}
                    editMode={editMode}
                    activeBrush={activeBrush}
                    onPaintCity={paintCity}
                    onPaintRegion={paintRegion}
                    onTempScroll={handleTempScroll}
                  />
                </div>
              </div>

              {/* Bottom panels */}
              {carteMode === 'temperature' && selectedEntity?.type === 'city' && selectedVille && (
                <TempPanel
                  cityName={selectedEntity.name}
                  villeData={selectedVille as VilleData}
                  showTmin={showTmin}
                  clipboard={clipboard}
                  onUpdate={(field, value) => updateVille(selectedEntity.name, field, value)}
                  onCopy={() => { setClipboard(selectedVille as VilleData); toast({ title: `${selectedEntity.name} copié` }); }}
                  onPaste={() => pasteToCity(selectedEntity.name)}
                  onClose={() => setSelectedEntity(null)}
                />
              )}
              {carteMode === 'vent' && selectedEntity?.type === 'city' && selectedVille && (
                <WindPanel
                  cityName={selectedEntity.name}
                  villeData={selectedVille as VilleData}
                  clipboard={clipboard}
                  onUpdate={(field, value) => updateVille(selectedEntity.name, field, value)}
                  onCopy={() => { setClipboard(selectedVille as VilleData); toast({ title: `${selectedEntity.name} copié` }); }}
                  onPaste={() => pasteToCity(selectedEntity.name)}
                  onClose={() => setSelectedEntity(null)}
                />
              )}
            </>
          )}

          {/* ── TAB: Vigilance ── */}
          {activeTab === 'vigilance' && (
            <>
              <VigilanceContextBar
                activeBrush={activeBrush}
                brushType={brushType}
                setBrushType={setBrushType}
                brushNiveau={brushNiveau}
                setBrushNiveau={setBrushNiveau}
                onApplyAll={applyBrushAll}
              />
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Map in vigilance mode */}
                <div className="flex-1 min-h-0 min-w-0">
                  <MaliInteractiveMap
                    donneesVilles={formData.donneesVilles as VilleData[]}
                    vigilanceNiveaux={formData.vigilanceNiveaux ?? []}
                    bulletinType="journaux"
                    geoJson={geoJson}
                    selectedEntity={selectedEntity}
                    onSelect={setSelectedEntity}
                    editMode="vigilance"
                    activeBrush={activeBrush}
                    onPaintCity={paintCity}
                    onPaintRegion={paintRegion}
                    onTempScroll={handleTempScroll}
                  />
                </div>
                {/* Region table sidebar */}
                <RegionTable
                  vigilanceNiveaux={formData.vigilanceNiveaux ?? []}
                  onUpdate={updateVigilanceRegion}
                />
              </div>
            </>
          )}

          {/* ── TAB: Textes ── */}
          {activeTab === 'textes' && (
            <TextesTab
              sg={formData.situationGenerale}
              onChange={(field, value) =>
                update({ situationGenerale: { ...formData.situationGenerale, [field]: value } })
              }
              previousBulletin={previousBulletin}
              onImportFromPrevious={importFromPrevious}
            />
          )}
        </div>

        {/* ════ RIGHT: Live preview ════ */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <div className="max-w-3xl mx-auto">
            <BulletinPreview data={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   CITY LIST SIDEBAR (collapsible, inside Carte tab)
   ══════════════════════════════════════════════ */
function CityListSidebar({ villes, selectedName, onSelect, clipboard, onCopyCity, onPasteCity }: {
  villes: VilleData[];
  selectedName: string | null;
  onSelect: (name: string) => void;
  clipboard: VilleData | null;
  onCopyCity: (name: string) => void;
  onPasteCity: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: open ? 210 : 34, flexShrink: 0, background: '#f8fafc', borderRight: '1px solid #e2e8f0', transition: 'width .18s', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <button onClick={() => setOpen((p) => !p)} title={open ? 'Fermer' : 'Liste des villes'}
        style={{ flexShrink: 0, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#374151', borderBottom: '1px solid #e2e8f0' }}>
        {open ? '◀' : '🏙️'}
      </button>
      {open && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '4px 8px', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
            Villes ({villes.length})
          </div>
          {villes.map((v) => {
            const isSel = selectedName === v.nom;
            return (
              <div key={v.nom} onClick={() => onSelect(v.nom)}
                style={{ padding: '4px 7px', cursor: 'pointer', fontSize: 10.5, background: isSel ? '#dbeafe' : 'transparent', borderLeft: isSel ? '3px solid #2563eb' : '3px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: isSel ? 700 : 500, color: isSel ? '#1d4ed8' : '#374151' }}>{v.nom}</div>
                  <div style={{ color: '#94a3b8', fontSize: 9 }}>{v.tmax !== null ? `${v.tmax}°/${v.tmin ?? '–'}°` : '–'}</div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button onClick={(e) => { e.stopPropagation(); onCopyCity(v.nom); }} title="Copier"
                    style={{ fontSize: 9, padding: '1px 3px', borderRadius: 3, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>📋</button>
                  {clipboard && clipboard.nom !== v.nom && (
                    <button onClick={(e) => { e.stopPropagation(); onPasteCity(v.nom); }} title={`Coller depuis ${clipboard.nom}`}
                      style={{ fontSize: 9, padding: '1px 3px', borderRadius: 3, border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer' }}>📌</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
