/**
 * Kuratierter Auszug aus der LSS-Einsatzliste (vom Nutzer bereitgestellt).
 * Dient dem MockGameAdapter als Quelle für realistische synthetische Einsätze.
 * Schema: { name, poi, credits, requirements: [{type, count}], category }
 * "category" entspricht der LSS-Einsatzart und steuert Icon/Farbe auf der Karte.
 *
 * Dies ist eine repräsentative Auswahl (kein vollständiger 1:1-Abzug der ~300+
 * Zeilen der Originalliste), aber dem exakten Schema der Vorlage folgend, damit
 * sie beliebig um weitere Zeilen aus der Liste ergänzt werden kann.
 */
(function (global) {
  'use strict';

  const MISSIONS = [
    // ---- Feuerwehreinsätze (klein/mittel) ----
    { name: 'Mülleimerbrand', poi: null, credits: 110, requirements: [{ type: 'Feuerwache', count: 1 }], category: 'Feuerwehreinsätze' },
    { name: 'Brennendes Gras', poi: null, credits: 200, requirements: [{ type: 'Feuerwache', count: 1 }], category: 'Feuerwehreinsätze' },
    { name: 'Brennendes Laub', poi: null, credits: 210, requirements: [{ type: 'Feuerwache', count: 1 }], category: 'Feuerwehreinsätze' },
    { name: 'Strohballen-Brand', poi: null, credits: 250, requirements: [{ type: 'Feuerwache', count: 1 }], category: 'Feuerwehreinsätze' },
    { name: 'Traktorbrand', poi: null, credits: 600, requirements: [{ type: 'Feuerwache', count: 1 }], category: 'Feuerwehreinsätze' },
    { name: 'Baum auf Straße', poi: null, credits: 310, requirements: [{ type: 'Feuerwache', count: 1 }], category: 'Feuerwehreinsätze' },
    { name: 'Kleiner Feldbrand', poi: null, credits: 1000, requirements: [{ type: 'Feuerwache', count: 2 }], category: 'Feuerwehreinsätze' },
    { name: 'Kleiner Waldbrand', poi: 'Wald', credits: 1210, requirements: [{ type: 'Feuerwache', count: 2 }], category: 'Feuerwehreinsätze' },
    { name: 'Wohnwagenbrand', poi: null, credits: 1100, requirements: [{ type: 'Feuerwache', count: 2 }], category: 'Feuerwehreinsätze' },
    { name: 'Kellerbrand', poi: null, credits: 1200, requirements: [{ type: 'Feuerwache', count: 3 }], category: 'Feuerwehreinsätze' },
    { name: 'Schornsteinbrand', poi: null, credits: 2400, requirements: [{ type: 'Feuerwache', count: 3 }], category: 'Feuerwehreinsätze' },
    { name: 'Dachstuhlbrand', poi: null, credits: 2700, requirements: [{ type: 'Feuerwache', count: 3 }], category: 'Feuerwehreinsätze' },
    { name: 'Fettbrand in Pommesbude', poi: null, credits: 1200, requirements: [{ type: 'Feuerwache', count: 3 }], category: 'Feuerwehreinsätze' },
    { name: 'Garagenbrand', poi: null, credits: 1400, requirements: [{ type: 'Feuerwache', count: 4 }], category: 'Feuerwehreinsätze' },
    { name: 'Maschinenbrand', poi: null, credits: 2470, requirements: [{ type: 'Feuerwache', count: 5 }], category: 'Feuerwehreinsätze' },
    { name: 'Große Ölspur', poi: null, credits: 1900, requirements: [{ type: 'Feuerwache', count: 6 }], category: 'Feuerwehreinsätze' },
    { name: 'Auslaufende Betriebsstoffe', poi: null, credits: 400, requirements: [{ type: 'Feuerwache', count: 1 }], category: 'Feuerwehreinsätze' },
    { name: 'Brand im Supermarkt', poi: 'Supermarkt (Groß)', credits: 3710, requirements: [{ type: 'Feuerwache', count: 4 }], category: 'Feuerwehreinsätze' },
    { name: 'Tankstellenbrand', poi: 'Tankstelle', credits: 3900, requirements: [{ type: 'Feuerwache', count: 11 }, { type: 'Polizeiwache', count: 2 }], category: 'Feuerwehreinsätze' },
    { name: 'Küchenbrand', poi: null, credits: 800, requirements: [{ type: 'Feuerwache', count: 2 }], category: 'Feuerwehreinsätze' },
    { name: 'Sporthallenbrand', poi: 'Schule', credits: 3365, requirements: [{ type: 'Feuerwache', count: 13 }], category: 'Feuerwehreinsätze' },
    { name: 'Feuer in Einfamilienhaus', poi: null, credits: 2000, requirements: [{ type: 'Feuerwache', count: 4 }], category: 'Feuerwehreinsätze' },
    { name: 'Mittlerer Feldbrand', poi: null, credits: 2000, requirements: [{ type: 'Feuerwache', count: 7 }], category: 'Feuerwehreinsätze' },
    { name: 'Großer Feldbrand', poi: null, credits: 5000, requirements: [{ type: 'Feuerwache', count: 10 }], category: 'Feuerwehreinsätze' },
    { name: 'Großer Waldbrand', poi: 'Wald', credits: 5200, requirements: [{ type: 'Feuerwache', count: 8 }], category: 'Feuerwehreinsätze' },
    { name: 'Flächenbrand', poi: null, credits: 1500, requirements: [{ type: 'Feuerwache', count: 2 }], category: 'Feuerwehreinsätze' },
    { name: 'Straße unter Wasser', poi: null, credits: 3200, requirements: [{ type: 'Feuerwache', count: 9 }], category: 'Feuerwehreinsätze' },
    { name: 'Parkdeck voll Wasser gelaufen', poi: null, credits: 6100, requirements: [{ type: 'Feuerwache', count: 15 }, { type: 'Polizeiwache', count: 4 }], category: 'Feuerwehreinsätze' },
    { name: 'Bürobrand', poi: 'Bürokomplex', credits: 3000, requirements: [{ type: 'Feuerwache', count: 5 }, { type: 'Rettungswache', count: 5 }, { type: 'Polizeiwache', count: 2 }], category: 'Feuerwehreinsätze' },
    { name: 'Moorbrand', poi: 'Moor', credits: 10000, requirements: [{ type: 'Feuerwache', count: 20 }, { type: 'Polizeiwache', count: 3 }, { type: 'THW-Ortsverband', count: 1 }], category: 'Feuerwehreinsätze' },
    { name: 'Brand auf Kompostieranlage', poi: 'Kompostieranlage', credits: 9500, requirements: [{ type: 'Feuerwache', count: 12 }, { type: 'Polizeiwache', count: 2 }, { type: 'THW-Ortsverband', count: 1 }], category: 'Feuerwehreinsätze' },

    // ---- Rettungseinsätze ----
    { name: 'Alkoholintoxikation', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 1 }], category: 'Rettungseinsätze' },
    { name: 'Nasenbluten unstillbar', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 1 }], category: 'Rettungseinsätze' },
    { name: 'Herzinfarkt', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 3 }], category: 'Rettungseinsätze' },
    { name: 'Krampfanfall', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 3 }], category: 'Rettungseinsätze' },
    { name: 'Gestürzte Person', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 1 }], category: 'Rettungseinsätze' },
    { name: 'Schlaganfall', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 3 }], category: 'Rettungseinsätze' },
    { name: 'Beginnende Geburt', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 5 }], category: 'Rettungseinsätze' },
    { name: 'Schwangere in Notsituation', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 5 }], category: 'Rettungseinsätze' },
    { name: 'Sonnenstich', poi: null, credits: 250, requirements: [{ type: 'Rettungswache', count: 2 }], category: 'Rettungseinsätze' },
    { name: 'Hitzschlag', poi: null, credits: 250, requirements: [{ type: 'Rettungswache', count: 4 }], category: 'Rettungseinsätze' },
    { name: 'Unterzuckerung', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 3 }], category: 'Rettungseinsätze' },
    { name: 'Bewusstlose Person', poi: null, credits: null, requirements: [{ type: 'Rettungswache', count: 4 }], category: 'Rettungseinsätze' },
    { name: 'Verkeimter Eiswagen', poi: null, credits: 500, requirements: [{ type: 'Rettungswache', count: 2 }], category: 'Rettungseinsätze' },

    // ---- Polizeieinsätze ----
    { name: 'Ladendiebstahl', poi: 'Supermarkt (Klein)', credits: 100, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Parkendes Auto gerammt', poi: 'Supermarkt (Klein)', credits: 120, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Metalldiebstahl', poi: 'Güterbahnhof', credits: 150, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Taschendiebstahl', poi: 'Park', credits: 150, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Randalierende Person', poi: null, credits: 500, requirements: [{ type: 'Polizeiwache', count: 2 }], category: 'Polizeieinsätze' },
    { name: 'Häusliche Gewalt', poi: null, credits: 750, requirements: [{ type: 'Polizeiwache', count: 2 }], category: 'Polizeieinsätze' },
    { name: 'Einbruch in Wohnung', poi: null, credits: 400, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Ruhestörung', poi: null, credits: 250, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Trunkenheitsfahrt', poi: null, credits: 150, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Ampelausfall', poi: null, credits: 100, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Motorradunfall', poi: null, credits: 600, requirements: [{ type: 'Feuerwache', count: 1 }, { type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Sachbeschädigung', poi: null, credits: 200, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Wildunfall', poi: null, credits: 200, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Verkehrsüberwachung', poi: null, credits: 1200, requirements: [{ type: 'Polizeiwache', count: 2 }], category: 'Polizeieinsätze' },
    { name: 'Schwertransport', poi: null, credits: 2400, requirements: [{ type: 'Polizeiwache', count: 4 }], category: 'Polizeieinsätze' },
    { name: 'Geplante Festnahme', poi: null, credits: 4500, requirements: [{ type: 'Polizeiwache', count: 4 }, { type: 'MEK-Wache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Geplante Autobahnsperrung', poi: 'Autobahnauf.-/abfahrt', credits: 2400, requirements: [{ type: 'Polizeiwache', count: 4 }], category: 'Polizeieinsätze' },
    { name: 'Vollstreckung Haftbefehl', poi: null, credits: 550, requirements: [{ type: 'Polizeiwache', count: 2 }], category: 'Polizeieinsätze' },
    { name: 'Observation', poi: null, credits: 8000, requirements: [{ type: 'MEK-Wache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'Absicherung Geldtransport', poi: null, credits: 6400, requirements: [{ type: 'MEK-Wache', count: 1 }], category: 'Polizeieinsätze' },

    // ---- Verkehrsunfälle (Feuerwehr, oft mit Polizei) ----
    { name: 'Verkehrsunfall', poi: null, credits: 1000, requirements: [{ type: 'Feuerwache', count: 3 }], category: 'Feuerwehreinsätze' },
    { name: 'Verkehrsunfall', poi: null, credits: 1100, requirements: [{ type: 'Feuerwache', count: 3 }, { type: 'Polizeiwache', count: 4 }], category: 'Feuerwehreinsätze' },
    { name: 'Verkehrsunfall', poi: null, credits: 1600, requirements: [{ type: 'Feuerwache', count: 4 }], category: 'Feuerwehreinsätze' },
    { name: 'Verkehrsunfall', poi: null, credits: 2000, requirements: [{ type: 'Feuerwache', count: 6 }], category: 'Feuerwehreinsätze' },
    { name: 'Auffahrunfall', poi: null, credits: 700, requirements: [{ type: 'Feuerwache', count: 1 }, { type: 'Polizeiwache', count: 1 }], category: 'Polizeieinsätze' },
    { name: 'LKW umgestürzt', poi: null, credits: 2200, requirements: [{ type: 'Feuerwache', count: 8 }], category: 'Feuerwehreinsätze' },
    { name: 'Baum auf PKW', poi: null, credits: 900, requirements: [{ type: 'Feuerwache', count: 4 }], category: 'Feuerwehreinsätze' },
    { name: 'Baum auf Dach', poi: null, credits: 1400, requirements: [{ type: 'Feuerwache', count: 6 }], category: 'Feuerwehreinsätze' },
    { name: 'Ölspur auf Autobahn', poi: null, credits: 1465, requirements: [{ type: 'Feuerwache', count: 3 }, { type: 'Autobahnpolizeiwache', count: 1 }], category: 'Autobahnpolizei-Einsätze' },

    // ---- Wasserrettungs-Einsätze ----
    { name: 'Person in Wasser', poi: 'See', credits: 1000, requirements: [{ type: 'Wasserrettungswache', count: 1 }], category: 'Wasserrettungs-Einsätze' },
    { name: 'Person in Wasser', poi: 'Fluss', credits: 1000, requirements: [{ type: 'Wasserrettungswache', count: 1 }], category: 'Wasserrettungs-Einsätze' },
    { name: 'Gewässerverschmutzung durch Öl', poi: 'See', credits: 1600, requirements: [{ type: 'Feuerwache', count: 3 }, { type: 'Wasserrettungswache', count: 1 }, { type: 'Polizeiwache', count: 1 }], category: 'Wasserrettungs-Einsätze' },
    { name: 'Badestellenüberwachung', poi: 'See', credits: 1200, requirements: [{ type: 'Wasserrettungswache', count: 1 }], category: 'Wasserrettungs-Einsätze' },
    { name: 'Tauchunfall', poi: 'See', credits: 1000, requirements: [{ type: 'Rettungswache', count: 1 }, { type: 'Wasserrettungswache', count: 1 }], category: 'Wasserrettungs-Einsätze' },

    // ---- THW-Einsätze ----
    { name: 'LKW in Hauswand', poi: null, credits: 2100, requirements: [{ type: 'Feuerwache', count: 5 }, { type: 'THW-Ortsverband', count: 1 }], category: 'THW-Einsätze' },
    { name: 'Ladungsbergung LKW', poi: null, credits: 1500, requirements: [{ type: 'Feuerwache', count: 5 }, { type: 'Polizeiwache', count: 2 }, { type: 'THW-Ortsverband', count: 1 }], category: 'THW-Einsätze' },
    { name: 'Beseitigung kontaminierter Erde', poi: null, credits: 1000, requirements: [{ type: 'Polizeiwache', count: 1 }, { type: 'THW-Ortsverband', count: 1 }], category: 'THW-Einsätze' },
    { name: 'Mehrere Keller unter Wasser', poi: null, credits: 1260, requirements: [{ type: 'THW-Ortsverband', count: 1 }], category: 'THW-Einsätze' },
    { name: 'Tunnel unter Wasser (Klein)', poi: 'Tunnel', credits: 4470, requirements: [{ type: 'Feuerwache', count: 6 }, { type: 'Polizeiwache', count: 2 }, { type: 'THW-Ortsverband', count: 1 }], category: 'THW-Einsätze' },
    { name: 'Gewässer gekippt (Groß)', poi: 'See', credits: 6510, requirements: [{ type: 'Feuerwache', count: 15 }, { type: 'THW-Ortsverband', count: 4 }], category: 'THW-Einsätze' },

    // ---- Werkfeuerwehr-Einsätze ----
    { name: 'Brennender PKW', poi: 'Automobilindustrie', credits: 900, requirements: [{ type: 'Feuerwache', count: 1 }, { type: 'Werkfeuerwehr', count: 1 }], category: 'Werkfeuerwehr-Einsätze' },
    { name: 'Verpuffung', poi: 'Chemiepark', credits: 3000, requirements: [{ type: 'Feuerwache', count: 6 }, { type: 'Werkfeuerwehr', count: 1 }], category: 'Werkfeuerwehr-Einsätze' },
    { name: 'Unfall beim Umpumpen von Flüssigkeiten', poi: 'Chemiepark Raffinerie', credits: 5100, requirements: [{ type: 'Feuerwache', count: 10 }, { type: 'Rettungswache', count: 2 }, { type: 'Werkfeuerwehr', count: 1 }], category: 'Werkfeuerwehr-Einsätze' },
    { name: 'Auslaufendes Metall aus Hochofen', poi: 'Hüttenwerk', credits: 4000, requirements: [{ type: 'Feuerwache', count: 6 }, { type: 'Werkfeuerwehr', count: 1 }], category: 'Werkfeuerwehr-Einsätze' },

    // ---- Bergrettungseinsätze ----
    { name: 'Höhenrettung aus Gondel', poi: 'Seilbahn', credits: 685, requirements: [{ type: 'Bergrettungswache', count: 1 }], category: 'Bergrettungseinsätze' },
    { name: 'Hautreaktion nach Kontakt mit giftiger Pflanze', poi: null, credits: 550, requirements: [{ type: 'Rettungswache', count: 5 }, { type: 'Bergrettungswache', count: 2 }], category: 'Bergrettungseinsätze' },

    // ---- Seenotrettungseinsätze ----
    { name: 'Rettung eines über Bord gegangenen Seglers', poi: null, credits: 4000, requirements: [{ type: 'Rettungswache', count: 2 }, { type: 'Seenotrettungswache', count: 2 }], category: 'Seenotrettungseinsätze' },
    { name: 'Ausgebrannte Segelyacht', poi: null, credits: 8600, requirements: [{ type: 'Seenotrettungswache', count: 3 }], category: 'Seenotrettungseinsätze' },
    { name: 'Suche nach vermisster Person', poi: null, credits: 4000, requirements: [{ type: 'Rettungswache', count: 2 }, { type: 'Seenotrettungswache', count: 3 }], category: 'Seenotrettungseinsätze' },

    // ---- Autobahnpolizei-Einsätze ----
    { name: 'Verkehrsunfall auf Autobahn', poi: null, credits: 550, requirements: [{ type: 'Autobahnpolizeiwache', count: 1 }], category: 'Autobahnpolizei-Einsätze' },
    { name: 'Verkehrsunfall auf Autobahn (Person eingeklemmt)', poi: null, credits: 2870, requirements: [{ type: 'Feuerwache', count: 5 }, { type: 'Rettungswache', count: 2 }, { type: 'Autobahnpolizeiwache', count: 2 }], category: 'Autobahnpolizei-Einsätze' },
    { name: 'Absicherung Schwertransport', poi: null, credits: 7200, requirements: [{ type: 'Autobahnpolizeiwache', count: 2 }], category: 'Autobahnpolizei-Einsätze' },
    { name: 'Pannenfahrzeug auf Autobahn', poi: null, credits: 275, requirements: [{ type: 'Autobahnpolizeiwache', count: 1 }], category: 'Autobahnpolizei-Einsätze' },

    // ---- Bereitschaftspolizei / Kriminalpolizei ----
    { name: 'Schwerpunkteinsatz Tageswohnungseinbrüche', poi: null, credits: 1000, requirements: [{ type: 'Bereitschaftspolizeiwache', count: 1 }], category: 'Bereitschaftspolizei-Einsätze' },
    { name: 'Durchsuchung - Gebäudekomplex', poi: null, credits: 6500, requirements: [{ type: 'Polizeiwache', count: 1 }, { type: 'Bereitschaftspolizeiwache', count: 2 }], category: 'Kriminalpolizei-Einsätze' },
    { name: 'Vollstreckung Durchsuchungsbeschluss', poi: null, credits: 800, requirements: [{ type: 'Polizeiwache', count: 1 }], category: 'Kriminalpolizei-Einsätze' },

    // ---- Flughafenfeuerwehr-Einsätze ----
    { name: 'Rauch in Kabine', poi: 'Flughafen (groß): Start-/Landebahn', credits: 1200, requirements: [{ type: 'Feuerwache', count: 1 }], category: 'Flughafenfeuerwehr-Einsätze' },
    { name: 'Flugzeugzusammenstoß am Boden', poi: 'Flughafen (groß): Vorfeld/Standplätze', credits: 3000, requirements: [{ type: 'Feuerwache', count: 5 }, { type: 'Rettungswache', count: 4 }], category: 'Flughafenfeuerwehr-Einsätze' },
    { name: 'Brennendes Kleinflugzeug', poi: 'Flughafen (klein): Start-/Landebahn', credits: 6000, requirements: [{ type: 'Feuerwache', count: 13 }, { type: 'Rettungswache', count: 5 }], category: 'Flughafenfeuerwehr-Einsätze' },

    // ---- SEG-/NEA-Einsätze ----
    { name: 'Volkslauf', poi: null, credits: 10400, requirements: [{ type: 'Rettungswache', count: 3 }], category: 'SEG-Sanitätsdienst-Einsätze' },
    { name: 'Ersatz-Stromversorgung einer Krankenhausstation', poi: null, credits: 2400, requirements: [{ type: 'NEA50-Erweiterung', count: 1 }], category: 'NEA50-Einsätze' },
    { name: 'Stromausfall im Rathaus', poi: null, credits: 2000, requirements: [{ type: 'NEA200-Erweiterung', count: 1 }], category: 'NEA200-Einsätze' },
  ];

  // Grobe visuelle Zuordnung pro Einsatzart für Kartenmarker/Ticker.
  const CATEGORY_STYLE = {
    'Feuerwehreinsätze': { color: '#dc2626', icon: '🔥', short: 'FW' },
    'Rettungseinsätze': { color: '#ef4444', icon: '🚑', short: 'RD' },
    'Polizeieinsätze': { color: '#16a34a', icon: '🚓', short: 'POL' },
    'Werkfeuerwehr-Einsätze': { color: '#991b1b', icon: '🏭', short: 'WF' },
    'Wasserrettungs-Einsätze': { color: '#0284c7', icon: '🚤', short: 'WR' },
    'THW-Einsätze': { color: '#1d4ed8', icon: '🛠️', short: 'THW' },
    'Bereitschaftspolizei-Einsätze': { color: '#15803d', icon: '🛡️', short: 'BPOL' },
    'Kriminalpolizei-Einsätze': { color: '#065f46', icon: '🔎', short: 'KRIPO' },
    'Autobahnpolizei-Einsätze': { color: '#0d9488', icon: '🛣️', short: 'AUT' },
    'Flughafenfeuerwehr-Einsätze': { color: '#f97316', icon: '✈️', short: 'FLU' },
    'Bergrettungseinsätze': { color: '#78350f', icon: '⛰️', short: 'BERG' },
    'Seenotrettungseinsätze': { color: '#1e3a8a', icon: '⚓', short: 'SEE' },
    'SEG-Sanitätsdienst-Einsätze': { color: '#7e22ce', icon: '⛑️', short: 'SEG' },
    'NEA50-Einsätze': { color: '#ca8a04', icon: '🔌', short: 'NEA' },
    'NEA200-Einsätze': { color: '#ca8a04', icon: '🔌', short: 'NEA' },
  };

  global.LSS_MISSIONS = MISSIONS;
  global.LSS_CATEGORY_STYLE = CATEGORY_STYLE;
})(window);
