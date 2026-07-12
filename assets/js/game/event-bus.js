/**
 * Zentraler Event-Bus zur Entkopplung von Spiel-Events, Karten-Rendering und API-Calls.
 * Module kommunizieren ausschließlich über Events, nicht über direkte Funktionsaufrufe.
 */
(function (global) {
  'use strict';

  class EventBus {
    constructor() {
      this.listeners = new Map();
    }

    on(event, handler) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(handler);
      return () => this.off(event, handler);
    }

    off(event, handler) {
      const set = this.listeners.get(event);
      if (set) set.delete(handler);
    }

    emit(event, payload) {
      const set = this.listeners.get(event);
      if (!set) return;
      set.forEach((handler) => {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[EventBus] Fehler in Handler für "${event}":`, err);
        }
      });
    }
  }

  // Bekannte Event-Namen (lose Konvention, kein Enforcement):
  //   game:incident:new       { id, name, category, lat, lon, credits, requirements, poi, startedAt }
  //   game:incident:update    { id, ...änderungen }
  //   game:incident:resolved  { id, resolvedAt }
  //   game:vehicle:position   { id, lat, lon, status, incidentId }
  //   game:adapter:status     { adapter, connected, message }
  //   ticker:message          { text, severity }
  //   map:view:change         { lat, lon, zoom }

  global.LSS_EVENT_BUS = new EventBus();
})(window);
