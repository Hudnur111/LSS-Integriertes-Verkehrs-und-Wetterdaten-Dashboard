/**
 * Einsatz-Chronik & Replay ("Blackbox"). Zeichnet pro Einsatz eine Zeitreihe
 * von Snapshots auf (Position, Status) und erlaubt spätere Wiedergabe im
 * Zeitraffer. Läuft rein clientseitig (in-memory + optional localStorage),
 * unabhängig von der tatsächlichen Datenquelle (Mock oder Live-Adapter).
 */
(function (global) {
  'use strict';

  const bus = global.LSS_EVENT_BUS;
  const STORAGE_KEY = 'lss_blackbox_recordings';
  const MAX_RECORDINGS = 20;
  const MAX_FRAMES_PER_RECORDING = 200;

  class BlackboxRecorder {
    constructor() {
      this.recordings = new Map(); // incidentId -> { incident, frames: [] }
      this._wire();
    }

    _wire() {
      bus.on('game:incident:new', (incident) => {
        this.recordings.set(incident.id, {
          incident,
          frames: [{ t: Date.now(), lat: incident.lat, lon: incident.lon, event: 'started' }],
        });
      });

      bus.on('game:incident:update', (update) => {
        const rec = this.recordings.get(update.id);
        if (!rec) return;
        rec.frames.push({ t: Date.now(), ...update, event: 'update' });
        if (rec.frames.length > MAX_FRAMES_PER_RECORDING) rec.frames.shift();
      });

      bus.on('game:vehicle:position', (pos) => {
        if (!pos.incidentId) return;
        const rec = this.recordings.get(pos.incidentId);
        if (!rec) return;
        rec.frames.push({ t: Date.now(), lat: pos.lat, lon: pos.lon, event: 'vehicle', vehicleId: pos.id });
        if (rec.frames.length > MAX_FRAMES_PER_RECORDING) rec.frames.shift();
      });

      bus.on('game:incident:resolved', ({ id, resolvedAt }) => {
        const rec = this.recordings.get(id);
        if (!rec) return;
        rec.frames.push({ t: resolvedAt, event: 'resolved' });
        this._persist(rec);
      });
    }

    _persist(rec) {
      try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        all.unshift({ incident: rec.incident, frames: rec.frames });
        if (all.length > MAX_RECORDINGS) all.length = MAX_RECORDINGS;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch (e) {
        // localStorage voll/deaktiviert - Aufzeichnung bleibt nur im Speicher
      }
    }

    listFinished() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    }
  }

  class BlackboxPlayer {
    constructor(onFrame) {
      this.onFrame = onFrame;
      this.recording = null;
      this.index = 0;
      this.timer = null;
      this.speed = 4; // 4x Zeitraffer
    }

    load(recording) {
      this.stop();
      this.recording = recording;
      this.index = 0;
    }

    play() {
      if (!this.recording || this.timer) return;
      const frames = this.recording.frames;
      this.timer = setInterval(() => {
        if (this.index >= frames.length) {
          this.pause();
          return;
        }
        this.onFrame(frames[this.index], this.index, frames.length);
        this.index++;
      }, 300 / this.speed);
    }

    pause() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    }

    stop() {
      this.pause();
      this.index = 0;
    }

    seek(index) {
      if (!this.recording) return;
      this.index = Math.max(0, Math.min(this.recording.frames.length - 1, index));
      this.onFrame(this.recording.frames[this.index], this.index, this.recording.frames.length);
    }
  }

  global.LSS_BLACKBOX = { BlackboxRecorder, BlackboxPlayer };
})(window);
