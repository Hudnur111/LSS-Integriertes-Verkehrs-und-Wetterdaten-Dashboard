# 🚨 LSS Verkehrs- & Wetterdaten-Mod

Ein Fan-Mod für das [Leitstellenspiel](https://www.leitstellenspiel.de/), der **echte Echtzeit-Wetter- und Verkehrsdaten** direkt ins Spiel bringt: ein kompaktes Popup mit Kurzinfos und Mini-Live-Karte während des Spielens, und ein vollständiges Detail-Dashboard einen Klick entfernt. Für Spieler:innen völlig ohne Einrichtung nutzbar – kein eigener API-Key, kein Login, keine Anmeldung nötig.

## 🧩 Wie der Mod funktioniert

1. **Popup im Spiel** – Ein kleiner Button (⛅) schwebt unten links über der Leitstellenspiel-Seite. Er zeigt permanent ein farbiges **Risiko-Badge** (grün/gelb/orange/rot) an, auch ohne das Popup zu öffnen. Beim Laden wird der **Standort automatisch per Geolocation ermittelt** (mit Fallback auf Berlin, falls nicht erlaubt/verfügbar). Ein Klick öffnet ein kompaktes Popup mit aktueller Temperatur, Wetterlage, Verkehrsauslastung und einer aufklappbaren **Mini-Live-Karte mit Warnsymbolen (⚠️)** für gemeldete Vorfälle.
2. **Detail-Dashboard** – Der Button *„Vollständiges Dashboard öffnen“* im Popup öffnet in einem neuen Tab `index.html` mit vollständigen Details: Einsatzrisiko-Index, 5-Tage-Wettervorhersage, 24h-Temperaturtrend, Luftqualität, große interaktive Verkehrskarte mit Warnsymbolen, Verkehrsmeldungen und Live-Messpunkten rund um den Standort.

Beide Teile nutzen **echte APIs**, keine simulierten Zufallsdaten:

| Datenart | Quelle | API-Key nötig (für Nutzer:innen)? |
|---|---|---|
| 🌦️ Wetter (aktuell + Vorhersage + Sonnenauf-/-untergang + UV) | [Open-Meteo](https://open-meteo.com/) | Nein |
| 🌫️ Luftqualität (PM2.5, PM10, EAQI) | [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | Nein |
| 🚗 Verkehrsfluss & Meldungen | [TomTom Traffic API](https://developer.tomtom.com/) **über eigenen Proxy** | Nein |
| 🗺️ Karte | [OpenStreetMap](https://www.openstreetmap.org/) via Leaflet | Nein |

### Warum ein eigener Proxy für Verkehrsdaten?

TomTom (wie jeder andere Live-Verkehrsanbieter) verlangt zwingend einen API-Key. Diesen fest im öffentlichen Code (Userscript + GitHub-Seite sind für jeden einsehbar) zu hinterlegen wäre unsicher – er wäre sofort auslesbar und könnte missbraucht/gesperrt werden. Deshalb liegt **ein** Key sicher auf einem kleinen kostenlosen Server (Cloudflare Worker, siehe `worker/`), den Popup und Dashboard im Hintergrund ansprechen. Nutzer:innen des Mods müssen sich um nichts kümmern – nur der Betreiber des Projekts richtet den Proxy einmalig ein. Ist der Proxy einmal nicht erreichbar, läuft der Verkehrsteil automatisch in einem klar gekennzeichneten **Demo-Modus** weiter.

## 🚀 Installation (für Spieler:innen)

### 1. Userscript installieren
1. Browser-Erweiterung [Tampermonkey](https://www.tampermonkey.net/) installieren.
2. Datei [`mod/lss-verkehr-wetter-mod.user.js`](mod/lss-verkehr-wetter-mod.user.js) auf GitHub öffnen, auf „Raw“ klicken – Tampermonkey bietet die Installation automatisch an.
3. Leitstellenspiel öffnen – der ⛅-Button erscheint unten links. Beim ersten Öffnen des Popups nach dem Standort fragen lassen (Browser-Berechtigung) für automatische Standorterkennung.

Das war's – Wetter, Verkehr und die Live-Karte funktionieren direkt, ohne weitere Einrichtung.

## 🛠️ Betrieb (für den Projekt-Betreiber)

Diese Schritte sind nur einmalig für die Person nötig, die das Projekt hostet – nicht für einzelne Spieler:innen.

### 1. Detail-Dashboard hosten
- Am einfachsten über **GitHub Pages**: Repository → *Settings → Pages* → Branch `main`, Root-Verzeichnis. Die Seite ist danach unter `https://<dein-user>.github.io/<repo>/index.html` erreichbar.

### 2. Traffic-Proxy deployen (Cloudflare Worker)
1. Kostenlosen Account auf [developer.tomtom.com](https://developer.tomtom.com/) anlegen und einen API-Key erzeugen.
2. Kostenlosen Account auf [Cloudflare](https://dash.cloudflare.com/) anlegen, [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installieren (`npm i -g wrangler`).
3. Im Ordner `worker/`: `wrangler login`, dann `wrangler secret put TOMTOM_API_KEY` (Key einfügen, wird verschlüsselt gespeichert – erscheint nie im Code).
4. `wrangler deploy` – Cloudflare gibt eine URL wie `https://lss-traffic-proxy.<dein-account>.workers.dev` aus.
5. Diese URL in `assets/js/app.js` (Konstante `TRAFFIC_PROXY_URL`) und in `mod/lss-verkehr-wetter-mod.user.js` (Konstante `TRAFFIC_PROXY_URL`, plus `@connect`-Zeile im Header) eintragen.

Details und Endpunkt-Beschreibung: [`worker/traffic-proxy.js`](worker/traffic-proxy.js).

## 🔧 Features

- 📍 **Automatische Standorterkennung** (Geolocation) beim Öffnen – keine manuelle Auswahl nötig; alternativ 14 große deutsche Städte per Dropdown wählbar
- 🌦️ Echtzeit-Wetter inkl. gefühlter Temperatur, Windrichtung (Kompass), Luftfeuchtigkeit, Sichtweite, Sonnenauf-/-untergang, UV-Index
- 📈 24-Stunden-Temperaturtrend als Sparkline-Chart
- 📅 5-Tage-Wettervorhersage mit Regenwahrscheinlichkeit
- 🌫️ Luftqualität (EAQI, PM2.5, PM10)
- 🚦 Live-Verkehrsauslastung (Geschwindigkeit vs. freie Fließgeschwindigkeit) – ganz ohne eigenen API-Key
- 📣 Echte Verkehrsmeldungen (Unfälle, Baustellen, Sperrungen) als Liste und auf der Karte
- 🗺️ Interaktive Karte mit **Warnsymbolen (⚠️)** an den echten Koordinaten gemeldeter Vorfälle
- 🗺️ **Mini-Live-Karte direkt im In-Game-Popup** – ein- und ausklappbar, mit denselben Warnsymbolen
- ⚠️ **Einsatzrisiko-Index**: heuristische Einschätzung (0–100), die Wetter- und Verkehrsdaten zu konkreten LSS-Einsatzvorschlägen verdichtet (z. B. „Verkehrsunfälle durch Glätte“, „Sturmschaden“, „Land unter“)
- 🔴 **Risiko-Badge direkt am In-Game-Button** – auf einen Blick erkennbar, ohne das Popup zu öffnen
- 🔔 Optionale Browser-Benachrichtigung, wenn das Einsatzrisiko auf „Hoch“/„Sehr hoch“ steigt
- 🌓 Dark Mode (folgt Systemeinstellung, manuell umschaltbar)
- 📋 „In Zwischenablage kopieren“-Button für eine schnelle Lage-Zusammenfassung (z. B. für Discord/Allianz-Chat)
- 🔁 Auto-Refresh alle 10 Minuten (Dashboard) bzw. 5 Minuten (Popup, inkl. Risiko-Badge im Hintergrund)
- 🧭 Deep-Link: Popup übergibt Standort/Koordinaten per URL an das Dashboard

## 🛠️ Verwendete Technologien

- **Vanilla JavaScript** (kein Build-Schritt nötig)
- **Tailwind CSS** & **Font Awesome** für die Oberfläche
- **Leaflet.js** + OpenStreetMap für die Karten (Dashboard & Mini-Karte im Popup)
- **Tampermonkey Userscript API** (`GM_xmlhttpRequest`, `GM_setValue`) für das In-Game-Popup
- **Cloudflare Workers** als serverseitiger Proxy für Verkehrsdaten (hält den API-Key geheim, cacht Antworten)

## 📁 Projektstruktur

```
index.html                          # Detail-Dashboard (Wetter/Luft/Verkehr)
game-dashboard.html                 # Live-Einsatzkarte (Spieldaten-Modul)
assets/css/style.css                # Styles
assets/js/app.js                    # Dashboard-Logik (Fetch, Rendering, Karte)
assets/js/game/                     # Einsatzkarte: Event-Bus, Cache, Adapter, Karten-Layer, Isochronen, Ticker, Blackbox
mod/lss-verkehr-wetter-mod.user.js  # Tampermonkey-Mod fürs Spiel (Popup + Mini-Karte)
worker/traffic-proxy.js             # Cloudflare-Worker-Proxy für TomTom-Verkehrsdaten
worker/wrangler.toml                # Deployment-Konfiguration für den Worker
```

## 🎮 Live-Einsatzkarte (`game-dashboard.html`)

Ein separates Karten-Modul, das In-Game-Einsätze (Feuerwehr, Rettungsdienst, Polizei, THW, Wasserrettung, ...) visuell auf einer Leaflet-Karte darstellt — inklusive Clustering, Heatmap, Regenradar (RainViewer, kostenlos), simulierter Fahrzeug-Anfahrt mit Routenlinie, Ausrück-Radien beim Klick auf eine Wache, In-Game-Wetter-Kopplung, URL-Deep-Linking und einem BOS-Ticker. Mobil per ☰-Button einklappbare Seitenleiste.

**Wichtiger Stand der Technik:** Leitstellenspiel bietet keine öffentliche Echtzeit-API/WebSocket für Einsätze oder Fahrzeuge. Die Datenquelle ist daher als austauschbares **Adapter-Interface** (`assets/js/game/game-adapter.js`) gebaut:

- **`MockGameAdapter`** (aktiv) — erzeugt realistische synthetische Einsätze aus der mitgelieferten Einsatzliste (`assets/js/game/missions-data.js`), inklusive echter Namen, Credits und Ressourcen-Voraussetzungen. Damit ist die komplette Karte, Clustering, Heatmap, Isochronen-Logik und das Replay-System schon heute voll funktionsfähig und demonstrierbar.
- **`LssDomAdapter`** (Platzhalter) — soll später echte Einsätze/Fahrzeuge direkt aus dem DOM der Spielseiten auslesen (das ist der einzig realistische Weg, da es keine offizielle API gibt). Dafür fehlen aktuell die echten CSS-Selektoren/HTML-Struktur der Live-Seiten — die TODOs stehen direkt im Code. Um diesen Adapter fertigzustellen, entweder reale HTML-Ausschnitte der Einsatzliste/Fahrzeugübersicht bereitstellen, oder eine Session mit Zugriff auf leitstellenspiel.de nutzen.

Alle anderen Module (Karten-Rendering, Ticker, Blackbox-Replay, Isochronen) kennen nur den zentralen `EventBus` und funktionieren unverändert, sobald ein echter Adapter die gleichen Events emittiert wie der Mock.

**Weitere Hinweise zur Ehrlichkeit der Umsetzung:**
- Die **Ausrück-Radien** sind Näherungen (konzentrische Ringe basierend auf einer angenommenen Durchschnittsgeschwindigkeit, abzüglich eines Abschlags für nahe Einsätze und für riskantes Wetter), keine echte straßennetzbasierte Routingberechnung — dafür wäre ein Routing-Anbieter mit API-Key nötig (analog zum Verkehrs-Proxy umsetzbar, aber nicht enthalten).
- Die **Fahrzeug-/Routen-Simulation** (`VehicleLayer` in `map-layers.js`) ist beim Mock-Adapter eine geradlinige Interpolation von einem zufälligen Punkt zum Einsatzort, keine echte Streckenführung entlang des Straßennetzes. Abschnitte nahe anderer aktiver Einsätze werden als "blockiert" markiert (rot, gestrichelt) — eine Heuristik, kein echtes Stau-Signal.
- Die **In-Game-Wetter-Kopplung** (`assets/js/game/weather-coupling.js`) nutzt echte Open-Meteo-Daten (kein Mock) und erhöht bei Regen/Glätte die Spawn-Rate des Mock-Adapters sowie den Anteil verkehrsbezogener Einsätze — sichtbar als Badge im Header.
- Der **Hybrid-Cache** (`assets/js/game/cache.js`) dedupliziert gleichzeitige Anfragen und hält Ergebnisse 15–30 Minuten in `sessionStorage` + In-Memory vor, inkl. Invalidierung bei Standortwechsel &gt; 5 km.

## 📌 Zielgruppe

- Spieler:innen des **Leitstellenspiels**, die reale Wetter-/Verkehrslage in ihre Einsatzplanung einbeziehen möchten
- Entwickler:innen, die an Echtzeit-Dashboards, Userscript-Mods oder Proxy-Architekturen interessiert sind

## ⚠️ Hinweis

Dies ist ein inoffizielles Fan-Projekt ohne Verbindung zum Leitstellenspiel-Team. Die Nutzung von Drittanbieter-APIs unterliegt deren jeweiligen Nutzungsbedingungen (siehe [Open-Meteo](https://open-meteo.com/en/terms), [TomTom](https://developer.tomtom.com/terms-and-conditions), [OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/), [Cloudflare Workers](https://www.cloudflare.com/service-specific-terms-application/#cloudflare-workers-service-terms)).

---

📬 Bei Fragen oder Verbesserungsvorschlägen gerne ein Issue eröffnen oder ein Pull-Request einreichen!
