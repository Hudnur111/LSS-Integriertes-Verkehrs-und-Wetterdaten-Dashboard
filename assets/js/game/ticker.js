/**
 * Funk-/Depeschen-Ticker im BOS-Stil. Reines Anzeige-Element, gespeist über
 * den EventBus ('ticker:message'). Hält die letzten N Meldungen vor.
 */
(function (global) {
  'use strict';

  const bus = global.LSS_EVENT_BUS;
  const MAX_MESSAGES = 30;

  class Ticker {
    constructor(containerEl) {
      this.container = containerEl;
      this.messages = [];
      this._render();
      bus.on('ticker:message', (msg) => this.push(msg));
    }

    push({ text, severity = 'normal' }) {
      const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      this.messages.unshift({ text, severity, time });
      if (this.messages.length > MAX_MESSAGES) this.messages.length = MAX_MESSAGES;
      this._render();
    }

    _render() {
      const severityColor = { high: '#fca5a5', normal: '#e5e7eb', low: '#9ca3af' };
      this.container.innerHTML = this.messages
        .map(
          (m) =>
            `<span style="color:${severityColor[m.severity] || '#e5e7eb'}; margin-right: 2.5rem;">` +
            `<strong>${m.time}</strong> — ${m.text}</span>`
        )
        .join('');
    }
  }

  global.LSS_TICKER = { Ticker };
})(window);
