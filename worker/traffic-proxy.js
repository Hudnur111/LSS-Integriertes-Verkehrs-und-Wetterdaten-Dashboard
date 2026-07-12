/**
 * LSS Traffic Proxy – Cloudflare Worker
 *
 * Hält den TomTom-API-Key serverseitig geheim (als Secret), damit
 * Dashboard und Userscript-Mod ohne eigenen API-Key echte Verkehrsdaten
 * abrufen können. Antworten werden kurz gecacht, um das TomTom-Freikontingent
 * für alle Nutzer zu schonen.
 *
 * Deployment: siehe README.md im Ordner "worker/".
 * Benötigt ein Secret: TOMTOM_API_KEY (wrangler secret put TOMTOM_API_KEY)
 */

const CACHE_TTL_SECONDS = 120;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
      ...CORS_HEADERS,
    },
  });
}

function parseLatLon(url) {
  const lat = parseFloat(url.searchParams.get('lat'));
  const lon = parseFloat(url.searchParams.get('lon'));
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

async function handleFlow(url, env, ctx) {
  const point = parseLatLon(url);
  if (!point) return jsonResponse({ error: 'Ungültige oder fehlende lat/lon Parameter.' }, 400);

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstreamUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${point.lat},${point.lon}&key=${env.TOMTOM_API_KEY}`;
  const upstream = await fetch(upstreamUrl);
  if (!upstream.ok) {
    return jsonResponse({ error: 'TomTom Flow-API antwortete mit ' + upstream.status }, 502);
  }
  const data = await upstream.json();
  const fsd = data.flowSegmentData || {};
  const response = jsonResponse({
    currentSpeed: fsd.currentSpeed,
    freeFlowSpeed: fsd.freeFlowSpeed,
    confidence: fsd.confidence,
    roadClosure: fsd.roadClosure,
    frc: fsd.frc,
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handleIncidents(url, env, ctx) {
  const point = parseLatLon(url);
  if (!point) return jsonResponse({ error: 'Ungültige oder fehlende lat/lon Parameter.' }, 400);
  const radius = Math.min(Math.max(parseFloat(url.searchParams.get('radius')) || 0.15, 0.02), 0.5);

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const bbox = [point.lon - radius, point.lat - radius, point.lon + radius, point.lat + radius].join(',');
  const fields =
    '{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description},roadNumbers,delay}}}';
  const upstreamUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&language=de-DE&fields=${encodeURIComponent(fields)}&key=${env.TOMTOM_API_KEY}`;
  const upstream = await fetch(upstreamUrl);
  if (!upstream.ok) {
    return jsonResponse({ error: 'TomTom Incidents-API antwortete mit ' + upstream.status }, 502);
  }
  const data = await upstream.json();
  const incidents = (data.incidents || []).map((inc) => {
    const props = inc.properties || {};
    const coords = inc.geometry && inc.geometry.coordinates;
    const point2 = coords ? (inc.geometry.type === 'LineString' ? coords[0] : coords) : null;
    return {
      lat: point2 ? point2[1] : null,
      lon: point2 ? point2[0] : null,
      description: props.events && props.events[0] ? props.events[0].description : 'Verkehrsmeldung',
      roadNumbers: props.roadNumbers || [],
      magnitudeOfDelay: props.magnitudeOfDelay ?? 0,
      delay: props.delay ?? null,
    };
  });
  const response = jsonResponse({ incidents });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (!env.TOMTOM_API_KEY) {
      return jsonResponse({ error: 'Server ist nicht konfiguriert (TOMTOM_API_KEY fehlt).' }, 500);
    }

    try {
      if (url.pathname === '/flow') return await handleFlow(url, env, ctx);
      if (url.pathname === '/incidents') return await handleIncidents(url, env, ctx);
      return jsonResponse({ error: 'Unbekannter Endpunkt. Verfügbar: /flow, /incidents' }, 404);
    } catch (err) {
      return jsonResponse({ error: 'Interner Fehler: ' + err.message }, 500);
    }
  },
};
