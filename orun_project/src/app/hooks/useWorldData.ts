// hooks/useWorldData.ts
// Live data for the WORLD space. Markets (AwesomeAPI) and weather (Open-Meteo)
// are fetched directly from the renderer (both send CORS *); news goes through
// the world:news IPC bridge because RSS feeds have no CORS.

import { useEffect, useState } from "react";
import { isElectron } from "../constants";

export interface MarketQuote {
  pair: string;
  price: number;
  changePercent: number;
}

export interface WeatherData {
  city: string;
  temperature: number | null;
  feelsLike: number | null;
  code: number | null;
  min: number | null;
  max: number | null;
}

export interface NewsItem {
  title: string;
  source: string;
  link: string;
  image?: string;
  publishedAt: number;
}

export interface VideoItem {
  title: string;
  source: string;
  link: string;
  image: string;
  publishedAt: number;
}

const MARKETS_URL = "https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

async function fetchJson(url: string, timeoutMs = 12000): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function usePolling(refresh: () => void, intervalMs: number) {
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function useMarketQuotes() {
  const [quotes, setQuotes] = useState<MarketQuote[] | null>(null);
  const [error, setError] = useState(false);

  const refresh = () => {
    fetchJson(MARKETS_URL)
      .then((data) => {
        const rows: MarketQuote[] = [];
        for (const key of ["USDBRL", "EURBRL", "BTCBRL"]) {
          const q = data[key] as { bid?: string; pctChange?: string } | undefined;
          if (!q?.bid) continue;
          rows.push({
            pair: key.replace("BRL", ""),
            price: parseFloat(q.bid),
            changePercent: parseFloat(q.pctChange || "0"),
          });
        }
        if (rows.length === 0) throw new Error("empty");
        setQuotes(rows);
        setError(false);
      })
      .catch(() => setError(true));
  };

  usePolling(refresh, 60_000);
  return { quotes, error };
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);

  const refresh = () => {
    (async () => {
      try {
        let city = "São Paulo";
        if (isElectron && window.orun.settings?.get) {
          const saved = await window.orun.settings.get<string>("weatherLocation");
          if (saved && saved.trim()) city = saved.trim();
        }
        const geo = await fetchJson(`${GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=pt&format=json`);
        const place = (geo.results as Array<{ latitude: number; longitude: number; name: string; admin1?: string; country?: string }> | undefined)?.[0];
        if (!place) throw new Error("geocode");
        const label = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
        const fc = await fetchJson(
          `${FORECAST_URL}?latitude=${place.latitude}&longitude=${place.longitude}` +
          `&current=temperature_2m,apparent_temperature,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`
        );
        const current = fc.current as Record<string, number | undefined> | undefined;
        const daily = fc.daily as Record<string, number[] | undefined> | undefined;
        if (!current) throw new Error("no-current");
        setWeather({
          city: label,
          temperature: current.temperature_2m ?? null,
          feelsLike: current.apparent_temperature ?? null,
          code: current.weather_code ?? null,
          min: daily?.temperature_2m_min?.[0] ?? null,
          max: daily?.temperature_2m_max?.[0] ?? null,
        });
        setError(false);
      } catch {
        setError(true);
      }
    })();
  };

  usePolling(refresh, 15 * 60_000);
  return { weather, error };
}

export function useWorldNews(limit = 24) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [error, setError] = useState(false);

  const refresh = () => {
    if (!isElectron || !window.orun.world?.news) { setError(true); return; }
    window.orun.world.news({ limit })
      .then((res) => {
        if (res.ok && res.items && res.items.length > 0) {
          setItems(res.items);
          setVideos(res.videos || []);
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true));
  };

  usePolling(refresh, 10 * 60_000);
  return { items, videos, error };
}
