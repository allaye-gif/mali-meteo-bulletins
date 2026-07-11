import { CITIES } from './constants';

export interface CityWeather {
  tmax: number;
  tmin: number;
}

export async function fetchMaliWeather(): Promise<Record<string, CityWeather>> {
  const lats = CITIES.map(c => c.lat).join(',');
  const lngs = CITIES.map(c => c.lng).join(',');

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lats}&longitude=${lngs}` +
    `&daily=temperature_2m_max,temperature_2m_min` +
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
      result[city.name] = {
        tmax: Math.round(d.daily.temperature_2m_max[0]),
        tmin: Math.round(d.daily.temperature_2m_min[0]),
      };
    }
  });

  return result;
}
