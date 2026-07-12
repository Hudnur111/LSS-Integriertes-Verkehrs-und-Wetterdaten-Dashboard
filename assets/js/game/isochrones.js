/**
 * Dynamische Ausrück-Radien ("Isochronen").
 *
 * Hinweis zur Genauigkeit: Ohne Routing-Engine (z. B. OpenRouteService,
 * benötigt einen API-Key -> müsste wie beim Verkehrs-Proxy serverseitig
 * gekapselt werden) sind echte straßennetzbasierte Isochronen nicht seriös
 * umsetzbar. Diese Implementierung zeichnet daher konzentrische Ringe für
 * 3/5/8 Minuten auf Basis einer angenommenen Durchschnittsgeschwindigkeit,
 * reduziert um einen Abschlag für nahe gemeldete Einsätze (als Näherung für
 * "Sperrungen/Staus"). Klar als Näherung gekennzeichnet, keine echte
 * Straßennetz-Berechnung.
 */
(function (global) {
  'use strict';

  const AVG_SPEED_KMH = 45; // Grobe Annahme für innerstädtische Anfahrt
  const RING_MINUTES = [3, 5, 8];

  class IsochroneLayer {
    constructor(map) {
      this.map = map;
      this.circles = [];
    }

    clear() {
      this.circles.forEach((c) => this.map.removeLayer(c));
      this.circles = [];
    }

    /**
     * @param {number} lat - Standort der Wache
     * @param {number} lon
     * @param {Array} nearbyIncidents - aktive Einsätze in der Nähe (zur Abschlagsberechnung)
     */
    render(lat, lon, nearbyIncidents = []) {
      this.clear();
      const congestionPenalty = Math.min(0.5, nearbyIncidents.length * 0.08); // bis zu -50% Reichweite

      RING_MINUTES.forEach((minutes, i) => {
        const effectiveSpeed = AVG_SPEED_KMH * (1 - congestionPenalty);
        const radiusKm = (effectiveSpeed * (minutes / 60));
        const colors = ['#22c55e', '#eab308', '#dc2626'];
        const circle = L.circle([lat, lon], {
          radius: radiusKm * 1000,
          color: colors[i],
          weight: 2,
          fillOpacity: 0.08,
        }).addTo(this.map);
        circle.bindTooltip(`~${minutes} Min. Erreichbarkeit (Näherungswert)`, { sticky: true });
        this.circles.push(circle);
      });
    }
  }

  global.LSS_ISOCHRONES = { IsochroneLayer };
})(window);
