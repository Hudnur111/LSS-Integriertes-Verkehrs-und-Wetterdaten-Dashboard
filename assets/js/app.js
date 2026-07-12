/**
 * LSS Verkehrs- & Wetterdaten-Dashboard
 * Wetter: Open-Meteo (kostenlos, ohne API-Key)
 * Verkehr: TomTom Traffic API (optionaler, kostenloser API-Key nötig)
 */
(function () {
  'use strict';

  const STORAGE_KEYS = {
    city: 'lss_dashboard_city',
    tomtomKey: 'lss_dashboard_tomtom_key',
  };

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

  // WMO Weather codes -> [FontAwesome icon, deutsche Beschreibung]
  const WEATHER_CODES = {
    0: ['fa-sun', 'Klarer Himmel'],
    1: ['fa-cloud-sun', 'Überwiegend klar'],
    2: ['fa-cloud-sun', 'Teilweise bewölkt'],
    3: ['fa-cloud', 'Bedeckt'],
    45: ['fa-smog', 'Nebel'],
    48: ['fa-smog', 'Reifnebel'],
    51: ['fa-cloud-rain', 'Leichter Niesel'],
    53: ['fa-cloud-rain', 'Niesel'],
    55: ['fa-cloud-rain', 'Starker Niesel'],
    56: ['fa-icicles', 'Gefrierender Niesel'],
    57: ['fa-icicles', 'Gefrierender Niesel'],
    61: ['fa-cloud-rain', 'Leichter Regen'],
    63: ['fa-cloud-rain', 'Regen'],
    65: ['fa-cloud-showers-heavy', 'Starker Regen'],
    66: ['fa-icicles', 'Gefrierender Regen'],
    67: ['fa-icicles', 'Gefrierender Regen'],
    71: ['fa-snowflake', 'Leichter Schneefall'],
    73: ['fa-snowflake', 'Schneefall'],
    75: ['fa-snowflake', 'Starker Schneefall'],
    77: ['fa-snowflake', 'Schneegriesel'],
    80: ['fa-cloud-showers-heavy', 'Regenschauer'],
    81: ['fa-cloud-showers-heavy', 'Regenschauer'],
    82: ['fa-cloud-showers-heavy', 'Heftige Regenschauer'],
    85: ['fa-snowflake', 'Schneeschauer'],
    86: ['fa-snowflake', 'Starke Schneeschauer'],
    95: ['fa-bolt', 'Gewitter'],
    96: ['fa-bolt', 'Gewitter mit Hagel'],
    99: ['fa-bolt', 'Starkes Gewitter mit Hagel'],
  };

  const state = {
    cityName: 'Berlin',
    lat: 52.5200,
    lon: 13.4050,
    tomtomKey: '',
    map: null,
    mapMarker: null,
    incidentMarkers: [],
    refreshTimer: null,
  };

  function weatherInfo(code) {
    return WEATHER_CODES[code] || ['fa-question', 'Unbekannt'];
  }

  function qs(sel) {
    return document.querySelector(sel);
  }

  function getUrlParams() {
    return new URLSearchParams(window.location.search);
  }

  // ---------- Init / State ----------

  function loadState() {
    const params = getUrlParams();
    const paramCity = params.get('city');
    const paramLat = parseFloat(params.get('lat'));
    const paramLon = parseFloat(params.get('lon'));

    if (paramCity && !Number.isNaN(paramLat) && !Number.isNaN(paramLon)) {
      state.cityName = paramCity;
      state.lat = paramLat;
      state.lon = paramLon;
      if (!CITIES[paramCity]) {
        CITIES[paramCity] = { lat: paramLat, lon: paramLon };
      }
    } else {
      const savedCity = localStorage.getItem(STORAGE_KEYS.city);
      if (savedCity && CITIES[savedCity]) {
        state.cityName = savedCity;
        state.lat = CITIES[savedCity].lat;
        state.lon = CITIES[savedCity].lon;
      }
    }

    state.tomtomKey = localStorage.getItem(STORAGE_KEYS.tomtomKey) || '';
  }

  function populateCitySelect() {
    const select = qs('#city-select');
    select.innerHTML = '';
    Object.keys(CITIES).forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (name === state.cityName) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function updateDemoBanner() {
    const banner = qs('#demo-banner');
    banner.classList.toggle('hidden', !!state.tomtomKey);
  }

  function setLastUpdated() {
    qs('#last-updated').textContent =
      'Zuletzt aktualisiert: ' + new Date().toLocaleTimeString('de-DE');
  }

  // ---------- Weather ----------

  async function fetchWeather(lat, lon) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,cloud_cover'
    );
    url.searchParams.set('hourly', 'visibility,temperature_2m,weather_code');
    url.searchParams.set(
      'daily',
      'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max'
    );
    url.searchParams.set('timezone', 'Europe/Berlin');
    url.searchParams.set('forecast_days', '5');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Wetter-API antwortete mit ' + res.status);
    return res.json();
  }

  function currentHourlyValue(hourly, field) {
    if (!hourly || !hourly.time || !hourly[field]) return null;
    const now = new Date();
    const roundedHourIso = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()
    ).toISOString().slice(0, 13);
    const idx = hourly.time.findIndex((t) => t.slice(0, 13) === roundedHourIso);
    const useIdx = idx === -1 ? 0 : idx;
    return hourly[field][useIdx];
  }

  function renderWeather(data) {
    const c = data.current;
    const [icon, label] = weatherInfo(c.weather_code);
    const visibility = currentHourlyValue(data.hourly, 'visibility');

    qs('#current-weather').innerHTML = `
      <div class="text-center">
        <i class="fas ${icon} text-5xl mb-2"></i>
        <p class="text-4xl font-bold">${Math.round(c.temperature_2m)}°C</p>
        <p class="text-lg mb-4">${label}</p>
        <div class="grid grid-cols-4 gap-3 text-sm">
          <div>
            <p class="font-medium">Gefühlt</p>
            <p>${Math.round(c.apparent_temperature)}°C</p>
          </div>
          <div>
            <p class="font-medium">Wind</p>
            <p>${Math.round(c.wind_speed_10m)} km/h</p>
          </div>
          <div>
            <p class="font-medium">Feuchtigkeit</p>
            <p>${c.relative_humidity_2m}%</p>
          </div>
          <div>
            <p class="font-medium">Sichtweite</p>
            <p>${visibility != null ? Math.round(visibility / 1000) + ' km' : '–'}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderForecast(data) {
    const daily = data.daily;
    const el = qs('#weather-forecast');
    el.innerHTML = daily.time
      .map((date, i) => {
        const [icon] = weatherInfo(daily.weather_code[i]);
        const dayLabel =
          i === 0
            ? 'Heute'
            : new Date(date).toLocaleDateString('de-DE', { weekday: 'long' });
        return `
          <div class="forecast-item bg-gray-50 rounded-lg p-4 transition-all duration-200">
            <div class="flex items-center justify-between">
              <span class="font-medium">${dayLabel}</span>
              <i class="fas ${icon} text-blue-400 text-xl"></i>
            </div>
            <div class="flex justify-between mt-2">
              <span class="text-gray-600">${Math.round(daily.temperature_2m_min[i])}°</span>
              <span class="text-gray-600">${Math.round(daily.temperature_2m_max[i])}°</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">
              <i class="fas fa-tint mr-1"></i>${daily.precipitation_probability_max[i]}% Regen
            </div>
          </div>
        `;
      })
      .join('');
  }

  // ---------- Traffic (TomTom) ----------

  async function fetchFlow(lat, lon) {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&key=${encodeURIComponent(state.tomtomKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Verkehrs-API antwortete mit ' + res.status);
    const json = await res.json();
    return json.flowSegmentData;
  }

  async function fetchIncidents(lat, lon) {
    const d = 0.15;
    const bbox = [lon - d, lat - d, lon + d, lat + d].join(',');
    const fields =
      '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description},roadNumbers,delay}}}';
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&language=de-DE&fields=${encodeURIComponent(fields)}&key=${encodeURIComponent(state.tomtomKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Meldungs-API antwortete mit ' + res.status);
    const json = await res.json();
    return json.incidents || [];
  }

  function congestionLevel(currentSpeed, freeFlowSpeed) {
    const pct = Math.max(0, Math.min(100, Math.round(100 - (currentSpeed / freeFlowSpeed) * 100)));
    let label, colorClass;
    if (pct < 15) { label = 'Flüssiger Verkehr'; colorClass = 'bg-green-500'; }
    else if (pct < 35) { label = 'Mäßiger Verkehr'; colorClass = 'bg-yellow-500'; }
    else if (pct < 60) { label = 'Zäher Verkehr'; colorClass = 'bg-orange-500'; }
    else { label = 'Stau'; colorClass = 'bg-red-600'; }
    return { pct, label, colorClass };
  }

  function renderTraffic(flow) {
    const { pct, label, colorClass } = congestionLevel(flow.currentSpeed, flow.freeFlowSpeed);
    qs('#current-traffic').innerHTML = `
      <div class="text-center">
        <div class="inline-block ${colorClass} text-white px-3 py-1 rounded-full text-sm mb-4">
          ${label} (${pct}% Auslastung)
        </div>
        <p class="text-lg mb-2">Durchschnittliche Geschwindigkeit</p>
        <p class="text-4xl font-bold">${Math.round(flow.currentSpeed)} km/h</p>
        <p class="text-sm mt-2 opacity-80">Freie Fließgeschwindigkeit: ${Math.round(flow.freeFlowSpeed)} km/h</p>
      </div>
    `;
  }

  function renderTrafficDemo() {
    const pct = 20 + Math.round(Math.random() * 40);
    const speed = Math.round(90 - pct * 0.6);
    const { label, colorClass } = congestionLevel(90 - pct * 0.6, 90);
    qs('#current-traffic').innerHTML = `
      <div class="text-center">
        <span class="inline-block bg-gray-500 text-white px-2 py-0.5 rounded-full text-xs mb-2">Demo-Daten</span>
        <div class="inline-block ${colorClass} text-white px-3 py-1 rounded-full text-sm mb-4 ml-2">
          ${label} (${pct}% Auslastung)
        </div>
        <p class="text-lg mb-2">Durchschnittliche Geschwindigkeit</p>
        <p class="text-4xl font-bold">${speed} km/h</p>
        <p class="text-sm mt-2 opacity-80">API-Key hinterlegen für echte Verkehrsdaten</p>
      </div>
    `;
  }

  function severityColor(magnitude) {
    switch (magnitude) {
      case 3: return 'border-red-500 bg-red-50 text-red-800';
      case 2: return 'border-orange-500 bg-orange-50 text-orange-800';
      case 1: return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      default: return 'border-gray-400 bg-gray-50 text-gray-800';
    }
  }

  function renderAlerts(incidents) {
    const el = qs('#traffic-alerts');
    if (!incidents.length) {
      el.innerHTML = `<p class="text-gray-500 text-center py-6">Keine aktuellen Verkehrsmeldungen für diese Region.</p>`;
      return;
    }
    el.innerHTML = `<div class="space-y-3">${incidents
      .slice(0, 6)
      .map((inc) => {
        const props = inc.properties || {};
        const desc = props.events && props.events[0] ? props.events[0].description : 'Verkehrsmeldung';
        const road = (props.roadNumbers || []).join(', ') || 'Unbekannte Straße';
        const cls = severityColor(props.magnitudeOfDelay);
        return `
          <div class="p-3 border-l-4 ${cls} rounded">
            <p class="font-medium">${road}</p>
            <p class="text-sm text-gray-600">${desc}</p>
          </div>
        `;
      })
      .join('')}</div>`;
  }

  function renderAlertsDemo() {
    qs('#traffic-alerts').innerHTML = `
      <div class="space-y-3">
        <span class="inline-block bg-gray-500 text-white px-2 py-0.5 rounded-full text-xs mb-1">Demo-Daten</span>
        <div class="p-3 bg-red-50 border-l-4 border-red-500 rounded">
          <p class="font-medium text-red-800">A3 bei Köln</p>
          <p class="text-sm text-gray-600">Stau nach Unfall, ca. 5 km Länge</p>
        </div>
        <div class="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
          <p class="font-medium text-yellow-800">A8 bei Stuttgart</p>
          <p class="text-sm text-gray-600">Baustelle, Fahrspur verengt</p>
        </div>
      </div>
    `;
  }

  async function renderRoadConditions(lat, lon) {
    const points = [
      { label: 'Messpunkt Nord', lat: lat + 0.045, lon },
      { label: 'Messpunkt Ost', lat, lon: lon + 0.045 },
      { label: 'Messpunkt Süd', lat: lat - 0.045, lon },
      { label: 'Messpunkt West', lat, lon: lon - 0.045 },
    ];
    const el = qs('#road-conditions');

    if (!state.tomtomKey) {
      el.innerHTML = points
        .map((p) => {
          const pct = 10 + Math.round(Math.random() * 60);
          return roadBarHtml(p.label, pct, true);
        })
        .join('');
      return;
    }

    try {
      const results = await Promise.all(points.map((p) => fetchFlow(p.lat, p.lon)));
      el.innerHTML = points
        .map((p, i) => {
          const flow = results[i];
          const pct = Math.max(0, Math.min(100, Math.round(100 - (flow.currentSpeed / flow.freeFlowSpeed) * 100)));
          return roadBarHtml(p.label, pct, false, Math.round(flow.currentSpeed), Math.round(flow.freeFlowSpeed));
        })
        .join('');
    } catch (err) {
      el.innerHTML = `<p class="text-gray-500 text-center py-4">Messpunkte konnten nicht geladen werden.</p>`;
    }
  }

  function roadBarHtml(label, pct, demo, speed, freeFlow) {
    let barColor = 'bg-green-500';
    if (pct >= 60) barColor = 'bg-red-600';
    else if (pct >= 35) barColor = 'bg-orange-500';
    else if (pct >= 15) barColor = 'bg-yellow-500';

    const detail = demo
      ? 'Demo-Daten'
      : `${speed} km/h von ${freeFlow} km/h`;

    return `
      <div>
        <h3 class="font-medium text-gray-700 mb-2">${label}${demo ? ' <span class="text-xs text-gray-400">(Demo)</span>' : ''}</h3>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
          <div class="${barColor} h-2.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
        </div>
        <p class="text-sm text-gray-500 mt-1">${detail} · ${pct}% Auslastung</p>
      </div>
    `;
  }

  // ---------- Map ----------

  function initMap() {
    if (typeof L === 'undefined') {
      const el = qs('#traffic-map-leaflet');
      if (el) el.innerHTML = '<p class="text-gray-500 text-center py-16 px-4">Karte konnte nicht geladen werden (Leaflet nicht verfügbar).</p>';
      return;
    }
    if (state.map) {
      state.map.remove();
      state.map = null;
    }
    state.map = L.map('traffic-map-leaflet').setView([state.lat, state.lon], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap-Mitwirkende',
      maxZoom: 18,
    }).addTo(state.map);
    state.mapMarker = L.marker([state.lat, state.lon]).addTo(state.map).bindPopup(state.cityName);
  }

  function updateMapIncidents(incidents) {
    if (!state.map) return;
    state.incidentMarkers.forEach((m) => state.map.removeLayer(m));
    state.incidentMarkers = [];
    incidents.forEach((inc) => {
      const coords = inc.geometry && inc.geometry.coordinates;
      if (!coords) return;
      const point = inc.geometry.type === 'LineString' ? coords[0] : coords;
      if (!Array.isArray(point) || point.length < 2) return;
      const props = inc.properties || {};
      const desc = props.events && props.events[0] ? props.events[0].description : 'Verkehrsmeldung';
      const marker = L.circleMarker([point[1], point[0]], {
        radius: 7,
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.8,
      }).addTo(state.map).bindPopup(desc);
      state.incidentMarkers.push(marker);
    });
  }

  // ---------- Orchestration ----------

  async function refreshAll() {
    document.querySelectorAll('.loading-spinner').forEach((s) => (s.style.display = 'block'));

    try {
      if (state.map) {
        state.map.setView([state.lat, state.lon], 11);
        state.mapMarker.setLatLng([state.lat, state.lon]).bindPopup(state.cityName);
      } else {
        initMap();
      }
    } catch (err) {
      console.error('Kartenfehler:', err);
    }

    try {
      const weather = await fetchWeather(state.lat, state.lon);
      renderWeather(weather);
      renderForecast(weather);
    } catch (err) {
      qs('#current-weather').innerHTML = `<p class="text-center py-6">Wetterdaten konnten nicht geladen werden.</p>`;
      console.error(err);
    }

    if (state.tomtomKey) {
      try {
        const flow = await fetchFlow(state.lat, state.lon);
        renderTraffic(flow);
      } catch (err) {
        renderTrafficDemo();
        console.error(err);
      }
      try {
        const incidents = await fetchIncidents(state.lat, state.lon);
        renderAlerts(incidents);
        updateMapIncidents(incidents);
      } catch (err) {
        renderAlertsDemo();
        console.error(err);
      }
    } else {
      renderTrafficDemo();
      renderAlertsDemo();
    }

    renderRoadConditions(state.lat, state.lon);
    updateDemoBanner();
    setLastUpdated();
  }

  // ---------- Settings modal ----------

  function openSettings() {
    qs('#settings-modal').classList.remove('hidden');
    qs('#tomtom-key-input').value = state.tomtomKey;
  }

  function closeSettings() {
    qs('#settings-modal').classList.add('hidden');
  }

  function saveSettings() {
    const key = qs('#tomtom-key-input').value.trim();
    state.tomtomKey = key;
    if (key) {
      localStorage.setItem(STORAGE_KEYS.tomtomKey, key);
    } else {
      localStorage.removeItem(STORAGE_KEYS.tomtomKey);
    }
    closeSettings();
    refreshAll();
  }

  // ---------- Events ----------

  function onCityChange(e) {
    const name = e.target.value;
    const city = CITIES[name];
    if (!city) return;
    state.cityName = name;
    state.lat = city.lat;
    state.lon = city.lon;
    localStorage.setItem(STORAGE_KEYS.city, name);
    refreshAll();
  }

  function init() {
    loadState();
    populateCitySelect();
    updateDemoBanner();

    qs('#city-select').addEventListener('change', onCityChange);
    qs('#refresh-btn').addEventListener('click', refreshAll);
    qs('#settings-btn').addEventListener('click', openSettings);
    qs('#settings-close-btn').addEventListener('click', closeSettings);
    qs('#settings-save-btn').addEventListener('click', saveSettings);
    qs('#demo-banner-settings-link').addEventListener('click', openSettings);

    refreshAll();
    state.refreshTimer = setInterval(refreshAll, 10 * 60 * 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
