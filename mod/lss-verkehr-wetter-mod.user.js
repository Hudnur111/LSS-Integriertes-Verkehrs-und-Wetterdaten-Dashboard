// ==UserScript==
// @name         LSS Verkehr & Wetter Mod
// @namespace    https://github.com/Hudnur111/LSS-Integriertes-Verkehrs-und-Wetterdaten-Dashboard
// @version      2.1.0
// @description  Zeigt ein kompaktes Live-Wetter- und Verkehrs-Popup mit Einsatzrisiko-Badge im Leitstellenspiel. Ein Klick öffnet das vollständige Dashboard mit Detaildaten in einem neuen Tab.
// @author       Hudnur111
// @match        https://www.leitstellenspiel.de/*
// @match        https://*.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.open-meteo.com
// @connect      api.tomtom.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Passe diese URL an, wenn du das Dashboard selbst hostest (z. B. via GitHub Pages).
  const DASHBOARD_URL = 'https://hudnur111.github.io/LSS-Integriertes-Verkehrs-und-Wetterdaten-Dashboard/index.html';

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

  function maybeNotify(risk) {
    const enabled = GM_getValue('lss_mod_notify_enabled', false);
    const isElevated = risk.level === 'Hoch' || risk.level === 'Sehr hoch';
    const wasElevated = lastRiskLevel === 'Hoch' || lastRiskLevel === 'Sehr hoch';
    if (enabled && isElevated && !wasElevated && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('LSS Einsatzrisiko: ' + risk.level, {
        body: `Aktuelles Risiko in ${getSelectedCity()}: ${risk.score}/100`,
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

  function getSelectedCity() {
    const name = GM_getValue('lss_mod_city', 'Berlin');
    return CITIES[name] ? name : 'Berlin';
  }

  function getTomTomKey() {
    return GM_getValue('lss_mod_tomtom_key', '');
  }

  // ---------- UI ----------

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #lss-mod-fab {
        position: fixed; bottom: 20px; right: 20px; z-index: 99999;
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
        position: fixed; bottom: 86px; right: 20px; z-index: 99999;
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
        padding: 4px 6px; font-size: 12px; max-width: 140px;
      }
      #lss-mod-panel .lss-close { cursor: pointer; opacity: 0.8; padding: 0 4px; }
      #lss-mod-panel .lss-body { padding: 14px; font-size: 13px; }
      #lss-mod-panel .lss-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      #lss-mod-panel .lss-big { font-size: 28px; font-weight: 700; }
      #lss-mod-panel .lss-badge {
        display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; color: #fff;
      }
      #lss-mod-panel .lss-open-btn {
        display: block; width: 100%; margin-top: 10px; padding: 8px; text-align: center;
        background: #2563eb; color: #fff; border: none; border-radius: 8px; font-size: 13px;
        cursor: pointer; font-weight: 600;
      }
      #lss-mod-panel .lss-open-btn:hover { background: #1d4ed8; }
      #lss-mod-panel .lss-footer-link {
        display: block; text-align: center; font-size: 11px; color: #6b7280; margin-top: 8px; cursor: pointer;
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
        <div id="lss-mod-content">Lade...</div>
        <button class="lss-open-btn" id="lss-mod-open-dashboard">Vollständiges Dashboard öffnen ↗</button>
        <label class="lss-notify-row">
          <input type="checkbox" id="lss-mod-notify-toggle"> Benachrichtigung bei hohem Einsatzrisiko
        </label>
        <span class="lss-footer-link" id="lss-mod-settings-link">Verkehrs-API-Key einrichten</span>
      </div>
    `;
    document.body.appendChild(panel);

    const select = panel.querySelector('#lss-mod-city-select');
    Object.keys(CITIES).forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    select.value = getSelectedCity();
    select.addEventListener('change', () => {
      GM_setValue('lss_mod_city', select.value);
      loadData();
    });

    panel.querySelector('#lss-mod-close').addEventListener('click', () => {
      panel.classList.remove('open');
    });

    panel.querySelector('#lss-mod-open-dashboard').addEventListener('click', () => {
      const name = getSelectedCity();
      const city = CITIES[name];
      const url = `${DASHBOARD_URL}?city=${encodeURIComponent(name)}&lat=${city.lat}&lon=${city.lon}`;
      window.open(url, '_blank');
    });

    const notifyToggle = panel.querySelector('#lss-mod-notify-toggle');
    notifyToggle.checked = GM_getValue('lss_mod_notify_enabled', false);
    notifyToggle.addEventListener('change', () => {
      GM_setValue('lss_mod_notify_enabled', notifyToggle.checked);
      if (notifyToggle.checked && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    });

    panel.querySelector('#lss-mod-settings-link').addEventListener('click', () => {
      const current = getTomTomKey();
      const key = window.prompt(
        'Kostenlosen TomTom-API-Key eingeben (developer.tomtom.com), um echte Verkehrsdaten im Popup zu sehen. Leer lassen zum Entfernen.',
        current
      );
      if (key !== null) {
        GM_setValue('lss_mod_tomtom_key', key.trim());
        loadData();
      }
    });

    return panel;
  }

  function buildFab() {
    const fab = document.createElement('div');
    fab.id = 'lss-mod-fab';
    fab.title = 'Wetter & Verkehr';
    fab.innerHTML = '⛅<span id="lss-mod-fab-badge"></span>';
    document.body.appendChild(fab);
    return fab;
  }

  async function loadData(silent) {
    const content = document.querySelector('#lss-mod-content');
    if (!silent && content) content.innerHTML = 'Lade...';

    const name = getSelectedCity();
    const { lat, lon } = CITIES[name];

    let weatherHtml = '<p>Wetterdaten nicht verfügbar.</p>';
    let weatherCode = null;
    let windSpeed = null;
    let tempNow = null;
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`;
      const data = await gmFetch(weatherUrl);
      weatherCode = data.current.weather_code;
      windSpeed = data.current.wind_speed_10m;
      tempNow = data.current.temperature_2m;
      const [emoji, label] = weatherEmoji(weatherCode);
      weatherHtml = `
        <div class="lss-row">
          <span>${emoji} ${label}</span>
          <span class="lss-big">${Math.round(tempNow)}°C</span>
        </div>
        <div class="lss-row"><span>Wind</span><span>${Math.round(windSpeed)} km/h</span></div>
      `;
    } catch (e) {
      // stumm fehlschlagen, Platzhalter bleibt
    }

    let trafficHtml = '<div class="lss-row"><span>Verkehr</span><span style="color:#9ca3af">Kein API-Key</span></div>';
    let congestionPct = null;
    const key = getTomTomKey();
    if (key) {
      try {
        const flowUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&key=${encodeURIComponent(key)}`;
        const flow = await gmFetch(flowUrl);
        const fsd = flow.flowSegmentData;
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
        trafficHtml = '<div class="lss-row"><span>Verkehr</span><span style="color:#9ca3af">Fehler beim Laden</span></div>';
      }
    }

    if (content) content.innerHTML = weatherHtml + trafficHtml;

    if (weatherCode !== null) {
      const risk = computeSimpleRisk(weatherCode, windSpeed, tempNow, congestionPct);
      const badge = document.querySelector('#lss-mod-fab-badge');
      if (badge) {
        badge.classList.add('visible');
        badge.style.background = risk.color;
        badge.title = `Einsatzrisiko: ${risk.level} (${risk.score}/100)`;
      }
      maybeNotify(risk);
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

    loadData(true);

    // Aktualisiert Popup-Inhalt (falls offen) und Risiko-Badge alle 5 Minuten
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
