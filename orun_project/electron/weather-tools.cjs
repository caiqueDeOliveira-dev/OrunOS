// electron/weather-tools.cjs
//
// get_weather tool — Open-Meteo (free, no API key). Pure Node, no electron
// imports → testable via vitest. Exposes setBases() as a test hook.
//
// Docs: https://open-meteo.com/en/docs / https://open-meteo.com/en/docs/geocoding-api

let apiBase = "https://api.open-meteo.com/v1";
let geocodeBase = "https://geocoding-api.open-meteo.com/v1";

function setBases(api, geo) {
  if (api) apiBase = String(api).replace(/\/+$/, "");
  if (geo) geocodeBase = String(geo).replace(/\/+$/, "");
}

async function getJson(url) {
  let timer;
  try {
    const res = await Promise.race([
      fetch(url, { headers: { "User-Agent": "Orun-OS/0.6.6" } }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Requisição de clima expirou")), 15000); }),
    ]);
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    return await res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function geocode(location) {
  const url = `${geocodeBase}/search?name=${encodeURIComponent(location)}&count=1&language=pt&format=json`;
  const data = await getJson(url);
  const top = data.results && data.results[0];
  if (!top) return null;
  const region = top.admin1 && top.admin1 !== top.name ? `, ${top.admin1}` : "";
  return {
    name: `${top.name}${region}${top.country ? `, ${top.country}` : ""}`,
    latitude: top.latitude,
    longitude: top.longitude,
  };
}

// WMO weather interpretation codes → pt-BR description.
const WMO = {
  0: "Céu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Nevoeiro",
  48: "Nevoeiro com geada",
  51: "Garoa leve",
  53: "Garoa",
  55: "Garoa intensa",
  56: "Garoa congelante leve",
  57: "Garoa congelante",
  61: "Chuva leve",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante leve",
  67: "Chuva congelante",
  71: "Neve leve",
  73: "Neve moderada",
  75: "Neve forte",
  77: "Grãos de neve",
  80: "Pancadas leves",
  81: "Pancadas moderadas",
  82: "Pancadas fortes",
  85: "Pancadas de neve leves",
  86: "Pancadas de neve fortes",
  95: "Trovoada",
  96: "Trovoada com granizo leve",
  99: "Trovoada com granizo forte",
};

function codeText(code) {
  return WMO[code] || `Código ${code}`;
}

/**
 * Current weather + forecast for a city (Open-Meteo, no key).
 * @param {{location: string, days?: number, units?: string}} args
 */
async function getWeather({ location, days = 3, units = "metric" }) {
  if (!location || typeof location !== "string" || !location.trim()) {
    return { ok: false, error: "Parâmetro 'location' é obrigatório (cidade, ex.: 'São Paulo')." };
  }
  const imperial = String(units).toLowerCase() === "imperial";
  const n = Math.min(Math.max(1, Number(days) || 1), 7);

  let place;
  try {
    place = await geocode(location);
  } catch (e) {
    return { ok: false, error: `Clima indisponível: ${e.message}` };
  }
  if (!place) {
    return { ok: false, error: `Não encontrei a localização "${location}". Tente outro nome de cidade.` };
  }

  const url = `${apiBase}/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset` +
    `&timezone=auto&forecast_days=${n}` +
    `&temperature_unit=${imperial ? "fahrenheit" : "celsius"}&wind_speed_unit=${imperial ? "mph" : "kmh"}`;

  let data;
  try {
    data = await getJson(url);
  } catch (e) {
    return { ok: false, error: `Clima indisponível: ${e.message}` };
  }

  const current = data.current || {};
  const daily = data.daily || {};
  const times = daily.time || [];
  const forecast = times.map((date, i) => ({
    date,
    weather: codeText(daily.weather_code?.[i]),
    min: daily.temperature_2m_min?.[i] ?? null,
    max: daily.temperature_2m_max?.[i] ?? null,
    precipitationChance: daily.precipitation_probability_max?.[i] ?? null,
    sunrise: daily.sunrise?.[i] || null,
    sunset: daily.sunset?.[i] || null,
  }));

  return {
    ok: true,
    location: place.name,
    coordinates: { latitude: place.latitude, longitude: place.longitude },
    units: imperial ? "imperial" : "metric",
    current: {
      temperature: current.temperature_2m ?? null,
      feelsLike: current.apparent_temperature ?? null,
      humidity: current.relative_humidity_2m ?? null,
      windSpeed: current.wind_speed_10m ?? null,
      weather: codeText(current.weather_code),
    },
    forecast,
  };
}

module.exports = { getWeather, geocode, setBases };
