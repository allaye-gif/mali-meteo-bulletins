import { CITIES } from './constants';

export interface CityWeather {
  tmax: number;
  tmin: number;
  directionVent: string;   // e.g. "N", "NE", "SO"…
  vitesseVent: number;     // km/h
}

/** Convert meteorological wind direction (degrees, 0=N, 90=E, 180=S, 270=W) → French compass abbreviation */
function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const idx = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return dirs[idx];
}

export async function fetchMaliWeather(): Promise<Record<string, CityWeather>> {
  const lats = CITIES.map(c => c.lat).join(',');
  const lngs = CITIES.map(c => c.lng).join(',');

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats}&longitude=${lngs}` +
    `&daily=temperature_2m_max,temperature_2m_min,windspeed_10m_max,winddirection_10m_dominant` +
    `&timezone=Africa%2FAbidjan&forecast_days=1`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Weather API error: ' + resp.status);

  const raw = await resp.json();

  // Open-Meteo returns an array when multiple locations are requested
  const dataArr: any[] = Array.isArray(raw) ? raw : [raw];

  const result: Record<string, CityWeather> = {};
  CITIES.forEach((city, i) => {
    const d = dataArr[i];
    if (d?.daily) {
      const speedRaw  = d.daily.windspeed_10m_max?.[0];
      const dirRaw    = d.daily.winddirection_10m_dominant?.[0];
      result[city.name] = {
        tmax:          Math.round(d.daily.temperature_2m_max[0]),
        tmin:          Math.round(d.daily.temperature_2m_min[0]),
        vitesseVent:   speedRaw != null ? Math.round(speedRaw) : 0,
        directionVent: dirRaw  != null ? degreesToCompass(dirRaw) : 'N',
      };
    }
  });

  return result;
}
