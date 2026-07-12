/**
 * Verdrahtet alle Module (Event-Bus, Cache, Adapter, Karten-Layer,
 * Isochronen, URL-Sync, Ticker, Blackbox) zur Live-Einsatzkarte.
 */
(function () {
  'use strict';

  const bus = window.LSS_EVENT_BUS;

  const CITIES = {
    'Berlin': { lat: 52.5200, lon: 13.4050 },
    'Hamburg': { lat: 53.5511, lon: 9.9937 },
    'München': { lat: 48.1351, lon: 11.5820 },
    'Köln': { lat: 50.9375, lon: 6.9603 },
    'Frankfurt am Main': { lat: 50.1109, lon: 8.6821 },
    'Stuttgart': { lat: 48.7758, lon: 9.1829 },
  };

  const state = {
    activeIncidents: new Map(),
    layers: new Set(['cluster']),
  };

  function qs(sel) {
    return document.querySelector(sel);
  }

  if (typeof L === 'undefined') {
    const el = qs('#game-map');
    if (el) {
      el.innerHTML =
        '<div class="flex items-center justify-center h-full text-gray-500 p-6 text-center">' +
        'Karte konnte nicht geladen werden (Leaflet nicht verfügbar). ' +
        'Bitte Internetverbindung/CDN-Zugriff prüfen und Seite neu laden.</div>';
    }
    console.error('[LSS Live-Einsatzkarte] Leaflet (L) ist nicht verfügbar – Abbruch der Initialisierung.');
    return;
  }

  // ---------- Karte initialisieren ----------
  const map = L.map('game-map');
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap-Mitwirkende',
    maxZoom: 18,
  }).addTo(map);

  const urlSync = new window.LSS_URL_SYNC.UrlSync(map);
  const initialView = urlSync.restoreFromUrl({ lat: CITIES.Berlin.lat, lon: CITIES.Berlin.lon, zoom: 12 });
  if (initialView.layers.length) state.layers = new Set(initialView.layers);

  urlSync.bind(() => ({ layers: Array.from(state.layers) }));

  // ---------- Stadtauswahl ----------
  const citySelect = qs('#city-select');
  Object.keys(CITIES).forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    citySelect.appendChild(opt);
  });
  citySelect.addEventListener('change', () => {
    const city = CITIES[citySelect.value];
    if (!city) return;
    map.setView([city.lat, city.lon], 12);
    adapter.setCenter(city.lat, city.lon);
    renderStationMarkers(city.lat, city.lon);
  });

  // ---------- Mock-Adapter starten ----------
  const adapter = new window.LSS_GAME_ADAPTERS.MockGameAdapter({
    centerLat: initialView.lat,
    centerLon: initialView.lon,
  });
  adapter.start();

  bus.on('game:adapter:status', ({ connected, message }) => {
    const el = qs('#adapter-status');
    el.textContent = message;
    el.classList.toggle('bg-green-100', connected);
    el.classList.toggle('text-green-700', connected);
  });

  // ---------- Einsatz-Layer (Cluster/Heatmap) ----------
  const incidentLayer = new window.LSS_MAP_LAYERS.IncidentLayer(map);
  window.LSS_MAP_LAYERS.wireIncidentLayerToBus(incidentLayer);
  incidentLayer.setMode(state.layers.has('heatmap') ? 'heatmap' : 'markers');

  qs('#mode-cluster-btn').addEventListener('click', () => {
    state.layers.delete('heatmap');
    state.layers.add('cluster');
    incidentLayer.setMode('markers');
    updateModeButtons();
  });
  qs('#mode-heatmap-btn').addEventListener('click', () => {
    state.layers.delete('cluster');
    state.layers.add('heatmap');
    incidentLayer.setMode('heatmap');
    updateModeButtons();
  });
  function updateModeButtons() {
    const clusterActive = state.layers.has('cluster');
    qs('#mode-cluster-btn').className = `px-3 py-1 rounded-lg ${clusterActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`;
    qs('#mode-heatmap-btn').className = `px-3 py-1 rounded-lg ${!clusterActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`;
  }
  updateModeButtons();

  // ---------- Regenradar (RainViewer) ----------
  const radarLayer = new window.LSS_MAP_LAYERS.RadarLayer(map);
  let radarLoaded = false;
  qs('#radar-toggle-btn').addEventListener('click', async () => {
    if (!radarLoaded) {
      qs('#radar-toggle-btn').textContent = '🌧️ Lade...';
      try {
        await radarLayer.load();
        radarLoaded = true;
        const slider = qs('#radar-slider');
        slider.max = radarLayer.frames.length - 1;
        slider.value = radarLayer.currentFrameIndex;
        qs('#radar-time-label').textContent = radarLayer.getFrameLabel(radarLayer.currentFrameIndex);
      } catch (err) {
        console.error(err);
        qs('#radar-toggle-btn').textContent = '🌧️ Regenradar (Fehler)';
        return;
      }
    }
    const showing = !radarLayer.visible;
    if (showing) {
      radarLayer.show();
      state.layers.add('radar');
      qs('#radar-controls').classList.remove('hidden');
      qs('#radar-toggle-btn').textContent = '🌧️ Regenradar (an)';
    } else {
      radarLayer.hide();
      state.layers.delete('radar');
      qs('#radar-controls').classList.add('hidden');
      qs('#radar-toggle-btn').textContent = '🌧️ Regenradar';
    }
  });
  qs('#radar-slider').addEventListener('input', (e) => {
    const idx = parseInt(e.target.value, 10);
    radarLayer.setFrame(idx);
    qs('#radar-time-label').textContent = radarLayer.getFrameLabel(idx);
  });

  // ---------- Ticker ----------
  new window.LSS_TICKER.Ticker(qs('#ticker-track'));

  // ---------- Sidebar: aktive Einsätze ----------
  bus.on('game:incident:new', (incident) => {
    state.activeIncidents.set(incident.id, incident);
    renderIncidentList();
  });
  bus.on('game:incident:resolved', ({ id }) => {
    state.activeIncidents.delete(id);
    renderIncidentList();
  });

  function renderIncidentList() {
    const el = qs('#incident-list');
    const items = Array.from(state.activeIncidents.values());
    if (!items.length) {
      el.innerHTML = '<p class="text-gray-400">Keine aktiven Einsätze.</p>';
      return;
    }
    const style = window.LSS_CATEGORY_STYLE || {};
    el.innerHTML = items
      .map((inc) => {
        const s = style[inc.category] || { color: '#6b7280', icon: '❓' };
        return `
          <div class="p-2 rounded-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
               data-lat="${inc.lat}" data-lon="${inc.lon}">
            <div class="flex items-center justify-between">
              <span style="color:${s.color}">${s.icon} ${inc.name}</span>
              <span class="text-xs text-gray-400">${inc.credits || ''}</span>
            </div>
            ${inc.poi ? `<div class="text-xs text-gray-400">${inc.poi}</div>` : ''}
          </div>
        `;
      })
      .join('');
    el.querySelectorAll('[data-lat]').forEach((row) => {
      row.addEventListener('click', () => {
        map.flyTo([parseFloat(row.dataset.lat), parseFloat(row.dataset.lon)], 14);
      });
    });
  }

  // ---------- Wachen (Demo) + Isochronen ----------
  const isochroneLayer = new window.LSS_ISOCHRONES.IsochroneLayer(map);
  let stationMarkers = [];

  function renderStationMarkers(centerLat, centerLon) {
    stationMarkers.forEach((m) => map.removeLayer(m));
    stationMarkers = [];
    const offsets = [
      [0, 0],
      [0.03, 0.02],
      [-0.025, 0.015],
    ];
    offsets.forEach(([dLat, dLon], i) => {
      const lat = centerLat + dLat;
      const lon = centerLon + dLon;
      const marker = L.marker([lat, lon], {
        icon: L.divIcon({
          className: '',
          html: '<div style="background:#1d4ed8;color:#fff;width:24px;height:24px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #fff;">🚒</div>',
          iconSize: [24, 24],
        }),
      }).addTo(map);
      marker.bindTooltip(`Wache ${i + 1} (Demo) – Klick für Ausrück-Radius`);
      marker.on('click', () => {
        const nearby = Array.from(state.activeIncidents.values()).filter(
          (inc) => window.LSS_CACHE_UTIL.haversineKm(lat, lon, inc.lat, inc.lon) < 5
        );
        isochroneLayer.render(lat, lon, nearby);
      });
      stationMarkers.push(marker);
    });
  }
  renderStationMarkers(initialView.lat, initialView.lon);

  // ---------- Blackbox / Replay ----------
  const recorder = new window.LSS_BLACKBOX.BlackboxRecorder();
  let replayMarker = null;
  const player = new window.LSS_BLACKBOX.BlackboxPlayer((frame, index, total) => {
    if (frame.lat != null && frame.lon != null) {
      if (!replayMarker) {
        replayMarker = L.marker([frame.lat, frame.lon], {
          icon: L.divIcon({ className: '', html: '<div style="background:#7c3aed;width:16px;height:16px;border-radius:50%;border:2px solid #fff;"></div>', iconSize: [16, 16] }),
        }).addTo(map);
      } else {
        replayMarker.setLatLng([frame.lat, frame.lon]);
      }
    }
    qs('#replay-slider').max = total - 1;
    qs('#replay-slider').value = index;
  });

  function refreshReplayList() {
    const select = qs('#replay-select');
    const recordings = recorder.listFinished();
    select.innerHTML = recordings
      .map((rec, i) => `<option value="${i}">${rec.incident.name} (${new Date(rec.frames[0].t).toLocaleTimeString('de-DE')})</option>`)
      .join('') || '<option>Noch keine abgeschlossenen Einsätze</option>';
    select.dataset.recordings = JSON.stringify(recordings.length);
  }
  setInterval(refreshReplayList, 8000);
  refreshReplayList();

  qs('#replay-select').addEventListener('change', (e) => {
    const recordings = recorder.listFinished();
    const rec = recordings[parseInt(e.target.value, 10)];
    if (rec) player.load(rec);
  });
  qs('#replay-play-btn').addEventListener('click', () => player.play());
  qs('#replay-pause-btn').addEventListener('click', () => player.pause());
  qs('#replay-slider').addEventListener('input', (e) => player.seek(parseInt(e.target.value, 10)));

  renderIncidentList();
})();
