// ==UserScript==
// @name         LSS Verkehr & Wetter Mod
// @namespace    https://github.com/Hudnur111/LSS-Integriertes-Verkehrs-und-Wetterdaten-Dashboard
// @version      3.0.0
// @description  Live-Wetter- & Verkehrs-Popup mit automatischer Standorterkennung, Einsatzrisiko-Badge und Mini-Live-Karte im Leitstellenspiel. Ein Klick öffnet das vollständige Dashboard in einem neuen Tab. Keine Anmeldung/API-Key nötig.
// @author       Hudnur111
// @match        https://www.leitstellenspiel.de/*
// @match        https://*.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.open-meteo.com
// @connect      lss-traffic-proxy.hudnur111.workers.dev
// @require      https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Passe diese URL an, wenn du das Dashboard selbst hostest (z. B. via GitHub Pages).
  const DASHBOARD_URL = 'https://hudnur111.github.io/LSS-Integriertes-Verkehrs-und-Wetterdaten-Dashboard/index.html';

  // Serverseitiger Proxy (siehe worker/traffic-proxy.js): hält den TomTom-Key
  // geheim, damit niemand einen eigenen API-Key braucht. Passe die URL an,
  // falls du deinen eigenen Worker deployst.
  const TRAFFIC_PROXY_URL = 'https://lss-traffic-proxy.hudnur111.workers.dev';

  const AUTO_LOCATION_KEY = '__auto__';
  const AUTO_LOCATION_LABEL = '📍 Automatischer Standort';

  const CITIES = {
    'Berlin': { lat: 52.5200, lon: 13.4050 },
    'Hamburg': { lat: 53.5511, lon: 9.9937 },
    'München': { lat: 48.1351, lon: 11.5820 },
    'Köln': { lat: 50.9375, lon: 6.9603 },
    'Frankfurt am Main': { lat: 50.1109, lon: 8.6821 },
    'Stuttgart': { lat: 48.7758, lon: 9.1829 },
    'Düsseldorf': { lat: 51.2277, lon: 6.7735 },
    'Leipzig': { lat: 51.3397, lon: 12.3731 },
    'Dortmund': { lat: 51.5136, lon: 7.4653 },
    'Essen': { lat: 51.4556, lon: 7.0116 },
    'Bremen': { lat: 53.0793, lon: 8.8017 },
    'Dresden': { lat: 51.0504, lon: 13.7373 },
    'Hannover': { lat: 52.3759, lon: 9.7320 },
    'Nürnberg': { lat: 49.4521, lon: 11.0767 },
  };

  const WEATHER_CODES = {
    0: ['☀️', 'Klar'], 1: ['🌤️', 'Überw. klar'], 2: ['⛅', 'Bewölkt'],
    3: ['☁️', 'Bedeckt'], 45: ['🌫️', 'Nebel'], 48: ['🌫️', 'Nebel'],
    51: ['🌧️', 'Niesel'], 53: ['🌧️', 'Niesel'], 55: ['🌧️', 'Niesel'],
    61: ['🌧️', 'Regen'], 63: ['🌧️', 'Regen'], 65: ['🌧️', 'Starkregen'],
    71: ['❄️', 'Schnee'], 73: ['❄️', 'Schnee'], 75: ['❄️', 'Starker Schnee'],
    80: ['🌦️', 'Schauer'], 81: ['🌦️', 'Schauer'], 82: ['⛈️', 'Heftige Schauer'],
    95: ['⛈️', 'Gewitter'], 96: ['⛈️', 'Gewitter mit Hagel'], 99: ['⛈️', 'Starkes Gewitter'],
  };

  function weatherEmoji(code) {
    return WEATHER_CODES[code] || ['❓', 'Unbekannt'];
  }

  // Vereinfachte Variante des Einsatzrisiko-Index aus dem Detail-Dashboard.
  function computeSimpleRisk(weatherCode, windSpeed, tempNow, congestionPct) {
    let score = 0;
    if ([95, 96, 99].includes(weatherCode)) score += 35;
    if (windSpeed >= 75) score += 35;
    else if (windSpeed >= 50) score += 20;
    if ([65, 82].includes(weatherCode)) score += 25;
    if (tempNow <= 2 && [51, 53, 55, 61, 63, 66, 67, 71, 73, 75, 77, 85, 86].includes(weatherCode)) score += 30;
    if ([45, 48].includes(weatherCode)) score += 10;
    if (congestionPct != null && congestionPct >= 60) score += 15;
    score = Math.max(0, Math.min(100, score));

    let level, color;
    if (score < 25) { level = 'Niedrig'; color = '#22c55e'; }
    else if (score < 50) { level = 'Mittel'; color = '#eab308'; }
    else if (score < 75) { level = 'Hoch'; color = '#f97316'; }
    else { level = 'Sehr hoch'; color = '#dc2626'; }
    return { score, level, color };
  }

  let lastRiskLevel = null;

  function maybeNotify(risk, pointLabel) {
    const enabled = GM_getValue('lss_mod_notify_enabled', false);
    const isElevated = risk.level === 'Hoch' || risk.level === 'Sehr hoch';
    const wasElevated = lastRiskLevel === 'Hoch' || lastRiskLevel === 'Sehr hoch';
    if (enabled && isElevated && !wasElevated && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('LSS Einsatzrisiko: ' + risk.level, {
        body: `Aktuelles Risiko in ${pointLabel}: ${risk.score}/100`,
        icon: 'https://www.leitstellenspiel.de/favicon.ico',
      });
    }
    lastRiskLevel = risk.level;
  }

  function gmFetch(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            try { resolve(JSON.parse(res.responseText)); }
            catch (e) { reject(e); }
          } else {
            reject(new Error('HTTP ' + res.status));
          }
        },
        onerror: reject,
      });
    });
  }

  // ---------- Standort ----------

  let currentMode = GM_getValue('lss_mod_mode', 'auto'); // 'auto' | 'manual'
  let currentCityName = GM_getValue('lss_mod_city', 'Berlin');
  let autoCoords = null; // zuletzt per Geolocation ermittelte Koordinaten

  function getCurrentPoint() {
    if (currentMode === 'auto' && autoCoords) {
      return { lat: autoCoords.lat, lon: autoCoords.lon, label: 'Mein Standort' };
    }
    const name = CITIES[currentCityName] ? currentCityName : 'Berlin';
    return { lat: CITIES[name].lat, lon: CITIES[name].lon, label: name };
  }

  function detectLocation(callback) {
    if (!navigator.geolocation) {
      callback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        autoCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        callback();
      },
      () => callback(), // Zugriff verweigert/Timeout: einfach mit Fallback-Stadt weitermachen
      { timeout: 8000 }
    );
  }

  // ---------- UI ----------

  function injectStyles() {
    const leafletCss = document.createElement('link');
    leafletCss.rel = 'stylesheet';
    leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCss);

    const style = document.createElement('style');
    style.textContent = `
      #lss-mod-fab {
        position: fixed; bottom: 20px; left: 20px; z-index: 99999;
        width: 56px; height: 56px; border-radius: 50%;
        background: linear-gradient(135deg, #1d4ed8, #1e293b);
        color: #fff; display: flex; align-items: center; justify-content: center;
        font-size: 26px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        border: 2px solid rgba(255,255,255,0.2);
        font-family: system-ui, sans-serif;
      }
      #lss-mod-fab-badge {
        position: absolute; top: -2px; right: -2px; width: 16px; height: 16px;
        border-radius: 50%; background: #6b7280; border: 2px solid #fff;
        display: none;
      }
      #lss-mod-fab-badge.visible { display: block; }
      #lss-mod-panel .lss-notify-row {
        display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 11px; color: #6b7280;
      }
      #lss-mod-panel {
        position: fixed; bottom: 86px; left: 20px; z-index: 99999;
        width: 300px; background: #fff; border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35); font-family: system-ui, sans-serif;
        overflow: hidden; display: none; color: #1f2937;
      }
      #lss-mod-panel.open { display: block; }
      #lss-mod-panel .lss-header {
        background: #1e293b; color: #fff; padding: 10px 12px;
        display: flex; align-items: center; justify-content: space-between;
      }
      #lss-mod-panel .lss-header select {
        background: #334155; color: #fff; border: none; border-radius: 6px;
        padding: 4px 6px; font-size: 12px; max-width: 150px;
      }
      #lss-mod-panel .lss-close { cursor: pointer; opacity: 0.8; padding: 0 4px; }
      #lss-mod-panel .lss-body { padding: 14px; font-size: 13px; }
      #lss-mod-panel .lss-status { font-size: 11px; color: #9ca3af; margin-bottom: 6px; min-height: 14px; }
      #lss-mod-panel .lss-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      #lss-mod-panel .lss-big { font-size: 28px; font-weight: 700; }
      #lss-mod-panel .lss-badge {
        display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; color: #fff;
      }
      #lss-mod-panel .lss-open-btn, #lss-mod-panel .lss-map-toggle-btn {
        display: block; width: 100%; margin-top: 8px; padding: 8px; text-align: center;
        border: none; border-radius: 8px; font-size: 13px; cursor: pointer; font-weight: 600;
      }
      #lss-mod-panel .lss-open-btn { background: #2563eb; color: #fff; }
      #lss-mod-panel .lss-open-btn:hover { background: #1d4ed8; }
      #lss-mod-panel .lss-map-toggle-btn { background: #e5e7eb; color: #1f2937; }
      #lss-mod-panel .lss-map-toggle-btn:hover { background: #d1d5db; }
      #lss-mod-map { height: 180px; border-radius: 8px; overflow: hidden; margin-top: 8px; display: none; }
      #lss-mod-panel .lss-footer-note {
        display: block; text-align: center; font-size: 10px; color: #9ca3af; margin-top: 8px;
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'lss-mod-panel';
    panel.innerHTML = `
      <div class="lss-header">
        <select id="lss-mod-city-select"></select>
        <span class="lss-close" id="lss-mod-close">&times;</span>
      </div>
      <div class="lss-body">
        <p class="lss-status" id="lss-mod-status"></p>
        <div id="lss-mod-content">Lade...</div>
        <button class="lss-open-btn" id="lss-mod-open-dashboard">Vollständiges Dashboard öffnen ↗</button>
        <button class="lss-map-toggle-btn" id="lss-mod-map-toggle">🗺️ Live-Karte anzeigen</button>
        <div id="lss-mod-map"></div>
        <label class="lss-notify-row">
          <input type="checkbox" id="lss-mod-notify-toggle"> Benachrichtigung bei hohem Einsatzrisiko
        </label>
        <span class="lss-footer-note">Wetter: Open-Meteo · Verkehr: TomTom via Proxy</span>
      </div>
    `;
    document.body.appendChild(panel);

    const select = panel.querySelector('#lss-mod-city-select');
    const autoOpt = document.createElement('option');
    autoOpt.value = AUTO_LOCATION_KEY;
    autoOpt.textContent = AUTO_LOCATION_LABEL;
    select.appendChild(autoOpt);
    Object.keys(CITIES).forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    select.value = currentMode === 'auto' ? AUTO_LOCATION_KEY : currentCityName;

    select.addEventListener('change', () => {
      if (select.value === AUTO_LOCATION_KEY) {
        currentMode = 'auto';
        GM_setValue('lss_mod_mode', 'auto');
        setStatus('Standort wird automatisch ermittelt...');
        detectLocation(() => {
          setStatus('');
          loadData();
        });
      } else {
        currentMode = 'manual';
        currentCityName = select.value;
        GM_setValue('lss_mod_mode', 'manual');
        GM_setValue('lss_mod_city', currentCityName);
        setStatus('');
        loadData();
      }
    });

    panel.querySelector('#lss-mod-close').addEventListener('click', () => {
      panel.classList.remove('open');
    });

    panel.querySelector('#lss-mod-open-dashboard').addEventListener('click', () => {
      const point = getCurrentPoint();
      const url = `${DASHBOARD_URL}?city=${encodeURIComponent(point.label)}&lat=${point.lat}&lon=${point.lon}`;
      window.open(url, '_blank');
    });

    panel.querySelector('#lss-mod-map-toggle').addEventListener('click', toggleMiniMap);

    const notifyToggle = panel.querySelector('#lss-mod-notify-toggle');
    notifyToggle.checked = GM_getValue('lss_mod_notify_enabled', false);
    notifyToggle.addEventListener('change', () => {
      GM_setValue('lss_mod_notify_enabled', notifyToggle.checked);
      if (notifyToggle.checked && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    });

    return panel;
  }

  function setStatus(text) {
    const el = document.querySelector('#lss-mod-status');
    if (el) el.textContent = text;
  }

  function buildFab() {
    const fab = document.createElement('div');
    fab.id = 'lss-mod-fab';
    fab.title = 'Wetter & Verkehr';
    fab.innerHTML = '⛅<span id="lss-mod-fab-badge"></span>';
    document.body.appendChild(fab);
    return fab;
  }

  // ---------- Mini-Live-Karte ----------

  let miniMap = null;
  let miniMapMarker = null;
  let miniMapIncidentMarkers = [];

  function incidentIcon(magnitudeOfDelay) {
    let bg = '#f59e0b';
    if (magnitudeOfDelay >= 3) bg = '#dc2626';
    else if (magnitudeOfDelay >= 2) bg = '#f97316';
    return L.divIcon({
      className: '',
      html: `<div style="background:${bg};width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);">
               <span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:11px;">!</span>
             </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 20],
    });
  }

  function toggleMiniMap() {
    const mapDiv = document.querySelector('#lss-mod-map');
    const willShow = mapDiv.style.display === 'none' || !mapDiv.style.display;
    mapDiv.style.display = willShow ? 'block' : 'none';
    if (willShow) refreshMiniMap();
  }

  function refreshMiniMap() {
    const mapDiv = document.querySelector('#lss-mod-map');
    if (!mapDiv || mapDiv.style.display === 'none' || typeof L === 'undefined') return;
    const point = getCurrentPoint();

    if (!miniMap) {
      miniMap = L.map(mapDiv, { attributionControl: false, zoomControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(miniMap);
    }
    miniMap.setView([point.lat, point.lon], 12);
    if (miniMapMarker) miniMap.removeLayer(miniMapMarker);
    miniMapMarker = L.marker([point.lat, point.lon]).addTo(miniMap).bindPopup(point.label);

    miniMapIncidentMarkers.forEach((m) => miniMap.removeLayer(m));
    miniMapIncidentMarkers = [];
    gmFetch(`${TRAFFIC_PROXY_URL}/incidents?lat=${point.lat}&lon=${point.lon}&radius=0.15`)
      .then((data) => {
        (data.incidents || []).forEach((inc) => {
          if (inc.lat == null || inc.lon == null) return;
          const marker = L.marker([inc.lat, inc.lon], { icon: incidentIcon(inc.magnitudeOfDelay) })
            .addTo(miniMap)
            .bindPopup(inc.description);
          miniMapIncidentMarkers.push(marker);
        });
      })
      .catch(() => {
        // Keine Meldungen verfügbar – Karte bleibt trotzdem nutzbar.
      });
  }

  // ---------- Daten laden ----------

  async function loadData(silent) {
    const content = document.querySelector('#lss-mod-content');
    if (!silent && content) content.innerHTML = 'Lade...';

    const point = getCurrentPoint();

    let weatherHtml = '<p>Wetterdaten nicht verfügbar.</p>';
    let weatherCode = null;
    let windSpeed = null;
    let tempNow = null;
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lon}&current=temperature_2m,weather_code,wind_speed_10m`;
      const data = await gmFetch(weatherUrl);
      weatherCode = data.current.weather_code;
      windSpeed = data.current.wind_speed_10m;
      tempNow = data.current.temperature_2m;
      const [emoji, label] = weatherEmoji(weatherCode);
      weatherHtml = `
        <div class="lss-row">
          <span>${emoji} ${label} · ${point.label}</span>
          <span class="lss-big">${Math.round(tempNow)}°C</span>
        </div>
        <div class="lss-row"><span>Wind</span><span>${Math.round(windSpeed)} km/h</span></div>
      `;
    } catch (e) {
      // stumm fehlschlagen, Platzhalter bleibt
    }

    let trafficHtml = '<div class="lss-row"><span>Verkehr</span><span style="color:#9ca3af">Live-Daten nicht erreichbar</span></div>';
    let congestionPct = null;
    try {
      const flowUrl = `${TRAFFIC_PROXY_URL}/flow?lat=${point.lat}&lon=${point.lon}`;
      const fsd = await gmFetch(flowUrl);
      congestionPct = Math.max(0, Math.min(100, Math.round(100 - (fsd.currentSpeed / fsd.freeFlowSpeed) * 100)));
      let color = '#22c55e';
      if (congestionPct >= 60) color = '#dc2626';
      else if (congestionPct >= 35) color = '#f97316';
      else if (congestionPct >= 15) color = '#eab308';
      trafficHtml = `
        <div class="lss-row">
          <span>Verkehr</span>
          <span class="lss-badge" style="background:${color}">${congestionPct}% Auslastung</span>
        </div>
        <div class="lss-row"><span>Geschwindigkeit</span><span>${Math.round(fsd.currentSpeed)} km/h</span></div>
      `;
    } catch (e) {
      // Fallback-Text bleibt bestehen
    }

    if (content) content.innerHTML = weatherHtml + trafficHtml;
    refreshMiniMap();

    if (weatherCode !== null) {
      const risk = computeSimpleRisk(weatherCode, windSpeed, tempNow, congestionPct);
      const badge = document.querySelector('#lss-mod-fab-badge');
      if (badge) {
        badge.classList.add('visible');
        badge.style.background = risk.color;
        badge.title = `Einsatzrisiko: ${risk.level} (${risk.score}/100)`;
      }
      maybeNotify(risk, point.label);
    }
  }

  function init() {
    injectStyles();
    const fab = buildFab();
    const panel = buildPanel();

    fab.addEventListener('click', () => {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) loadData();
    });

    if (currentMode === 'auto') {
      setStatus('Standort wird automatisch ermittelt...');
      detectLocation(() => {
        setStatus('');
        loadData(true);
      });
    } else {
      loadData(true);
    }

    // Aktualisiert Popup-Inhalt (falls offen), Mini-Karte und Risiko-Badge alle 5 Minuten
    setInterval(() => {
      loadData(!panel.classList.contains('open'));
    }, 5 * 60 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
