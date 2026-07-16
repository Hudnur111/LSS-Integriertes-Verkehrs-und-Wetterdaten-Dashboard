/**
 * Karten-Layer-Erweiterungen: Niederschlagsradar (RainViewer, kostenlos/ohne
 * Key), Einsatz-Marker-Clustering und Heatmap. Baut auf Leaflet + den
 * Plugins Leaflet.markercluster und Leaflet.heat auf (via CDN eingebunden).
 */
(function (global) {
  'use strict';

  const bus = global.LSS_EVENT_BUS;
  const cache = global.LSS_CACHE;

  class RadarLayer {
    constructor(map) {
      this.map = map;
      this.frames = [];
      this.currentFrameIndex = 0;
      this.tileLayer = null;
      this.visible = false;
    }

    async load() {
      const data = await cache.getOrFetch(
        'rainviewer:frames',
        async () => {
          const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
          if (!res.ok) throw new Error('RainViewer antwortete mit ' + res.status);
          return res.json();
        },
        10 * 60 * 1000 // Radar-Frames alle 10 Minuten neu laden
      );

      const past = (data.radar && data.radar.past) || [];
      const nowcast = (data.radar && data.radar.nowcast) || [];
      this.frames = [...past, ...nowcast];
      this.host = data.host || 'https://tilecache.rainviewer.com';
      this.currentFrameIndex = past.length ? past.length - 1 : 0;
    }

    show() {
      this.visible = true;
      this._renderFrame();
    }

    hide() {
      this.visible = false;
      if (this.tileLayer) {
        this.map.removeLayer(this.tileLayer);
        this.tileLayer = null;
      }
    }

    setFrame(index) {
      this.currentFrameIndex = Math.max(0, Math.min(this.frames.length - 1, index));
      if (this.visible) this._renderFrame();
    }

    _renderFrame() {
      if (this.tileLayer) this.map.removeLayer(this.tileLayer);
      const frame = this.frames[this.currentFrameIndex];
      if (!frame) return;
      this.tileLayer = L.tileLayer(`${this.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.55,
        zIndex: 5,
      }).addTo(this.map);
    }

    getFrameLabel(index) {
      const frame = this.frames[index];
      if (!frame) return '';
      return new Date(frame.time * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }
  }

  class IncidentLayer {
    constructor(map) {
      this.map = map;
      this.markers = new Map(); // id -> marker
      this.clusterGroup = typeof L.markerClusterGroup === 'function' ? L.markerClusterGroup() : null;
      this.heatLayer = typeof L.heatLayer === 'function' ? L.heatLayer([], { radius: 30, blur: 20 }) : null;
      this.mode = 'markers'; // 'markers' | 'heatmap'
      this.clusterGroup && this.map.addLayer(this.clusterGroup);
    }

    _icon(category) {
      const style = (global.LSS_CATEGORY_STYLE && global.LSS_CATEGORY_STYLE[category]) || { color: '#6b7280', icon: '❓' };
      return L.divIcon({
        className: '',
        html: `<div style="background:${style.color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);">
                 <span style="transform:rotate(45deg);font-size:14px;">${style.icon}</span>
               </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });
    }

    addIncident(incident) {
      const marker = L.marker([incident.lat, incident.lon], { icon: this._icon(incident.category) });
      const reqText = (incident.requirements || [])
        .map((r) => `${r.count}× ${r.type}`)
        .join(', ');
      marker.bindPopup(
        `<strong>${incident.name}</strong><br>${incident.poi ? incident.poi + '<br>' : ''}` +
        `${incident.credits ? incident.credits + ' Credits<br>' : ''}${reqText}`
      );
      this.markers.set(incident.id, { marker, incident });
      this._syncLayer();
    }

    removeIncident(id) {
      const entry = this.markers.get(id);
      if (!entry) return;
      this.markers.delete(id);
      this._syncLayer();
    }

    setMode(mode) {
      this.mode = mode;
      this._syncLayer();
    }

    _syncLayer() {
      if (this.clusterGroup) this.clusterGroup.clearLayers();
      if (this.heatLayer) this.heatLayer.setLatLngs([]);
      if (this.mode === 'heatmap' && this.heatLayer) {
        if (!this.map.hasLayer(this.heatLayer)) this.map.addLayer(this.heatLayer);
        if (this.clusterGroup && this.map.hasLayer(this.clusterGroup)) this.map.removeLayer(this.clusterGroup);
        this.heatLayer.setLatLngs(
          Array.from(this.markers.values()).map((e) => [e.incident.lat, e.incident.lon, 0.6])
        );
      } else {
        if (this.heatLayer && this.map.hasLayer(this.heatLayer)) this.map.removeLayer(this.heatLayer);
        if (this.clusterGroup) {
          if (!this.map.hasLayer(this.clusterGroup)) this.map.addLayer(this.clusterGroup);
          Array.from(this.markers.values()).forEach((e) => this.clusterGroup.addLayer(e.marker));
        }
      }
    }
  }

  function wireIncidentLayerToBus(incidentLayer) {
    bus.on('game:incident:new', (incident) => incidentLayer.addIncident(incident));
    bus.on('game:incident:resolved', ({ id }) => incidentLayer.removeIncident(id));
  }

  // ---------------------------------------------------------------
  // VehicleLayer – zeichnet Anfahrtsrouten ausrückender Fahrzeuge.
  // Blockierte/verzögerte Abschnitte (siehe "blocked"-Flag der Adapter)
  // werden rot hervorgehoben statt in der normalen Routenfarbe.
  // ---------------------------------------------------------------
  class VehicleLayer {
    constructor(map) {
      this.map = map;
      this.vehicles = new Map(); // id -> { marker, path: LatLng[], segments: Polyline[] }
    }

    _vehicleIcon(blocked) {
      return L.divIcon({
        className: '',
        html: `<div style="background:${blocked ? '#dc2626' : '#2563eb'};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
        iconSize: [14, 14],
      });
    }

    updatePosition({ id, lat, lon, blocked, incidentId }) {
      let entry = this.vehicles.get(id);
      if (!entry) {
        entry = { marker: L.marker([lat, lon], { icon: this._vehicleIcon(blocked) }).addTo(this.map), path: [[lat, lon]], segments: [], incidentId };
        this.vehicles.set(id, entry);
        return;
      }
      const prev = entry.path[entry.path.length - 1];
      entry.path.push([lat, lon]);
      entry.marker.setLatLng([lat, lon]);
      entry.marker.setIcon(this._vehicleIcon(blocked));
      const segment = L.polyline([prev, [lat, lon]], {
        color: blocked ? '#dc2626' : '#2563eb',
        weight: blocked ? 4 : 3,
        opacity: 0.8,
        dashArray: blocked ? '4 4' : null,
      }).addTo(this.map);
      entry.segments.push(segment);
    }

    removeVehicle(id) {
      const entry = this.vehicles.get(id);
      if (!entry) return;
      this.map.removeLayer(entry.marker);
      entry.segments.forEach((s) => this.map.removeLayer(s));
      this.vehicles.delete(id);
    }

    /** Entfernt alle Fahrzeuge, die zu einem beendeten Einsatz gehören. */
    removeByIncident(incidentId) {
      for (const [id, entry] of this.vehicles) {
        if (entry.incidentId === incidentId) this.removeVehicle(id);
      }
    }
  }

  function wireVehicleLayerToBus(vehicleLayer) {
    bus.on('game:vehicle:position', (pos) => {
      vehicleLayer.updatePosition(pos);
      if (pos.progress >= 1) {
        setTimeout(() => vehicleLayer.removeVehicle(pos.id), 3000);
      }
    });
    bus.on('game:incident:resolved', ({ id }) => vehicleLayer.removeByIncident(id));
  }

  global.LSS_MAP_LAYERS = { RadarLayer, IncidentLayer, VehicleLayer, wireIncidentLayerToBus, wireVehicleLayerToBus };
})(window);
