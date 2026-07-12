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
 *  - 'game:vehicle:position'  { id, lat, lon, status, incidentId }
 *  - 'game:adapter:status'    { adapter, connected, message }
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
      this.timer = null;
      this.nextId = 1;
    }

    setCenter(lat, lon) {
      this.centerLat = lat;
      this.centerLon = lon;
    }

    start() {
      bus.emit('game:adapter:status', { adapter: 'mock', connected: true, message: 'Mock-Datenquelle aktiv (synthetische Einsätze).' });
      this._spawnLoop();
    }

    stop() {
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
      bus.emit('game:adapter:status', { adapter: 'mock', connected: false, message: 'Mock-Datenquelle gestoppt.' });
    }

    _spawnLoop() {
      this._maybeSpawn();
      this._maybeResolve();
      this.timer = setTimeout(() => this._spawnLoop(), this.spawnIntervalMs);
    }

    _maybeSpawn() {
      if (this.active.size >= this.maxActive) return;
      const missions = global.LSS_MISSIONS || [];
      if (!missions.length) return;

      const template = missions[Math.floor(Math.random() * missions.length)];
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
