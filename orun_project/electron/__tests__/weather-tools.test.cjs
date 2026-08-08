// electron/__tests__/weather-tools.test.cjs
const http = require("http");
const weather = require("../weather-tools.cjs");

async function startServer(handler) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
}

describe("weather-tools.cjs", () => {
  afterEach(() => weather.setBases("https://api.open-meteo.com/v1", "https://geocoding-api.open-meteo.com/v1"));

  it("exige o parâmetro location", async () => {
    const res = await weather.getWeather({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain("location");
  });

  it("resolve a cidade e retorna clima atual + previsão", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url.includes("/search")) {
        res.end(JSON.stringify({
          results: [{ name: "São Paulo", latitude: -23.55, longitude: -46.63, admin1: "São Paulo", country: "Brasil" }],
        }));
      } else {
        res.end(JSON.stringify({
          current: { temperature_2m: 22.5, apparent_temperature: 21, relative_humidity_2m: 65, weather_code: 2, wind_speed_10m: 12 },
          daily: {
            time: ["2026-08-07"],
            weather_code: [2],
            temperature_2m_max: [26],
            temperature_2m_min: [18],
            precipitation_probability_max: [30],
            sunrise: ["06:30"],
            sunset: ["17:45"],
          },
        }));
      }
    });
    try {
      weather.setBases(base, base);
      const res = await weather.getWeather({ location: "São Paulo", days: 1 });
      expect(res.ok).toBe(true);
      expect(res.location).toContain("São Paulo");
      expect(res.current.temperature).toBe(22.5);
      expect(res.current.weather).toBe("Parcialmente nublado");
      expect(res.forecast).toHaveLength(1);
      expect(res.forecast[0].max).toBe(26);
    } finally {
      server.close();
    }
  });

  it("aceita unidades imperial (fahrenheit)", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url.includes("/search")) {
        res.end(JSON.stringify({ results: [{ name: "Rio de Janeiro", latitude: -22.9, longitude: -43.2, country: "Brasil" }] }));
      } else {
        res.end(JSON.stringify({
          current: { temperature_2m: 70 },
          daily: { time: ["2026-08-07"], weather_code: [1], temperature_2m_max: [75], temperature_2m_min: [65], precipitation_probability_max: [10] },
        }));
      }
    });
    try {
      weather.setBases(base, base);
      const res = await weather.getWeather({ location: "Rio de Janeiro", units: "imperial" });
      expect(res.ok).toBe(true);
      expect(res.units).toBe("imperial");
      expect(res.current.temperature).toBe(70);
    } finally {
      server.close();
    }
  });

  it("clampa forecast_days entre 1 e 7", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      if (req.url.includes("/search")) {
        res.end(JSON.stringify({ results: [{ name: "Belo Horizonte", latitude: -19.9, longitude: -43.9, country: "Brasil" }] }));
      } else {
        const n = Number(new URL(req.url, base).searchParams.get("forecast_days"));
        res.end(JSON.stringify({
          current: {},
          daily: { time: Array.from({ length: n }, (_, i) => `2026-08-${String(i + 1).padStart(2, "0")}`), weather_code: Array(n).fill(0) },
        }));
      }
    });
    try {
      weather.setBases(base, base);
      const res = await weather.getWeather({ location: "BH", days: 999 });
      expect(res.ok).toBe(true);
      expect(res.forecast).toHaveLength(7);
    } finally {
      server.close();
    }
  });

  it("retorna erro quando a cidade não é encontrada", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ results: [] }));
    });
    try {
      weather.setBases(base, base);
      const res = await weather.getWeather({ location: "Atlantis" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("Não encontrei");
    } finally {
      server.close();
    }
  });

  it("trata erro HTTP do servidor de clima", async () => {
    const { server, base } = await startServer((req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "boom" }));
    });
    try {
      weather.setBases(base, base);
      const res = await weather.getWeather({ location: "São Paulo" });
      expect(res.ok).toBe(false);
      expect(res.error).toContain("indisponível");
    } finally {
      server.close();
    }
  });
});
