/**
 * Hybrid-Cache: In-Memory-Layer (schnell, pro Tab) + sessionStorage-Layer
 * (überlebt Reloads innerhalb der Session). TTL-basiert, mit
 * Request-Deduplizierung: gleichzeitige Anfragen für denselben Key teilen
 * sich dasselbe In-Flight-Promise statt mehrfach zu fetchen.
 */
(function (global) {
  'use strict';

  const DEFAULT_TTL_MS = 20 * 60 * 1000; // 20 Minuten (innerhalb 15-30 Min Vorgabe)
  const STORAGE_PREFIX = 'lss_cache_';

  class HybridCache {
    constructor() {
      this.memory = new Map(); // key -> { value, expiresAt }
      this.inFlight = new Map(); // key -> Promise
    }

    _readSession(key) {
      try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
        if (!raw) return null;
        const entry = JSON.parse(raw);
        if (entry.expiresAt < Date.now()) {
          sessionStorage.removeItem(STORAGE_PREFIX + key);
          return null;
        }
        return entry;
      } catch (e) {
        return null;
      }
    }

    _writeSession(key, entry) {
      try {
        sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
      } catch (e) {
        // sessionStorage voll/deaktiviert - Memory-Cache bleibt trotzdem gültig
      }
    }

    get(key) {
      const mem = this.memory.get(key);
      if (mem && mem.expiresAt > Date.now()) return mem.value;
      if (mem) this.memory.delete(key);

      const fromSession = this._readSession(key);
      if (fromSession) {
        this.memory.set(key, fromSession);
        return fromSession.value;
      }
      return undefined;
    }

    set(key, value, ttlMs = DEFAULT_TTL_MS) {
      const entry = { value, expiresAt: Date.now() + ttlMs };
      this.memory.set(key, entry);
      this._writeSession(key, entry);
    }

    invalidate(key) {
      this.memory.delete(key);
      try {
        sessionStorage.removeItem(STORAGE_PREFIX + key);
      } catch (e) {
        /* ignore */
      }
    }

    /** Invalidiert alle Cache-Einträge, deren Key-Suffix "lat,lon" weiter als
     * thresholdKm vom neuen Standort entfernt ist. Erwartet Keys im Format
     * "prefix:LAT:LON" (siehe geoKey()). */
    invalidateFarFrom(lat, lon, thresholdKm = 5) {
      for (const key of this.memory.keys()) {
        const parsed = parseGeoKey(key);
        if (!parsed) continue;
        if (haversineKm(lat, lon, parsed.lat, parsed.lon) > thresholdKm) {
          this.invalidate(key);
        }
      }
    }

    /** Deduplizierter Fetch: läuft bereits eine Anfrage für denselben Key,
     * wird deren Promise zurückgegeben statt ein neues zu starten. */
    async getOrFetch(key, fetchFn, ttlMs = DEFAULT_TTL_MS) {
      const cached = this.get(key);
      if (cached !== undefined) return cached;

      if (this.inFlight.has(key)) return this.inFlight.get(key);

      const promise = (async () => {
        try {
          const value = await fetchFn();
          this.set(key, value, ttlMs);
          return value;
        } finally {
          this.inFlight.delete(key);
        }
      })();

      this.inFlight.set(key, promise);
      return promise;
    }
  }

  function geoKey(prefix, lat, lon) {
    return `${prefix}:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  }

  function parseGeoKey(key) {
    const parts = key.split(':');
    if (parts.length < 3) return null;
    const lat = parseFloat(parts[parts.length - 2]);
    const lon = parseFloat(parts[parts.length - 1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
    return { lat, lon };
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  global.LSS_CACHE = new HybridCache();
  global.LSS_CACHE_UTIL = { geoKey, haversineKm };
})(window);
