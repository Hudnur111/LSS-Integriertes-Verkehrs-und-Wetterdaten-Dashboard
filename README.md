# 🚨 LSS Verkehrs- & Wetterdaten-Mod

Ein Fan-Mod für das [Leitstellenspiel](https://www.leitstellenspiel.de/), der **echte Echtzeit-Wetter- und Verkehrsdaten** direkt ins Spiel bringt: ein kompaktes Popup mit Kurzinfos während des Spielens, und ein vollständiges Detail-Dashboard einen Klick entfernt.

## 🧩 Wie der Mod funktioniert

1. **Popup im Spiel** – Ein kleiner Button (⛅) schwebt unten links über der Leitstellenspiel-Seite. Er zeigt permanent ein farbiges **Risiko-Badge** (grün/gelb/orange/rot) an, auch ohne das Popup zu öffnen. Ein Klick öffnet ein kompaktes Popup mit aktueller Temperatur, Wetterlage und (optional) Verkehrsauslastung für eine wählbare Stadt.
2. **Detail-Dashboard** – Der Button *„Vollständiges Dashboard öffnen“* im Popup öffnet in einem neuen Tab `index.html` mit vollständigen Details: Einsatzrisiko-Index, 5-Tage-Wettervorhersage, 24h-Temperaturtrend, Luftqualität, Live-Verkehrskarte, Verkehrsmeldungen und Messpunkten rund um die Stadt.

Beide Teile nutzen **echte APIs**, keine simulierten Zufallsdaten:

| Datenart | Quelle | API-Key nötig? |
|---|---|---|
| 🌦️ Wetter (aktuell + Vorhersage + Sonnenauf-/-untergang + UV) | [Open-Meteo](https://open-meteo.com/) | Nein |
| 🌫️ Luftqualität (PM2.5, PM10, EAQI) | [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | Nein |
| 🚗 Verkehrsfluss & Meldungen | [TomTom Traffic API](https://developer.tomtom.com/) | Ja (kostenloses Kontingent) |
| 🗺️ Karte | [OpenStreetMap](https://www.openstreetmap.org/) via Leaflet | Nein |

Ist kein TomTom-Key hinterlegt, läuft der Verkehrsteil in einem klar gekennzeichneten **Demo-Modus** weiter – die App bleibt voll funktionsfähig.

## 🚀 Installation

### 1. Detail-Dashboard hosten
- Am einfachsten über **GitHub Pages**: Repository → *Settings → Pages* → Branch `main`, Root-Verzeichnis. Die Seite ist danach unter `https://<dein-user>.github.io/<repo>/index.html` erreichbar.
- Alternativ lokal öffnen oder auf einem eigenen Webserver hosten.

### 2. Userscript installieren
1. Browser-Erweiterung [Tampermonkey](https://www.tampermonkey.net/) installieren.
2. Datei [`mod/lss-verkehr-wetter-mod.user.js`](mod/lss-verkehr-wetter-mod.user.js) öffnen und über Tampermonkey installieren (bzw. Inhalt in ein neues Userscript einfügen).
3. Falls das Dashboard nicht über die Standard-GitHub-Pages-URL erreichbar ist, die Konstante `DASHBOARD_URL` am Anfang des Scripts anpassen.
4. Leitstellenspiel öffnen – der ⛅-Button erscheint unten links.

### 3. Echte Verkehrsdaten aktivieren (optional)
1. Kostenlosen Account auf [developer.tomtom.com](https://developer.tomtom.com/) anlegen und einen API-Key erzeugen (Free-Tier reicht für den privaten Gebrauch).
2. Im Popup auf *„Verkehrs-API-Key einrichten“* klicken und den Key eintragen, **oder** im Detail-Dashboard über das ⚙️-Icon.
3. Der Key wird lokal gespeichert (Tampermonkey-Storage bzw. `localStorage`) und nie an Dritte übermittelt. Popup und Dashboard nutzen getrennte Speicherorte – der Key muss ggf. an beiden Stellen einmalig hinterlegt werden.

## 🔧 Features

- 📍 Auswahl aus 14 großen deutschen Städten (Berlin, Hamburg, München, Köln, ...) oder **eigener Standort** per Geolocation
- 🌦️ Echtzeit-Wetter inkl. gefühlter Temperatur, Windrichtung (Kompass), Luftfeuchtigkeit, Sichtweite, Sonnenauf-/-untergang, UV-Index
- 📈 24-Stunden-Temperaturtrend als Sparkline-Chart
- 📅 5-Tage-Wettervorhersage mit Regenwahrscheinlichkeit
- 🌫️ Luftqualität (EAQI, PM2.5, PM10)
- 🚦 Live-Verkehrsauslastung (Geschwindigkeit vs. freie Fließgeschwindigkeit)
- 📣 Echte Verkehrsmeldungen (Unfälle, Baustellen, Sperrungen) auf Karte & Liste
- 🗺️ Interaktive Karte mit Live-Marker für gemeldete Vorfälle
- ⚠️ **Einsatzrisiko-Index**: heuristische Einschätzung (0–100), die Wetter- und Verkehrsdaten zu konkreten LSS-Einsatzvorschlägen verdichtet (z. B. „Verkehrsunfälle durch Glätte“, „Sturmschaden“, „Land unter“)
- 🔴 **Risiko-Badge direkt am In-Game-Button** – auf einen Blick erkennbar, ohne das Popup zu öffnen
- 🔔 Optionale Browser-Benachrichtigung, wenn das Einsatzrisiko auf „Hoch“/„Sehr hoch“ steigt
- 🌓 Dark Mode (folgt Systemeinstellung, manuell umschaltbar)
- 📋 „In Zwischenablage kopieren“-Button für eine schnelle Lage-Zusammenfassung (z. B. für Discord/Allianz-Chat)
- 🔁 Auto-Refresh alle 10 Minuten (Dashboard) bzw. 5 Minuten (Popup, inkl. Risiko-Badge im Hintergrund)
- 🧭 Deep-Link: Popup übergibt Stadt/Koordinaten per URL an das Dashboard

## 🛠️ Verwendete Technologien

- **Vanilla JavaScript** (kein Build-Schritt nötig)
- **Tailwind CSS** & **Font Awesome** für die Oberfläche
- **Leaflet.js** + OpenStreetMap für die Karte
- **Tampermonkey Userscript API** (`GM_xmlhttpRequest`, `GM_setValue`) für das In-Game-Popup

## 📁 Projektstruktur

```
index.html                          # Detail-Dashboard
assets/css/style.css                # Styles
assets/js/app.js                    # Dashboard-Logik (Fetch, Rendering, Karte)
mod/lss-verkehr-wetter-mod.user.js  # Tampermonkey-Mod fürs Spiel (Popup)
```

## 📌 Zielgruppe

- Spieler:innen des **Leitstellenspiels**, die reale Wetter-/Verkehrslage in ihre Einsatzplanung einbeziehen möchten
- Entwickler:innen, die an Echtzeit-Dashboards oder Userscript-Mods interessiert sind

## ⚠️ Hinweis

Dies ist ein inoffizielles Fan-Projekt ohne Verbindung zum Leitstellenspiel-Team. Die Nutzung von Drittanbieter-APIs unterliegt deren jeweiligen Nutzungsbedingungen (siehe [Open-Meteo](https://open-meteo.com/en/terms), [TomTom](https://developer.tomtom.com/terms-and-conditions), [OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)).

---

📬 Bei Fragen oder Verbesserungsvorschlägen gerne ein Issue eröffnen oder ein Pull-Request einreichen!
