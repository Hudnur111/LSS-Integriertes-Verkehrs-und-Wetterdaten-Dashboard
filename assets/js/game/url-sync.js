/**
 * Zwei-Wege-State-Sync zwischen Kartenzustand und URL-Query-Parametern.
 * Kartenbewegung -> URL (debounced 300ms). Direktaufruf der URL -> Karte
 * wird beim Laden auf exakt diesen Ausschnitt gesetzt.
 */
(function (global) {
  'use strict';

  function debounce(fn, delayMs) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delayMs);
    };
  }

  class UrlSync {
    constructor(map) {
      this.map = map;
      this._updateUrl = debounce(this._updateUrlImmediate.bind(this), 300);
    }

    restoreFromUrl(defaults) {
      const params = new URLSearchParams(window.location.search);
      const lat = parseFloat(params.get('lat'));
      const lon = parseFloat(params.get('lon'));
      const zoom = parseInt(params.get('zoom'), 10);
      const layers = (params.get('layers') || '').split(',').filter(Boolean);

      const view = {
        lat: Number.isFinite(lat) ? lat : defaults.lat,
        lon: Number.isFinite(lon) ? lon : defaults.lon,
        zoom: Number.isFinite(zoom) ? zoom : defaults.zoom,
        layers,
      };
      this.map.setView([view.lat, view.lon], view.zoom);
      return view;
    }

    bind(getExtraState) {
      this.map.on('moveend zoomend', () => this._updateUrl(getExtraState));
    }

    _updateUrlImmediate(getExtraState) {
      const center = this.map.getCenter();
      const params = new URLSearchParams(window.location.search);
      params.set('lat', center.lat.toFixed(5));
      params.set('lon', center.lng.toFixed(5));
      params.set('zoom', this.map.getZoom());

      const extra = (getExtraState && getExtraState()) || {};
      if (extra.layers) params.set('layers', extra.layers.join(','));
      if (extra.incident) params.set('incident', extra.incident);
      else params.delete('incident');

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    }
  }

  global.LSS_URL_SYNC = { UrlSync };
})(window);
