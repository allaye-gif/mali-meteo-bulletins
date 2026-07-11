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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Printer, CloudSun, ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react';
import { BulletinPreview } from '@/components/bulletins/BulletinPreview';
import {
  MaliInteractiveMap,
  CityEditPanel,
  VigilanceEditPanel,
  SelectedEntity,
  VilleData,
} from '@/components/map/MaliInteractiveMap';
import {
  CITIES,
  CONDITIONS,
  VIGILANCE_NIVEAUX,
  getInitialVilleData,
  getInitialVigilanceData,
} from '@/lib/constants';
import { fetchMaliWeather } from '@/lib/weather-api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ─── Bulletin type config ─── */
const BULLETIN_TYPES = [
  { value: 'radio',    label: 'Radio',    emoji: '📻' },
  { value: 'matinal',  label: 'Matinal',  emoji: '🌅' },
  { value: 'journaux', label: 'Journaux', emoji: '📰' },
  { value: 'ortm',     label: 'ORTM',     emoji: '📺' },
  { value: 'national', label: 'National', emoji: '🗺️' },
];

/* ─── Template picker dropdown ─── */
function TemplateSelector({
  categorie,
  onSelect,
}: {
  categorie: string;
  onSelect: (text: string) => void;
}) {
  const { data: templates } = useListTemplates({ categorie });
  if (!templates?.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 text-xs px-2">
          Modèles ▾
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-72 overflow-y-auto">
        {templates.map((t) => (
          <DropdownMenuItem
            key={t.id}
            className="flex flex-col items-start py-2 cursor-pointer"
            onClick={() => onSelect(t.texte)}
          >
            <span className="font-semibold text-xs">{t.nom}</span>
            <span className="text-xs text-muted-foreground line-clamp-2 whitespace-normal">
              {t.texte}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Situation Générale collapsible panel ─── */
function SituationGeneralePanel({
  sg,
  onChange,
}: {
  sg: Bulletin['situationGenerale'];
  onChange: (field: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const fields = [
    { key: 'ciel',         label: 'Ciel',         categorie: 'ciel'         },
    { key: 'vents',        label: 'Vents',         categorie: 'vents'        },
    { key: 'visibilite',   label: 'Visibilité',    categorie: 'visibilite'   },
    { key: 'orages',       label: 'Orages',        categorie: 'orages'       },
    { key: 'temperatures', label: 'Températures',  categorie: 'temperatures' },
  ];

  return (
    <div className="border-b bg-white flex-shrink-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors"
        style={{ borderBottom: open ? '1px solid #e5e7eb' : 'none' }}
      >
        <span className="font-semibold text-sm flex items-center gap-2">
          <CloudSun size={15} />
          Situation Générale
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3 overflow-y-auto" style={{ maxHeight: 280 }}>
          {fields.map((f) => (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-xs font-semibold text-gray-600 uppercase">
                  {f.label}
                </label>
                <TemplateSelector
                  categorie={f.categorie}
                  onSelect={(text) => onChange(f.key, text)}
                />
              </div>
              <Textarea
                rows={2}
                className="text-xs resize-none"
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

/* ══════════════════════════════════ MAIN PAGE ══════════════════════════════════ */
export function EditBulletin() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = parseInt(idParam || '0', 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bulletin, isLoading, error } = useGetBulletin(id, {
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

  /* Load GeoJSON */
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}mali-admin1.geojson`)
      .then((r) => r.json())
      .then(setGeoJson)
      .catch(() => {});
  }, []);

  /* Init form data from fetched bulletin */
  useEffect(() => {
    if (bulletin && initializedRef.current !== id) {
      initializedRef.current = id;
      // Ensure donneesVilles has all 20 cities
      const base = getInitialVilleData();
      const merged = base.map((def) => {
        const existing = bulletin.donneesVilles?.find((v) => v.nom === def.nom);
        return existing ? { ...def, ...existing } : def;
      });
      const vigilance =
        bulletin.vigilanceNiveaux?.length
          ? bulletin.vigilanceNiveaux
          : getInitialVigilanceData();
      setFormData({ ...bulletin, donneesVilles: merged, vigilanceNiveaux: vigilance });
    }
  }, [bulletin, id]);

  /* Auto-save (debounced 900ms) */
  const triggerSave = useCallback(
    (newData: Bulletin) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setIsSaving(true);
      saveTimerRef.current = setTimeout(async () => {
        try {
          await updateMutation.mutateAsync({
            id,
            data: {
              type: newData.type,
              bulletinDate: newData.bulletinDate,
              periodLabel: newData.periodLabel,
              validiteLabel: newData.validiteLabel,
              heureLabel: newData.heureLabel,
              situationGenerale: newData.situationGenerale,
              donneesVilles: newData.donneesVilles,
              vigilanceNiveaux: newData.vigilanceNiveaux,
            },
          });
          queryClient.setQueryData(getGetBulletinQueryKey(id), newData);
        } catch {
          toast({ title: 'Erreur de sauvegarde', variant: 'destructive' });
        } finally {
          setIsSaving(false);
        }
      }, 900);
    },
    [id, updateMutation, queryClient, toast]
  );

  /* Generic field updater */
  const update = useCallback(
    (patch: Partial<Bulletin>) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        triggerSave(next);
        return next;
      });
    },
    [triggerSave]
  );

  /* Update a specific city field */
  const updateVille = useCallback(
    (cityName: string, field: string, value: any) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const donneesVilles = prev.donneesVilles.map((v) =>
          v.nom === cityName ? { ...v, [field]: value } : v
        );
        const next = { ...prev, donneesVilles };
        triggerSave(next);
        return next;
      });
    },
    [triggerSave]
  );

  /* Update vigilance niveau for a region */
  const updateVigilance = useCallback(
    (regionName: string, niveau: string) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const vigilanceNiveaux = (prev.vigilanceNiveaux ?? []).map((v) =>
          v.region === regionName ? { ...v, niveau } : v
        );
        const next = { ...prev, vigilanceNiveaux };
        triggerSave(next);
        return next;
      });
    },
    [triggerSave]
  );

  /* Fetch live weather and pre-populate */
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
        triggerSave(next);
        return next;
      });
      toast({ title: '✓ Températures chargées', description: 'Données Open-Meteo appliquées.' });
    } catch {
      toast({ title: 'Erreur météo', description: 'Impossible de joindre Open-Meteo.', variant: 'destructive' });
    } finally {
      setWeatherLoading(false);
    }
  }, [formData, triggerSave, toast]);

  /* Auto-format date → periodLabel */
  const handleDateChange = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    update({ bulletinDate: dateStr, periodLabel: label });
  };

  /* ── Loading state ── */
  if (isLoading || !formData) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  const selectedVille = selectedEntity?.type === 'city'
    ? formData.donneesVilles.find((v) => v.nom === selectedEntity.name)
    : null;

  const selectedVigilance = selectedEntity?.type === 'region'
    ? formData.vigilanceNiveaux?.find((v) => v.region === selectedEntity.name)
    : null;

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── TOP BAR ── */}
      <div
        className="flex items-center gap-3 px-4 py-2 border-b flex-shrink-0 flex-wrap"
        style={{ background: '#0d1f3c', minHeight: 52 }}
      >
        {/* Back */}
        <button
          onClick={() => setLocation('/historique')}
          className="text-white/80 hover:text-white flex items-center gap-1 text-sm"
        >
          <ChevronLeft size={16} /> Retour
        </button>
        <div className="h-4 w-px bg-white/20" />

        {/* Bulletin type pills */}
        <div className="flex gap-1">
          {BULLETIN_TYPES.map((bt) => (
            <button
              key={bt.value}
              onClick={() => update({ type: bt.value as Bulletin['type'] })}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                formData.type === bt.value
                  ? 'bg-white text-[#0d1f3c]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {bt.emoji} {bt.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-white/20" />

        {/* Date */}
        <div className="flex items-center gap-1">
          <span className="text-white/60 text-xs">Date:</span>
          <input
            type="date"
            value={formData.bulletinDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-xs border-0 rounded px-2 py-0.5 bg-white/10 text-white focus:ring-1 focus:ring-white/50 focus:outline-none"
          />
        </div>

        {/* Validity */}
        <div className="flex items-center gap-1">
          <span className="text-white/60 text-xs">Valide:</span>
          <input
            value={formData.validiteLabel || ''}
            onChange={(e) => update({ validiteLabel: e.target.value })}
            placeholder="aujourd'hui 18h TU"
            className="text-xs border-0 rounded px-2 py-0.5 bg-white/10 text-white placeholder-white/30 focus:ring-1 focus:ring-white/50 focus:outline-none w-36"
          />
        </div>

        {/* Hour (Radio only) */}
        {formData.type === 'radio' && (
          <div className="flex items-center gap-1">
            <span className="text-white/60 text-xs">Heure:</span>
            <input
              value={formData.heureLabel || ''}
              onChange={(e) => update({ heureLabel: e.target.value })}
              placeholder="12h TU"
              className="text-xs border-0 rounded px-2 py-0.5 bg-white/10 text-white placeholder-white/30 focus:ring-1 focus:ring-white/50 focus:outline-none w-20"
            />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Save indicator */}
          <span className="text-xs text-white/50">
            {isSaving ? '● Sauvegarde...' : '✓ Enregistré'}
          </span>

          {/* Load weather button */}
          <button
            onClick={loadWeather}
            disabled={weatherLoading}
            title="Charger les températures depuis Open-Meteo"
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50"
          >
            {weatherLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Météo live
          </button>

          {/* Print */}
          <button
            onClick={() => window.open(`/bulletins/${id}/preview?print=true`, '_blank')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-bold transition-all"
            style={{ background: '#c8a44a', color: '#0d1f3c' }}
          >
            <Printer size={13} />
            Imprimer PDF
          </button>
        </div>
      </div>

      {/* ── MAIN SPLIT ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ════ LEFT: Map panel ════ */}
        <div className="flex flex-col border-r flex-shrink-0 overflow-hidden" style={{ width: '55%' }}>

          {/* Situation Générale collapsible */}
          <SituationGeneralePanel
            sg={formData.situationGenerale}
            onChange={(field, value) =>
              update({ situationGenerale: { ...formData.situationGenerale, [field]: value } })
            }
          />

          {/* Map legend bar */}
          <div className="flex items-center gap-4 px-3 py-1.5 bg-gray-50 border-b text-xs text-gray-500 flex-shrink-0 flex-wrap">
            <span className="font-semibold text-gray-700">Carte interactive</span>
            <span>Cliquez sur une ville pour la modifier</span>
            {formData.type === 'journaux' && (
              <span className="text-amber-700 font-medium">• Cliquez sur une région → niveau de vigilance</span>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {[
                { label: '<25°', color: '#3b82f6' },
                { label: '25-30°', color: '#10b981' },
                { label: '30-35°', color: '#f59e0b' },
                { label: '35-40°', color: '#f97316' },
                { label: '>40°', color: '#ef4444' },
              ].map((e) => (
                <span key={e.label} className="flex items-center gap-0.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: e.color }} />
                  {e.label}
                </span>
              ))}
            </div>
          </div>

          {/* The actual map */}
          <div className="flex-1 min-h-0">
            <MaliInteractiveMap
              donneesVilles={formData.donneesVilles as VilleData[]}
              vigilanceNiveaux={formData.vigilanceNiveaux ?? []}
              bulletinType={formData.type}
              geoJson={geoJson}
              selectedEntity={selectedEntity}
              onSelect={setSelectedEntity}
            />
          </div>

          {/* City edit panel (slides in when city selected) */}
          {selectedEntity?.type === 'city' && selectedVille && (
            <CityEditPanel
              cityName={selectedEntity.name}
              villeData={selectedVille as VilleData}
              bulletinType={formData.type}
              onUpdate={(field, value) => updateVille(selectedEntity.name, field, value)}
              onClose={() => setSelectedEntity(null)}
            />
          )}

          {/* Vigilance edit panel (Journaux only) */}
          {selectedEntity?.type === 'region' && selectedVigilance && (
            <VigilanceEditPanel
              regionName={selectedEntity.name}
              niveau={selectedVigilance.niveau}
              onUpdate={(niveau) => updateVigilance(selectedEntity.name, niveau)}
              onClose={() => setSelectedEntity(null)}
            />
          )}
        </div>

        {/* ════ RIGHT: Live bulletin preview ════ */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <div className="max-w-3xl mx-auto">
            <BulletinPreview data={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}
