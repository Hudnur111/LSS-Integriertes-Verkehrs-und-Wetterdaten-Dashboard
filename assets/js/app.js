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
    theme: 'lss_dashboard_theme',
  };

  const AQI_LEVELS = [
    { max: 20, label: 'Gut', color: 'bg-green-500' },
    { max: 40, label: 'Mäßig', color: 'bg-yellow-500' },
    { max: 60, label: 'Mittel', color: 'bg-orange-500' },
    { max: 80, label: 'Schlecht', color: 'bg-red-600' },
    { max: 100, label: 'Sehr schlecht', color: 'bg-purple-700' },
    { max: Infinity, label: 'Extrem', color: 'bg-purple-900' },
  ];

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
    lastWeather: null,
    lastCongestionPct: null,
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
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,cloud_cover,precipitation'
    );
    url.searchParams.set('hourly', 'visibility,temperature_2m,weather_code,precipitation_probability');
    url.searchParams.set(
      'daily',
      'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset,uv_index_max'
    );
    url.searchParams.set('timezone', 'Europe/Berlin');
    url.searchParams.set('forecast_days', '5');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Wetter-API antwortete mit ' + res.status);
    return res.json();
  }

  function currentHourlyIndex(hourly) {
    if (!hourly || !hourly.time) return 0;
    const now = new Date();
    const roundedHourIso = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()
    ).toISOString().slice(0, 13);
    const idx = hourly.time.findIndex((t) => t.slice(0, 13) === roundedHourIso);
    return idx === -1 ? 0 : idx;
  }

  function currentHourlyValue(hourly, field) {
    if (!hourly || !hourly[field]) return null;
    return hourly[field][currentHourlyIndex(hourly)];
  }

  function formatTime(iso) {
    if (!iso) return '–';
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  function renderWeather(data) {
    const c = data.current;
    const d = data.daily;
    const [icon, label] = weatherInfo(c.weather_code);
    const visibility = currentHourlyValue(data.hourly, 'visibility');

    qs('#current-weather').innerHTML = `
      <div class="text-center">
        <button id="copy-summary-btn" title="Zusammenfassung kopieren" class="float-right bg-white/20 hover:bg-white/30 rounded-lg px-2 py-1 text-xs">
          <i class="fas fa-copy"></i>
        </button>
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
            <p>
              <i class="fas fa-location-arrow inline-block" style="transform: rotate(${Math.round(c.wind_direction_10m) - 45}deg)"></i>
              ${Math.round(c.wind_speed_10m)} km/h
            </p>
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
        <div class="grid grid-cols-3 gap-3 text-sm mt-4 pt-4 border-t border-white/20">
          <div>
            <p class="font-medium"><i class="fas fa-sun mr-1"></i>Aufgang</p>
            <p>${formatTime(d.sunrise[0])}</p>
          </div>
          <div>
            <p class="font-medium"><i class="fas fa-moon mr-1"></i>Untergang</p>
            <p>${formatTime(d.sunset[0])}</p>
          </div>
          <div>
            <p class="font-medium">UV-Index</p>
            <p>${Math.round(d.uv_index_max[0])}</p>
          </div>
        </div>
        <canvas id="temp-sparkline" class="w-full mt-4" height="60"></canvas>
      </div>
    `;

    qs('#copy-summary-btn').addEventListener('click', () => copySummary(data));
    renderTempSparkline(data.hourly);
  }

  function renderTempSparkline(hourly) {
    const canvas = qs('#temp-sparkline');
    if (!canvas || !hourly || !hourly.temperature_2m) return;
    const startIdx = currentHourlyIndex(hourly);
    const temps = hourly.temperature_2m.slice(startIdx, startIdx + 24);
    if (temps.length < 2) return;

    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.clientWidth);
    const height = (canvas.height = 60);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const range = max - min || 1;
    const stepX = width / (temps.length - 1);

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    temps.forEach((t, i) => {
      const x = i * stepX;
      const y = height - 8 - ((t - min) / range) * (height - 16);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(`${Math.round(max)}°`, 2, 10);
    ctx.fillText(`${Math.round(min)}°`, 2, height - 2);
    ctx.fillText('24h-Trend', width - 60, 10);
  }

  function copySummary(weatherData) {
    const btn = qs('#copy-summary-btn');
    const c = weatherData.current;
    const [, label] = weatherInfo(c.weather_code);
    const risk = state.lastRisk;
    const lines = [
      `📍 ${state.cityName} – ${new Date().toLocaleString('de-DE')}`,
      `🌡️ ${Math.round(c.temperature_2m)}°C, ${label}, Wind ${Math.round(c.wind_speed_10m)} km/h`,
    ];
    if (state.lastCongestionPct != null) {
      lines.push(`🚦 Verkehrsauslastung: ${state.lastCongestionPct}%`);
    }
    if (risk) {
      lines.push(`⚠️ Einsatzrisiko: ${risk.level} (${risk.score}/100)`);
    }
    lines.push('via LSS Verkehr & Wetter Dashboard');

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      if (!btn) return;
      const original = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i>';
      setTimeout(() => (btn.innerHTML = original), 1500);
    });
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

  // ---------- Luftqualität (Open-Meteo, ohne API-Key) ----------

  async function fetchAirQuality(lat, lon) {
    const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    url.searchParams.set('latitude', lat);
    url.searchParams.set('longitude', lon);
    url.searchParams.set('current', 'pm10,pm2_5,european_aqi');
    url.searchParams.set('timezone', 'Europe/Berlin');

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Luftqualitäts-API antwortete mit ' + res.status);
    return res.json();
  }

  function aqiLevel(aqi) {
    return AQI_LEVELS.find((l) => aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
  }

  function renderAirQuality(data) {
    const c = data.current;
    const aqi = Math.round(c.european_aqi);
    const level = aqiLevel(aqi);
    qs('#air-quality').innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="inline-block ${level.color} text-white px-3 py-1 rounded-full text-sm">${level.label}</span>
        <span class="text-2xl font-bold text-gray-800">${aqi}</span>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm text-gray-600">
        <div><p class="font-medium text-gray-700">PM2.5</p><p>${Math.round(c.pm2_5)} µg/m³</p></div>
        <div><p class="font-medium text-gray-700">PM10</p><p>${Math.round(c.pm10)} µg/m³</p></div>
      </div>
      <p class="text-xs text-gray-400 mt-3">Europäischer Luftqualitätsindex (EAQI)</p>
    `;
  }

  function renderAirQualityError() {
    qs('#air-quality').innerHTML = `<p class="text-gray-500 text-center py-6">Luftqualitätsdaten nicht verfügbar.</p>`;
  }

  // ---------- Einsatzrisiko-Index ----------

  function computeRiskIndex({ weatherCode, tempNow, windSpeed, precipProbMax, congestionPct }) {
    let score = 0;
    const missions = [];

    if ([95, 96, 99].includes(weatherCode)) {
      score += 35;
      missions.push('Blitzeinschlag / Gebäudebrand');
    }
    if (windSpeed >= 75) {
      score += 35;
      missions.push('Sturmschaden, Baum auf Fahrbahn/Gebäude');
    } else if (windSpeed >= 50) {
      score += 20;
      missions.push('Sturmschaden (leicht)');
    }
    if ([65, 82].includes(weatherCode) || (precipProbMax >= 70 && [61, 63, 80, 81].includes(weatherCode))) {
      score += 25;
      missions.push('Land unter / Kanalreinigung / Wasserrettung');
    }
    if (tempNow <= 2 && [51, 53, 55, 61, 63, 66, 67, 71, 73, 75, 77, 85, 86].includes(weatherCode)) {
      score += 30;
      missions.push('Verkehrsunfälle durch Glätte');
    }
    if ([45, 48].includes(weatherCode)) {
      score += 10;
      missions.push('Sichtbehinderung / Auffahrunfälle');
    }
    if (congestionPct != null && congestionPct >= 60) {
      score += 15;
      missions.push('Erhöhtes Unfallrisiko im Stau');
    }

    score = Math.max(0, Math.min(100, score));

    let level, color, barColor;
    if (score < 25) { level = 'Niedrig'; color = 'text-green-700'; barColor = 'bg-green-500'; }
    else if (score < 50) { level = 'Mittel'; color = 'text-yellow-700'; barColor = 'bg-yellow-500'; }
    else if (score < 75) { level = 'Hoch'; color = 'text-orange-700'; barColor = 'bg-orange-500'; }
    else { level = 'Sehr hoch'; color = 'text-red-700'; barColor = 'bg-red-600'; }

    return { score, level, color, barColor, missions };
  }

  function renderRiskIndex(risk) {
    const el = qs('#risk-index');
    el.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="font-semibold ${risk.color}">${risk.level}</span>
        <span class="font-bold text-gray-800">${risk.score}/100</span>
      </div>
      <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
        <div class="${risk.barColor} h-3 rounded-full transition-all duration-500" style="width: ${risk.score}%"></div>
      </div>
      ${
        risk.missions.length
          ? `<div class="flex flex-wrap gap-2">${risk.missions
              .map((m) => `<span class="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">${m}</span>`)
              .join('')}</div>`
          : '<p class="text-sm text-gray-500">Keine besonderen Einsatzrisiken durch Wetter/Verkehr erkennbar.</p>'
      }
      <p class="text-xs text-gray-400 mt-3">Heuristische Einschätzung für die Einsatzplanung im Leitstellenspiel – keine amtliche Wetterwarnung.</p>
    `;
  }

  function updateRiskIndex() {
    if (!state.lastWeather) {
      qs('#risk-index').innerHTML = `<p class="text-gray-500 text-center py-4">Einschätzung ohne Wetterdaten nicht möglich.</p>`;
      return;
    }
    const c = state.lastWeather.current;
    const d = state.lastWeather.daily;
    const risk = computeRiskIndex({
      weatherCode: c.weather_code,
      tempNow: c.temperature_2m,
      windSpeed: c.wind_speed_10m,
      precipProbMax: d.precipitation_probability_max[0],
      congestionPct: state.lastCongestionPct,
    });
    state.lastRisk = risk;
    renderRiskIndex(risk);
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
    state.lastCongestionPct = pct;
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
    state.lastCongestionPct = null;
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
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
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
      state.lastWeather = weather;
      renderWeather(weather);
      renderForecast(weather);
    } catch (err) {
      state.lastWeather = null;
      qs('#current-weather').innerHTML = `<p class="text-center py-6">Wetterdaten konnten nicht geladen werden.</p>`;
      console.error(err);
    }

    try {
      const airQuality = await fetchAirQuality(state.lat, state.lon);
      renderAirQuality(airQuality);
    } catch (err) {
      renderAirQualityError();
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

    updateRiskIndex();
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

  // ---------- Dark Mode ----------

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', dark);
    updateThemeIcon(dark);
  }

  function toggleTheme() {
    const dark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(STORAGE_KEYS.theme, dark ? 'dark' : 'light');
    updateThemeIcon(dark);
  }

  function updateThemeIcon(dark) {
    const btn = qs('#theme-toggle-btn');
    if (btn) btn.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  }

  // ---------- Geolocation ----------

  function useMyLocation() {
    const status = qs('#geo-status');
    if (!navigator.geolocation) {
      if (status) status.textContent = 'Geolocation wird von diesem Browser nicht unterstützt.';
      return;
    }
    if (status) status.textContent = 'Standort wird ermittelt...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const name = 'Mein Standort';
        CITIES[name] = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        state.cityName = name;
        state.lat = pos.coords.latitude;
        state.lon = pos.coords.longitude;
        localStorage.setItem(STORAGE_KEYS.city, name);
        populateCitySelect();
        if (status) status.textContent = '';
        refreshAll();
      },
      (err) => {
        if (status) status.textContent = 'Standort konnte nicht ermittelt werden (' + err.message + ').';
      },
      { timeout: 8000 }
    );
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
    initTheme();

    qs('#city-select').addEventListener('change', onCityChange);
    qs('#refresh-btn').addEventListener('click', refreshAll);
    qs('#settings-btn').addEventListener('click', openSettings);
    qs('#settings-close-btn').addEventListener('click', closeSettings);
    qs('#settings-save-btn').addEventListener('click', saveSettings);
    qs('#demo-banner-settings-link').addEventListener('click', openSettings);
    qs('#theme-toggle-btn').addEventListener('click', toggleTheme);
    qs('#geo-btn').addEventListener('click', useMyLocation);

    refreshAll();
    state.refreshTimer = setInterval(refreshAll, 10 * 60 * 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
