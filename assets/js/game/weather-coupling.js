/**
 * In-Game-Wetter-Kopplung: liest echte Wetterdaten (Open-Meteo, kostenlos,
 * ohne API-Key – dieselbe Quelle wie im Haupt-Dashboard) und leitet daraus
 * einen "Risiko-Modifikator" ab, den der GameDataAdapter (siehe
 * game-adapter.js) nutzt, um bei Regen/Glätte häufiger und eher
 * verkehrsbezogene Einsätze zu erzeugen sowie Isochronen zu verkürzen.
 */
(function (global) {
  'use strict';

  const cache = global.LSS_CACHE;
  const bus = global.LSS_EVENT_BUS;

  const RISKY_CODES = [51, 53, 55, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];

  class WeatherCoupling {
    constructor() {
      this.current = null;
    }

    async refresh(lat, lon) {
      try {
        const data = await cache.getOrFetch(
          global.LSS_CACHE_UTIL.geoKey('weathercoupling', lat, lon),
          async () => {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weather_code,wind_speed_10m`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Wetter-API antwortete mit ' + res.status);
            return res.json();
          },
          15 * 60 * 1000
        );

        const c = data.current;
        const risky = RISKY_CODES.includes(c.weather_code);
        const icy = c.temperature_2m <= 2 && risky;

        this.current = {
          weatherCode: c.weather_code,
          tempNow: c.temperature_2m,
          windSpeed: c.wind_speed_10m,
          precipitation: c.precipitation,
          accidentBias: icy ? 2.2 : risky ? 1.5 : 1,
          congestionPenalty: icy ? 0.3 : risky ? 0.15 : 0,
          label: icy ? 'Glätte-Risiko' : risky ? 'Niederschlag' : 'Normal',
        };
      } catch (err) {
        console.error('[WeatherCoupling] Konnte Wetterdaten nicht laden:', err);
        this.current = null;
      }
      bus.emit('weather:coupling:update', this.current);
      return this.current;
    }
  }

  global.LSS_WEATHER_COUPLING = new WeatherCoupling();
})(window);
