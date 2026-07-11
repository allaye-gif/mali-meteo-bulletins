export const CITIES = [
  { id: 'kayes',       name: 'Kayes',       group: 1, lat: 14.4474, lng: -11.4338 },
  { id: 'koulikoro',   name: 'Koulikoro',   group: 1, lat: 12.8639, lng:  -7.5561 },
  { id: 'sikasso',     name: 'Sikasso',     group: 1, lat: 11.3170, lng:  -5.6663 },
  { id: 'segou',       name: 'Ségou',       group: 1, lat: 13.4502, lng:  -6.2674 },
  { id: 'mopti',       name: 'Mopti',       group: 1, lat: 14.4943, lng:  -4.1978 },
  { id: 'tombouctou',  name: 'Tombouctou',  group: 1, lat: 16.7735, lng:  -3.0074 },
  { id: 'gao',         name: 'Gao',         group: 2, lat: 16.2666, lng:  -0.0504 },
  { id: 'menaka',      name: 'Ménaka',      group: 2, lat: 15.9201, lng:   2.3993 },
  { id: 'kidal',       name: 'Kidal',       group: 2, lat: 18.4411, lng:   1.4078 },
  { id: 'taoudeni',    name: 'Taoudéni',    group: 2, lat: 22.6781, lng:  -3.9789 },
  { id: 'bougouni',    name: 'Bougouni',    group: 2, lat: 11.4107, lng:  -7.4888 },
  { id: 'koutiala',    name: 'Koutiala',    group: 2, lat: 12.3920, lng:  -5.4651 },
  { id: 'dioila',      name: 'Dioïla',      group: 3, lat: 12.4980, lng:  -6.7820 },
  { id: 'nioro',       name: 'Nioro',       group: 3, lat: 15.2338, lng:  -9.5870 },
  { id: 'nara',        name: 'Nara',        group: 3, lat: 15.1696, lng:  -7.2937 },
  { id: 'kita',        name: 'Kita',        group: 3, lat: 13.0450, lng:  -9.4834 },
  { id: 'san',         name: 'San',         group: 3, lat: 13.3000, lng:  -4.9000 },
  { id: 'douentza',    name: 'Douentza',    group: 3, lat: 14.9827, lng:  -2.9589 },
  { id: 'bandiagara',  name: 'Bandiagara',  group: 4, lat: 14.3500, lng:  -3.6000 },
  { id: 'bamako',      name: 'Bamako',      group: 4, lat: 12.6392, lng:  -8.0029 },
];

export const CONDITIONS = [
  { value: 'ensoleille',            label: 'Ensoleillé',     icon: '☀️' },
  { value: 'partiellement_nuageux', label: 'Part. nuageux',  icon: '🌤️' },
  { value: 'nuageux',               label: 'Nuageux',        icon: '☁️' },
  { value: 'pluvieux',              label: 'Pluvieux',       icon: '🌧️' },
  { value: 'orageux',               label: 'Orageux',        icon: '⛈️' },
  { value: 'couvert',               label: 'Couvert',        icon: '🌫️' },
];

export const DIRECTIONS_VENT = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

/* ── Vigilance severity levels ── */
export const VIGILANCE_NIVEAUX = [
  { value: 'pas_vigilance',  label: 'Pas de vigilance',     color: '#2fb84a', bg: '#dcfce7' },
  { value: 'attentifs',      label: 'Soyez attentifs',      color: '#ffe600', bg: '#fef9c3' },
  { value: 'tres_vigilants', label: 'Soyez très vigilants', color: '#f0a020', bg: '#ffedd5' },
  { value: 'absolue',        label: 'Vigilance absolue',    color: '#e60000', bg: '#fee2e2' },
];

/* ── Vigilance phenomenon types ── */
export const VIGILANCE_TYPES = [
  { value: 'aucun',       label: 'Aucun',          icon: '–'  },
  { value: 'orages',      label: 'Orages',          icon: '⛈️' },
  { value: 'canicule',    label: 'Canicule',        icon: '🔥' },
  { value: 'vent_fort',   label: 'Vents forts',     icon: '💨' },
  { value: 'poussiere',   label: 'Poussière/Brume', icon: '🌫️' },
  { value: 'fraicheur',   label: 'Fraîcheur',       icon: '❄️' },
  { value: 'pluies',      label: 'Pluies intenses', icon: '🌧️' },
  { value: 'inondations', label: 'Inondations',     icon: '🌊' },
  { value: 'secheresse',  label: 'Sécheresse',      icon: '🏜️' },
];

export const REGIONS_VIGILANCE = CITIES.map(c => c.name);

export function getInitialVilleData() {
  return CITIES.map(c => ({
    nom: c.name,
    tmax: null as number | null,
    tmin: null as number | null,
    directionVent: 'SO' as string | null,
    vitesseVent: null as number | null,
    condition: null as string | null,
  }));
}

export function getInitialVigilanceData() {
  return REGIONS_VIGILANCE.map(r => ({ region: r, niveau: 'pas_vigilance', type: 'aucun' }));
}

export function getTempColor(tmax: number | null): string {
  if (tmax === null) return '#94a3b8';
  if (tmax < 25) return '#3b82f6';
  if (tmax < 30) return '#10b981';
  if (tmax < 35) return '#f59e0b';
  if (tmax < 40) return '#f97316';
  return '#ef4444';
}

export function getVigilanceColor(niveau: string): string {
  return VIGILANCE_NIVEAUX.find(v => v.value === niveau)?.color || '#2fb84a';
}

export function getVigilanceTypeIcon(type: string): string {
  return VIGILANCE_TYPES.find(t => t.value === type)?.icon || '–';
}
