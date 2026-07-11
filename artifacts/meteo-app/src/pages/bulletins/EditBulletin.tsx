import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams } from 'wouter';
import {
  useGetBulletin,
  useUpdateBulletin,
  useListTemplates,
  getGetBulletinQueryKey,
  Bulletin,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft, Printer, CloudSun, ChevronDown, ChevronUp,
  RefreshCw, Loader2, Undo2, Redo2,
} from 'lucide-react';
import { BulletinPreview } from '@/components/bulletins/BulletinPreview';
import {
  MaliInteractiveMap,
  TempPanel, WindPanel, VigilanceEditPanel,
  SelectedEntity, VilleData, VigilanceData, EditMode,
} from '@/components/map/MaliInteractiveMap';
import {
  CITIES, CONDITIONS, VIGILANCE_NIVEAUX,
  getInitialVilleData, getInitialVigilanceData,
} from '@/lib/constants';
import { fetchMaliWeather } from '@/lib/weather-api';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

/* ─── Template picker ─── */
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

/* ─── Situation Générale accordion ─── */
function SituationGeneralePanel({ sg, onChange }: {
  sg: Bulletin['situationGenerale'];
  onChange: (field: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const fields = [
    { key: 'ciel',         label: 'Ciel',        categorie: 'ciel'         },
    { key: 'vents',        label: 'Vents',        categorie: 'vents'        },
    { key: 'visibilite',   label: 'Visibilité',   categorie: 'visibilite'   },
    { key: 'orages',       label: 'Orages',       categorie: 'orages'       },
    { key: 'temperatures', label: 'Températures', categorie: 'temperatures' },
  ];
  return (
    <div className="border-b bg-white flex-shrink-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors"
        style={{ borderBottom: open ? '1px solid #e5e7eb' : 'none' }}
      >
        <span className="font-semibold text-sm flex items-center gap-2">
          <CloudSun size={15} /> Situation Générale
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-3 overflow-y-auto" style={{ maxHeight: 280 }}>
          {fields.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">{f.label}</label>
                <TemplateSelector categorie={f.categorie} onSelect={(text) => onChange(f.key, text)} />
              </div>
              <Textarea rows={2} className="text-xs resize-none"
                value={(sg as any)[f.key] || ''}
                placeholder={`Description — ${f.label.toLowerCase()}`}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MODE TOOLBAR
   ══════════════════════════════════════════════ */
const MODE_CONFIG: { mode: EditMode; icon: string; label: string; color: string }[] = [
  { mode: 'temperature', icon: '🌡️', label: 'Températures', color: '#dc2626' },
  { mode: 'condition',   icon: '☁️',  label: 'Nébulosité',  color: '#8b5cf6' },
  { mode: 'vent',        icon: '💨',  label: 'Vent',        color: '#0ea5e9' },
  { mode: 'vigilance',   icon: '🚨',  label: 'Vigilance',   color: '#f59e0b' },
];

function ModeToolbar({ active, onChange, canUndo, canRedo, onUndo, onRedo }: {
  active: EditMode; onChange: (m: EditMode) => void;
  canUndo: boolean; canRedo: boolean;
  onUndo: () => void; onRedo: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
      background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
      flexShrink: 0, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>
        Mode
      </span>
      {MODE_CONFIG.map(({ mode, icon, label, color }) => {
        const isActive = active === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            title={label}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 8,
              background: isActive ? color : 'white',
              border: `2px solid ${isActive ? color : '#e2e8f0'}`,
              color: isActive ? 'white' : '#374151',
              fontWeight: isActive ? 700 : 500,
              fontSize: 12, cursor: 'pointer',
              transition: 'all .15s',
              boxShadow: isActive ? `0 2px 8px ${color}55` : 'none',
            }}
          >
            <span style={{ fontSize: 14 }}>{icon}</span>
            {label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      {/* Undo / Redo */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onUndo} disabled={!canUndo} title="Annuler (Ctrl+Z)"
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            borderRadius: 7, border: '1.5px solid #e2e8f0',
            background: canUndo ? 'white' : '#f9fafb',
            color: canUndo ? '#374151' : '#d1d5db',
            fontSize: 12, cursor: canUndo ? 'pointer' : 'default',
          }}
        >
          <Undo2 size={13} /> Annuler
        </button>
        <button
          onClick={onRedo} disabled={!canRedo} title="Rétablir (Ctrl+Y)"
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            borderRadius: 7, border: '1.5px solid #e2e8f0',
            background: canRedo ? 'white' : '#f9fafb',
            color: canRedo ? '#374151' : '#d1d5db',
            fontSize: 12, cursor: canRedo ? 'pointer' : 'default',
          }}
        >
          <Redo2 size={13} /> Rétablir
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MODE CONTEXT BAR (palette / hints per mode)
   ══════════════════════════════════════════════ */
function ContextBar({ editMode, activeBrush, setActiveBrush, onApplyAll, bulletinType }: {
  editMode: EditMode; activeBrush: string | null; setActiveBrush: (b: string | null) => void;
  onApplyAll: () => void; bulletinType: string;
}) {
  if (editMode === 'condition') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
        background: '#faf5ff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 1 }}>
          ☁️ Pinceau condition
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {CONDITIONS.map((c) => {
            const active = activeBrush === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setActiveBrush(active ? null : c.value)}
                title={c.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4px 8px', borderRadius: 8,
                  border: `2px solid ${active ? '#8b5cf6' : '#e2e8f0'}`,
                  background: active ? '#f3e8ff' : 'white',
                  cursor: 'pointer', gap: 2, transition: 'all .12s',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: active ? '0 2px 8px #8b5cf655' : 'none',
                }}
              >
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? '#8b5cf6' : '#6b7280' }}>{c.label}</span>
              </button>
            );
          })}
        </div>
        {activeBrush && (
          <>
            <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />
            <button
              onClick={onApplyAll}
              style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 7,
                background: '#8b5cf6', color: 'white', border: 'none',
                cursor: 'pointer', fontWeight: 700,
              }}
            >Appliquer à toutes les villes</button>
          </>
        )}
        {!activeBrush && (
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>← Cliquez une icône pour sélectionner le pinceau, puis cliquez les villes sur la carte</span>
        )}
      </div>
    );
  }

  if (editMode === 'vigilance') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
        background: '#fffbeb', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: 1 }}>
          🚨 Pinceau vigilance
        </span>
        <div style={{ display: 'flex', gap: 5 }}>
          {VIGILANCE_NIVEAUX.slice().reverse().map((v) => {
            const active = activeBrush === v.value;
            return (
              <button
                key={v.value}
                onClick={() => setActiveBrush(active ? null : v.value)}
                title={v.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px',
                  borderRadius: 9, border: `2px solid ${v.color}`,
                  background: active ? v.color : v.bg,
                  color: active ? 'white' : v.color,
                  fontWeight: active ? 800 : 600, fontSize: 12, cursor: 'pointer',
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: active ? `0 2px 10px ${v.color}66` : 'none',
                  transition: 'all .12s',
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: active ? 'white' : v.color, display: 'inline-block', flexShrink: 0 }} />
                {v.label}
              </button>
            );
          })}
        </div>
        {activeBrush && (
          <>
            <div style={{ width: 1, height: 32, background: '#e2e8f0' }} />
            <button
              onClick={onApplyAll}
              style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 7,
                background: '#f59e0b', color: 'white', border: 'none',
                cursor: 'pointer', fontWeight: 700,
              }}
            >Peindre toutes les régions</button>
          </>
        )}
        {!activeBrush && (
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>← Sélectionnez un niveau, puis cliquez ou glissez sur les régions</span>
        )}
      </div>
    );
  }

  if (editMode === 'temperature') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
        background: '#fff5f5', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 1 }}>
          🌡️ Températures
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          Cliquez un marqueur pour éditer · Molette sur le marqueur = ±1°C instantané
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            { label: '&lt;25°', color: '#3b82f6' }, { label: '25–30°', color: '#10b981' },
            { label: '30–35°', color: '#f59e0b' }, { label: '35–40°', color: '#f97316' },
            { label: '&gt;40°', color: '#ef4444' },
          ].map((e) => (
            <span key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#374151' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, display: 'inline-block' }} />
              <span dangerouslySetInnerHTML={{ __html: e.label }} />
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (editMode === 'vent') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
        background: '#f0f9ff', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0ea5e9', textTransform: 'uppercase', letterSpacing: 1 }}>
          💨 Vent
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>
          Cliquez un marqueur → rose des vents interactive pour direction + vitesse
        </span>
      </div>
    );
  }

  return null;
}

/* ══════════════════════════════════════════════
   CITY LIST SIDEBAR (collapsed by default)
   ══════════════════════════════════════════════ */
function CityListSidebar({ villes, editMode, onSelect, selectedName, clipboard, onCopyCity, onPasteCity }: {
  villes: VilleData[]; editMode: EditMode;
  onSelect: (name: string) => void; selectedName: string | null;
  clipboard: VilleData | null;
  onCopyCity: (name: string) => void; onPasteCity: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      width: open ? 220 : 36, flexShrink: 0,
      background: '#f8fafc', borderRight: '1px solid #e2e8f0',
      transition: 'width .2s', overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <button
        onClick={() => setOpen((p) => !p)}
        title={open ? 'Fermer la liste' : 'Liste des villes'}
        style={{
          flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#374151',
          borderBottom: '1px solid #e2e8f0',
        }}
      >{open ? '◀' : '🏙️'}</button>
      {open && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
            Villes ({villes.length})
          </div>
          {villes.map((v) => {
            const isSel = selectedName === v.nom;
            return (
              <div
                key={v.nom}
                onClick={() => onSelect(v.nom)}
                style={{
                  padding: '5px 8px', cursor: 'pointer', fontSize: 11,
                  background: isSel ? '#dbeafe' : 'transparent',
                  borderLeft: isSel ? '3px solid #2563eb' : '3px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: isSel ? 700 : 500, color: isSel ? '#1d4ed8' : '#374151' }}>{v.nom}</div>
                  <div style={{ color: '#94a3b8', fontSize: 10 }}>
                    {v.tmax !== null ? `${v.tmax}° / ${v.tmin ?? '–'}°` : '–'}
                    {v.directionVent ? ` · ${v.directionVent}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCopyCity(v.nom); }}
                    title="Copier"
                    style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}
                  >📋</button>
                  {clipboard && clipboard.nom !== v.nom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onPasteCity(v.nom); }}
                      title={`Coller depuis ${clipboard.nom}`}
                      style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer' }}
                    >📌</button>
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
  const updateMutation = useUpdateBulletin();

  const [formData, setFormData] = useState<Bulletin | null>(null);
  const initializedRef = useRef<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Studio state
  const [editMode, setEditMode] = useState<EditMode>('temperature');
  const [activeBrush, setActiveBrush] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<VilleData | null>(null);

  // Undo / redo history
  const history = useRef<Snapshot[]>([]);
  const historyIdx = useRef<number>(-1);

  const pushHistory = useCallback((snap: Snapshot) => {
    // Truncate future states
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

  // Keyboard shortcuts
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
      // Seed history
      history.current = [{ villes: merged, vigilance }];
      historyIdx.current = 0;
    }
  }, [bulletin, id]);

  /* Auto-save ref (kept stable) */
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

  /* Update one city (with history) */
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

  /* Paste clipboard to a city */
  const pasteToCity = useCallback((cityName: string) => {
    if (!clipboard) return;
    setFormData((prev) => {
      if (!prev) return prev;
      const donneesVilles = prev.donneesVilles.map((v) =>
        v.nom === cityName
          ? { ...clipboard, nom: cityName }
          : v
      );
      const next = { ...prev, donneesVilles };
      pushHistory({ villes: donneesVilles, vigilance: prev.vigilanceNiveaux ?? [] });
      triggerSaveRef.current(next);
      toast({ title: `Données collées sur ${cityName}`, description: `Source : ${clipboard.nom}` });
      return next;
    });
  }, [clipboard, pushHistory, toast]);

  /* Scroll wheel ±1°C on city marker */
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

  /* Paint city condition (brush mode) */
  const paintCity = useCallback((cityName: string) => {
    if (!activeBrush) return;
    updateVille(cityName, 'condition', activeBrush);
  }, [activeBrush, updateVille]);

  /* Paint region vigilance (brush mode) */
  const paintRegion = useCallback((regionName: string) => {
    if (!activeBrush) return;
    setFormData((prev) => {
      if (!prev) return prev;
      const vigilanceNiveaux = (prev.vigilanceNiveaux ?? []).map((v) =>
        v.region === regionName ? { ...v, niveau: activeBrush } : v
      );
      const next = { ...prev, vigilanceNiveaux };
      triggerSaveRef.current(next);
      return next;
    });
  }, [activeBrush]);

  /* Apply brush to ALL cities */
  const applyBrushAll = useCallback(() => {
    if (!activeBrush || !formData) return;
    if (editMode === 'condition') {
      setFormData((prev) => {
        if (!prev) return prev;
        const donneesVilles = prev.donneesVilles.map((v) => ({ ...v, condition: activeBrush }));
        const next = { ...prev, donneesVilles };
        pushHistory({ villes: donneesVilles, vigilance: prev.vigilanceNiveaux ?? [] });
        triggerSaveRef.current(next);
        toast({ title: `Condition appliquée à toutes les villes` });
        return next;
      });
    } else if (editMode === 'vigilance') {
      setFormData((prev) => {
        if (!prev) return prev;
        const vigilanceNiveaux = (prev.vigilanceNiveaux ?? []).map((v) => ({ ...v, niveau: activeBrush }));
        const next = { ...prev, vigilanceNiveaux };
        pushHistory({ villes: prev.donneesVilles, vigilance: vigilanceNiveaux });
        triggerSaveRef.current(next);
        toast({ title: `Vigilance appliquée à toutes les régions` });
        return next;
      });
    }
  }, [activeBrush, editMode, formData, pushHistory, toast]);

  /* Update vigilance for region */
  const updateVigilance = useCallback((regionName: string, niveau: string) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const vigilanceNiveaux = (prev.vigilanceNiveaux ?? []).map((v) =>
        v.region === regionName ? { ...v, niveau } : v
      );
      const next = { ...prev, vigilanceNiveaux };
      pushHistory({ villes: prev.donneesVilles, vigilance: vigilanceNiveaux });
      triggerSaveRef.current(next);
      return next;
    });
  }, [pushHistory]);

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
      toast({ title: '✓ Températures chargées', description: 'Open-Meteo appliqué.' });
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

  /* Switch mode → clear brush and selection */
  const switchMode = (mode: EditMode) => {
    setEditMode(mode);
    setActiveBrush(null);
    setSelectedEntity(null);
  };

  /* ── Loading ── */
  if (isLoading || !formData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const selectedVille = selectedEntity?.type === 'city'
    ? formData.donneesVilles.find((v) => v.nom === selectedEntity.name) ?? null
    : null;
  const selectedVigilance = selectedEntity?.type === 'region'
    ? formData.vigilanceNiveaux?.find((v) => v.region === selectedEntity.name) ?? null
    : null;
  const showTmin = ['radio', 'national', 'journaux'].includes(formData.type);

  /* ══════════ RENDER ══════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── TOP BAR ── */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0 flex-wrap"
        style={{ background: '#0d1f3c', minHeight: 52 }}
      >
        <button onClick={() => setLocation('/historique')}
          className="text-white/80 hover:text-white flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> Retour
        </button>
        <div className="h-4 w-px bg-white/20" />

        {/* Type pills */}
        <div className="flex gap-1">
          {BULLETIN_TYPES.map((bt) => (
            <button key={bt.value} onClick={() => update({ type: bt.value as Bulletin['type'] })}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                formData.type === bt.value ? 'bg-white text-[#0d1f3c]' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}>
              {bt.emoji} {bt.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-white/20" />

        {/* Date */}
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
          <button
            onClick={() => window.open(`/bulletins/${id}/preview?print=true`, '_blank')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-bold transition-all"
            style={{ background: '#c8a44a', color: '#0d1f3c' }}>
            <Printer size={13} /> Imprimer PDF
          </button>
        </div>
      </div>

      {/* ── MAIN SPLIT ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ════ LEFT: Map panel ════ */}
        <div className="flex flex-col border-r overflow-hidden" style={{ width: '55%' }}>

          {/* SG accordion */}
          <SituationGeneralePanel
            sg={formData.situationGenerale}
            onChange={(field, value) =>
              update({ situationGenerale: { ...formData.situationGenerale, [field]: value } })
            }
          />

          {/* Mode toolbar */}
          <ModeToolbar
            active={editMode}
            onChange={switchMode}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
          />

          {/* Context bar */}
          <ContextBar
            editMode={editMode}
            activeBrush={activeBrush}
            setActiveBrush={setActiveBrush}
            onApplyAll={applyBrushAll}
            bulletinType={formData.type}
          />

          {/* Map area + city sidebar */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* City list sidebar (collapsible) */}
            <CityListSidebar
              villes={formData.donneesVilles as VilleData[]}
              editMode={editMode}
              selectedName={selectedEntity?.type === 'city' ? selectedEntity.name : null}
              onSelect={(name) => setSelectedEntity({ type: 'city', name })}
              clipboard={clipboard}
              onCopyCity={(name) => {
                const v = formData.donneesVilles.find((d) => d.nom === name);
                if (v) { setClipboard(v as VilleData); toast({ title: `${name} copié dans le presse-papier` }); }
              }}
              onPasteCity={pasteToCity}
            />

            {/* The map */}
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

          {/* Bottom edit panels (temp, wind, or vigilance fallback) */}
          {editMode === 'temperature' && selectedEntity?.type === 'city' && selectedVille && (
            <TempPanel
              cityName={selectedEntity.name}
              villeData={selectedVille as VilleData}
              showTmin={showTmin}
              clipboard={clipboard}
              onUpdate={(field, value) => updateVille(selectedEntity.name, field, value)}
              onCopy={() => {
                setClipboard(selectedVille as VilleData);
                toast({ title: `${selectedEntity.name} copié dans le presse-papier` });
              }}
              onPaste={() => pasteToCity(selectedEntity.name)}
              onClose={() => setSelectedEntity(null)}
            />
          )}
          {editMode === 'vent' && selectedEntity?.type === 'city' && selectedVille && (
            <WindPanel
              cityName={selectedEntity.name}
              villeData={selectedVille as VilleData}
              clipboard={clipboard}
              onUpdate={(field, value) => updateVille(selectedEntity.name, field, value)}
              onCopy={() => {
                setClipboard(selectedVille as VilleData);
                toast({ title: `${selectedEntity.name} copié dans le presse-papier` });
              }}
              onPaste={() => pasteToCity(selectedEntity.name)}
              onClose={() => setSelectedEntity(null)}
            />
          )}
          {/* Vigilance fallback panel (non-paint mode, region selected) */}
          {editMode !== 'vigilance' && selectedEntity?.type === 'region' && selectedVigilance && (
            <VigilanceEditPanel
              regionName={selectedEntity.name}
              niveau={selectedVigilance.niveau}
              onUpdate={(niveau) => updateVigilance(selectedEntity.name, niveau)}
              onClose={() => setSelectedEntity(null)}
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
