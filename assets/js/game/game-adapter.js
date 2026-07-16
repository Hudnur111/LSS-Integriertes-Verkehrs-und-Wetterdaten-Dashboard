/**
 * GameDataAdapter-Interface: Jede Quelle für In-Game-Einsatz-/Fahrzeugdaten
 * implementiert dieselbe Schnittstelle. Der Rest des Systems (Karte, Ticker,
 * Isochronen, Blackbox) kennt nur den EventBus, nie die konkrete Quelle.
 *
 * Ein Adapter MUSS:
 *  - start(): void            – Datenerfassung beginnen
 *  - stop(): void             – Datenerfassung beenden, Timer aufräumen
 * Ein Adapter EMITTIERT (über LSS_EVENT_BUS):
 *  - 'game:incident:new'      { id, name, category, lat, lon, credits, requirements, poi, startedAt }
 *  - 'game:incident:update'   { id, ...Änderungen }
 *  - 'game:incident:resolved' { id, resolvedAt }
 *  - 'game:vehicle:position'  { id, lat, lon, status, incidentId, progress, blocked }
 *  - 'game:adapter:status'    { adapter, connected, message }
 *
 * Wetter-Kopplung (optional): liest global.LSS_WEATHER_COUPLING.current
 * (siehe weather-coupling.js), um Spawn-Rate und Einsatzart bei riskantem
 * Wetter (Glätte/Niederschlag) zu beeinflussen.
 */
(function (global) {
  'use strict';

  const bus = global.LSS_EVENT_BUS;

  // ---------------------------------------------------------------
  // MockGameAdapter
  // ---------------------------------------------------------------
  // Erzeugt realistische synthetische Einsätze aus der Einsatzliste
  // (missions-data.js), verteilt zufällig um ein Zentrum (z. B. die
  // aktuell gewählte Stadt). Damit ist das gesamte System sofort ohne
  // Spielzugriff demonstrierbar und testbar.
  class MockGameAdapter {
    constructor({ centerLat, centerLon, spawnIntervalMs = 15000, maxActive = 12 } = {}) {
      this.centerLat = centerLat;
      this.centerLon = centerLon;
      this.spawnIntervalMs = spawnIntervalMs;
      this.maxActive = maxActive;
      this.active = new Map();
      this.vehicles = new Map();
      this.timer = null;
      this.vehicleTimer = null;
      this.nextId = 1;
      this.nextVehicleId = 1;
    }

    setCenter(lat, lon) {
      this.centerLat = lat;
      this.centerLon = lon;
    }

    start() {
      bus.emit('game:adapter:status', { adapter: 'mock', connected: true, message: 'Mock-Datenquelle aktiv (synthetische Einsätze).' });
      this._spawnLoop();
      this.vehicleTimer = setInterval(() => this._tickVehicles(), 2000);
    }

    stop() {
      if (this.timer) clearTimeout(this.timer);
      if (this.vehicleTimer) clearInterval(this.vehicleTimer);
      this.timer = null;
      this.vehicleTimer = null;
      bus.emit('game:adapter:status', { adapter: 'mock', connected: false, message: 'Mock-Datenquelle gestoppt.' });
    }

    // Wetter-Kopplung: bei riskantem Wetter (Glätte/Niederschlag) spawnen
    // Einsätze häufiger und werden eher verkehrsbezogen ausgewählt.
    _weather() {
      return (global.LSS_WEATHER_COUPLING && global.LSS_WEATHER_COUPLING.current) || null;
    }

    _effectiveSpawnInterval() {
      const wc = this._weather();
      if (!wc || !wc.accidentBias) return this.spawnIntervalMs;
      return Math.max(6000, this.spawnIntervalMs / wc.accidentBias);
    }

    _pickMission(missions) {
      const wc = this._weather();
      if (wc && wc.accidentBias > 1 && Math.random() < 0.6) {
        const weatherRelated = missions.filter((m) => /unfall|Straße|Ölspur|Wasser|Baum/i.test(m.name));
        if (weatherRelated.length) return weatherRelated[Math.floor(Math.random() * weatherRelated.length)];
      }
      return missions[Math.floor(Math.random() * missions.length)];
    }

    _spawnLoop() {
      this._maybeSpawn();
      this._maybeResolve();
      this.timer = setTimeout(() => this._spawnLoop(), this._effectiveSpawnInterval());
    }

    _maybeSpawn() {
      if (this.active.size >= this.maxActive) return;
      const missions = global.LSS_MISSIONS || [];
      if (!missions.length) return;

      const template = this._pickMission(missions);
      const id = 'mock-' + this.nextId++;
      const offsetLat = (Math.random() - 0.5) * 0.12;
      const offsetLon = (Math.random() - 0.5) * 0.18;
      const incident = {
        id,
        name: template.name,
        category: template.category,
        poi: template.poi,
        credits: template.credits,
        requirements: template.requirements,
        lat: (this.centerLat || 52.52) + offsetLat,
        lon: (this.centerLon || 13.405) + offsetLon,
        startedAt: Date.now(),
      };
      this.active.set(id, incident);
      bus.emit('game:incident:new', incident);
      bus.emit('ticker:message', {
        text: `Neuer Einsatz: ${incident.name}${incident.poi ? ' – ' + incident.poi : ''}`,
        severity: incident.category === 'Feuerwehreinsätze' ? 'high' : 'normal',
      });
      this._spawnVehicleForIncident(incident);
    }

    _maybeResolve() {
      const now = Date.now();
      for (const [id, incident] of this.active) {
        const ageMs = now - incident.startedAt;
        // Einsätze mit mehr Credits "dauern" länger (grobe Heuristik)
        const lifespan = 45000 + Math.min(incident.credits || 500, 6000) * 20;
        if (ageMs > lifespan) {
          this.active.delete(id);
          bus.emit('game:incident:resolved', { id, resolvedAt: now });
          bus.emit('ticker:message', { text: `Einsatz beendet: ${incident.name}`, severity: 'low' });
        }
      }
    }

    // ---- Fahrzeug-/Routen-Simulation (mock) ----
    // Simuliert ein ausrückendes Fahrzeug von einem zufälligen Punkt in der
    // Nähe zum Einsatzort. Reale Fahrzeugpositionen aus dem Spiel würden hier
    // stattdessen 1:1 durchgereicht (siehe LssDomAdapter-TODO).
    _spawnVehicleForIncident(incident) {
      const angle = Math.random() * Math.PI * 2;
      const distanceDeg = 0.03 + Math.random() * 0.05; // grob 3-8 km
      const startLat = incident.lat + Math.sin(angle) * distanceDeg;
      const startLon = incident.lon + Math.cos(angle) * distanceDeg;
      const id = 'veh-' + this.nextVehicleId++;
      const totalSteps = 6 + Math.floor(Math.random() * 4);
      this.vehicles.set(id, {
        id,
        incidentId: incident.id,
        lat: startLat,
        lon: startLon,
        startLat,
        startLon,
        targetLat: incident.lat,
        targetLon: incident.lon,
        totalSteps,
        stepIndex: 0,
      });
      bus.emit('game:vehicle:position', { id, lat: startLat, lon: startLon, status: 'ausgerückt', incidentId: incident.id, progress: 0 });
      bus.emit('ticker:message', { text: `Status 3: Fahrzeug ${id} ausgerückt zu „${incident.name}“`, severity: 'low' });
    }

    _tickVehicles() {
      const util = global.LSS_CACHE_UTIL;
      for (const [id, v] of this.vehicles) {
        if (v.stepIndex >= v.totalSteps) {
          this.vehicles.delete(id);
          continue;
        }
        v.stepIndex++;
        const t = v.stepIndex / v.totalSteps;
        v.lat = v.startLat + (v.targetLat - v.startLat) * t;
        v.lon = v.startLon + (v.targetLon - v.startLon) * t;

        // Stau-Heuristik: "blockiert", wenn die Route nah an einem anderen
        // aktiven Einsatz vorbeiführt.
        const blocked = Array.from(this.active.values()).some(
          (inc) => inc.id !== v.incidentId && util && util.haversineKm(v.lat, v.lon, inc.lat, inc.lon) < 1.5
        );

        bus.emit('game:vehicle:position', {
          id,
          lat: v.lat,
          lon: v.lon,
          status: t >= 1 ? 'am Einsatzort' : 'Anfahrt',
          incidentId: v.incidentId,
          progress: t,
          blocked,
        });

        if (t >= 1) {
          bus.emit('ticker:message', { text: `Status 4: Fahrzeug ${id} am Einsatzort`, severity: 'low' });
          this.vehicles.delete(id);
        }
      }
    }
  }

  // ---------------------------------------------------------------
  // LssDomAdapter (PLATZHALTER – noch nicht funktionsfähig)
  // ---------------------------------------------------------------
  // Diese Klasse soll später echte In-Game-Daten liefern, indem sie die
  // vom Spiel selbst gerenderten Seiten (Einsatzliste, Fahrzeugübersicht,
  // Kartenmarker) direkt aus dem DOM ausliest – Leitstellenspiel bietet
  // keine öffentliche API/WebSocket dafür.
  //
  // TODO, bevor dieser Adapter funktioniert:
  //   1. Echte CSS-Selektoren für die Einsatzliste ermitteln (z. B. Tabellen-
  //      zeilen mit Einsatz-ID, Name, Koordinaten/Adresse).
  //   2. Echte Selektoren für die Fahrzeugübersicht (Status, Zielkoordinaten).
  //   3. Prüfen, ob das Spiel Koordinaten überhaupt im DOM offenlegt oder nur
  //      Adressen (dann wäre zusätzlich Geocoding nötig).
  //   4. MutationObserver auf die entsprechenden Container registrieren, um
  //      Änderungen (neuer Einsatz, Fahrzeug bewegt) ohne Polling zu erkennen.
  //
  // Diese Informationen können nur durch Inspektion der echten Live-Seite
  // gewonnen werden (z. B. per Browser-DevTools durch den Nutzer, oder in
  // einer Session mit Internetzugriff auf leitstellenspiel.de).
  class LssDomAdapter {
    constructor() {
      this.observer = null;
    }

    start() {
      bus.emit('game:adapter:status', {
        adapter: 'lss-dom',
        connected: false,
        message: 'LssDomAdapter ist noch nicht konfiguriert (siehe TODO in game-adapter.js).',
      });
      console.warn(
        '[LssDomAdapter] Nicht implementiert: Es fehlen die echten DOM-Selektoren der ' +
        'Leitstellenspiel-Seiten. Siehe Kommentar-Block über dieser Klasse.'
      );
    }

    stop() {
      if (this.observer) this.observer.disconnect();
      this.observer = null;
    }
  }

  global.LSS_GAME_ADAPTERS = { MockGameAdapter, LssDomAdapter };
})(window);
