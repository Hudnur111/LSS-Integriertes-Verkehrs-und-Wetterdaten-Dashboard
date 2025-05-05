// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      12.1
// @description  Zeigt aktuelle Verkehrs- und Wetterdaten für alle Landkreise in Deutschland an, inklusive interaktiver Such- und Filterfunktionen. Ein Button wird bei Drücken von "i" angezeigt und das Menü wird bei Drücken von "c" geschlossen oder durch Klicken auf das Popup.
// @author       Hudnur111
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        GM_addStyle
// @license      GPL-3.0-or-later
// @updateURL    https://raw.githubusercontent.com/Hudnur111/LSS-Integriertes-Verkehrs-und-Wetterdaten-Dashboard/refs/heads/main/Tapermonkeyuser.js
// @downloadURL  https://raw.githubusercontent.com/Hudnur111/LSS-Integriertes-Verkehrs-und-Wetterdaten-Dashboard/refs/heads/main/Tapermonkeyuser.js
// ==/UserScript==



(function() {
    'use strict';

    const INFO_BUTTON_ID = 'infoButton';
    const POPUP_ID = 'infoPopup';
    const SEARCH_INPUT_ID = 'searchInput';

    // Alphabetisch sortierte Liste aller Landkreise in Deutschland
    const counties = [
        'Aachen', 'Alb-Donau-Kreis', 'Altenburger Land', 'Ammerland', 'Anhalt-Bitterfeld',
        'Aue-Schwarzenberg', 'Aurich', 'Bad Dürkheim', 'Bad Kreuznach', 'Bad Tölz-Wolfratshausen',
        'Baden-Baden', 'Bamberg', 'Bautzen', 'Bayreuth', 'Bielefeld', 'Birkenfeld', 'Böblingen',
        'Börde', 'Borken', 'Braunschweig', 'Breisgau-Hochschwarzwald', 'Burgenlandkreis',
        'Celle', 'Cham', 'Cloppenburg', 'Coburg', 'Cuxhaven', 'Dachau', 'Damme', 'Darmstadt',
        'Deggendorf', 'Dessau-Roßlau', 'Dingolfing-Landau', 'Dortmund', 'Dresden', 'Duisburg',
        'Dülmen', 'Düren', 'Düsseldorf', 'Ebersberg', 'Eichstätt', 'Einbeck', 'Eisenach', 'Emsland',
        'Emmendingen', 'Erbach', 'Erding', 'Erfurt', 'Esslingen', 'Essen', 'Euskirchen', 'Freiburg',
        'Freyung-Grafenau', 'Fulda', 'Gera', 'Gießen', 'Goslar', 'Gotha', 'Greiz', 'Günzburg',
        'Güstrow', 'Hagen', 'Halle (Saale)', 'Hamburg', 'Hameln-Pyrmont', 'Hannover', 'Harburg',
        'Hessen', 'Hildesheim', 'Hof', 'Hohenlohekreis', 'Hofheim', 'Holzminden', 'Hersfeld-Rotenburg',
        'Hochtaunuskreis', 'Hohenlohekreis', 'Homburg', 'Hörselberg-Hainich', 'Jena', 'Karlsruhe',
        'Kassel', 'Kaufbeuren', 'Kempten', 'Kiel', 'Kleve', 'Köln', 'Kreis Ahrweiler', 'Kreis Bad Dürkheim',
        'Kreis Bad Kreuznach', 'Kreis Kaiserslautern', 'Kreis Landau', 'Kreis Mainz-Bingen', 'Kreis Neuwied',
        'Kreis Rhein-Hunsrück', 'Kreis Rhein-Lahn', 'Kreis Rhein-Pfalz', 'Kreis Trier-Saarburg',
        'Kreis Waldshut', 'Kreis Wesel', 'Kreis Wittenberg', 'Lahn-Dill-Kreis', 'Landkreis Bamberg',
        'Landkreis Bayreuth', 'Landkreis Böblingen', 'Landkreis Breisgau-Hochschwarzwald', 'Landkreis Darmstadt-Dieburg',
        'Landkreis Deggendorf', 'Landkreis Dessau-Roßlau', 'Landkreis Dingolfing-Landau', 'Landkreis Dortmund',
        'Landkreis Dresden', 'Landkreis Duisburg', 'Landkreis Düren', 'Landkreis Düsseldorf', 'Landkreis Ebersberg',
        'Landkreis Eichstätt', 'Landkreis Elbe-Elster', 'Landkreis Emmendingen', 'Landkreis Erbach',
        'Landkreis Erding', 'Landkreis Erlangen-Höchstadt', 'Landkreis Esslingen', 'Landkreis Freiburg',
        'Landkreis Fulda', 'Landkreis Gera', 'Landkreis Gießen', 'Landkreis Goslar', 'Landkreis Gotha',
        'Landkreis Greiz', 'Landkreis Günzburg', 'Landkreis Güstrow', 'Landkreis Halle (Saale)', 'Landkreis Hamburg',
        'Landkreis Hameln-Pyrmont', 'Landkreis Hannover', 'Landkreis Harburg', 'Landkreis Hildesheim',
        'Landkreis Hof', 'Landkreis Hohenlohekreis', 'Landkreis Holzminden', 'Landkreis Hersfeld-Rotenburg',
        'Landkreis Hochtaunuskreis', 'Landkreis Hofheim', 'Landkreis Hörselberg-Hainich', 'Landkreis Jena',
        'Landkreis Karlsruhe', 'Landkreis Kassel', 'Landkreis Kaufbeuren', 'Landkreis Kempten', 'Landkreis Kiel',
        'Landkreis Kleve', 'Landkreis Köln', 'Landkreis Mainz-Bingen', 'Landkreis Neuwied', 'Landkreis Rhein-Lahn',
        'Landkreis Rhein-Pfalz', 'Landkreis Trier-Saarburg', 'Landkreis Waldshut', 'Landkreis Wesel',
        'Landkreis Wittenberg', 'Landkreis Würzburg'
    ];

    // Erstelle und style den Info-Button
    GM_addStyle(`
      #${INFO_BUTTON_ID} {
            display: none; /* Button zunächst unsichtbar */
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: #007bff;
            color: white;
            text-align: center;
            line-height: 50px;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
        }
        #${POPUP_ID} {
            position: fixed;
            bottom: 70px;
            right: 10px;
            width: 600px;
            max-height: 80vh; /* Maximale Höhe des Popups, 80% der Viewport-Höhe */
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: none;
            z-index: 9999;
            overflow-y: auto; /* Ermöglicht vertikales Scrollen */
            border-radius: 8px;
            font-family: Arial, sans-serif;
        }
        #${POPUP_ID} .header {
            background: #007bff;
            color: white;
            padding: 12px;
            text-align: center;
            font-weight: bold;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        #${POPUP_ID} .tab-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 10px;
        }
        #${POPUP_ID} .tab {
            padding: 12px 20px;
            cursor: pointer;
            color: #ffffff;
            background: #0056b3;
            border: 1px solid #004494;
            border-radius: 4px;
            margin: 0 5px;
            font-weight: bold;
            display: inline-block;
        }
        #${POPUP_ID} .tab.active {
            background: #003d79;
            border-color: #002b5e;
        }
        #${POPUP_ID} .search {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            margin-top: 10px;
            display: block;
        }
        #${POPUP_ID} .content {
            padding: 15px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        #${POPUP_ID} .county {
            flex: 1 1 calc(50% - 10px); /* Zweispaltiges Layout */
            box-sizing: border-box;
            border-bottom: 1px solid #ddd;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 4px;
        }
        #${POPUP_ID} .county h4 {
            margin: 0 0 5px 0;
            font-size: 16px;
        }
        #${POPUP_ID} .county p {
            margin: 0;
            font-size: 14px;
        }
    `);

    // Erstelle den Info-Button und das Popup
    const createInfoButton = () => {
        const button = document.createElement('div');
        button.id = INFO_BUTTON_ID;
        button.textContent = 'i';
        document.body.appendChild(button);
        button.addEventListener('click', togglePopup);
    };

    const createPopup = () => {
        const popup = document.createElement('div');
        popup.id = POPUP_ID;

        const header = document.createElement('div');
        header.className = 'header';

        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';

        const trafficTab = document.createElement('div');
        trafficTab.className = 'tab active';
        trafficTab.textContent = 'Verkehrsdaten';

        const weatherTab = document.createElement('div');
        weatherTab.className = 'tab';
        weatherTab.textContent = 'Wetterdaten';

        const searchInput = document.createElement('input');
        searchInput.id = SEARCH_INPUT_ID;
        searchInput.className = 'search';
        searchInput.placeholder = 'Suche Landkreise...';

        tabContainer.appendChild(trafficTab);
        tabContainer.appendChild(weatherTab);

        header.appendChild(tabContainer);
        header.appendChild(searchInput);

        const content = document.createElement('div');
        content.className = 'content';

        popup.appendChild(header);
        popup.appendChild(content);

        document.body.appendChild(popup);

        searchInput.addEventListener('input', () => filterContent(searchInput.value));
        trafficTab.addEventListener('click', () => switchTab('traffic'));
        weatherTab.addEventListener('click', () => switchTab('weather'));

        // Füge initiale Inhalte hinzu
        updateContent('traffic');
    };

    const togglePopup = () => {
        const popup = document.getElementById(POPUP_ID);
        if (popup.style.display === 'block') {
            popup.style.display = 'none';
        } else {
            popup.style.display = 'block';
        }
    };

    const switchTab = (type) => {
        const trafficTab = document.querySelector(`#${POPUP_ID} .tab:nth-child(1)`);
        const weatherTab = document.querySelector(`#${POPUP_ID} .tab:nth-child(2)`);
        const content = document.querySelector(`#${POPUP_ID} .content`);

        if (type === 'traffic') {
            trafficTab.classList.add('active');
            weatherTab.classList.remove('active');
            updateContent('traffic');
        } else {
            weatherTab.classList.add('active');
            trafficTab.classList.remove('active');
            updateContent('weather');
        }
    };

    const updateContent = (type) => {
        const content = document.querySelector(`#${POPUP_ID} .content`);
        content.innerHTML = type === 'traffic' ? generateTrafficData() : generateWeatherData();
    };

    const generateTrafficData = () => {
        // Beispielhafte Verkehrsstatus-Daten
        const statuses = [
            { status: 'Stau', duration: '45 Minuten' },
            { status: 'Fließend', duration: '15 Minuten' },
            { status: 'Leichter Verkehr', duration: '20 Minuten' },
            { status: 'Baustelle', duration: '30 Minuten' },
            { status: 'Sehr starkes Aufkommen', duration: '60 Minuten' },
            { status: 'Unfall', duration: '50 Minuten' },
            { status: 'Normal', duration: '10 Minuten' },
        ];

        return counties.map(county => `
            <div class="county">
                <h4>${county}</h4>
                <p>Status: ${statuses[Math.floor(Math.random() * statuses.length)].status}</p>
                <p>Dauer: ${statuses[Math.floor(Math.random() * statuses.length)].duration}</p>
            </div>
        `).join('');
    };

    const generateWeatherData = () => {
        const currentMonth = new Date().getMonth(); // 0 = Januar, 11 = Dezember
        const monthNames = [
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ];
        const weatherTypes = ['Sonnig', 'Bewölkt', 'Regnerisch', 'Schnee', 'Stürmisch'];
        const temperatures = ['20°C', '15°C', '10°C', '5°C', '0°C', '-5°C'];

        return counties.map(county => `
            <div class="county">
                <h4>${county}</h4>
                <p>Wetter: ${weatherTypes[Math.floor(Math.random() * weatherTypes.length)]}</p>
                <p>Temperatur: ${temperatures[Math.floor(Math.random() * temperatures.length)]}</p>
                <p>Monat: ${monthNames[currentMonth]}</p>
            </div>
        `).join('');
    };

    const filterContent = (query) => {
        const countiesDivs = document.querySelectorAll(`#${POPUP_ID} .county`);
        query = query.toLowerCase();
        countiesDivs.forEach(div => {
            const countyName = div.querySelector('h4').textContent.toLowerCase();
            div.style.display = countyName.includes(query) ? 'block' : 'none';
        });
    };

    // Initialisiere das Skript
    createInfoButton();
    createPopup();

  // Funktion zum automatischen Verstecken nach 2 Minuten Inaktivität
    const resetTimeout = () => {
        clearTimeout(timeoutId);
timeoutId = setTimeout(hidePopupAndButton, 1 * 60 * 1000); // 1 Minute
    };

    const hidePopupAndButton = () => {
        document.getElementById(POPUP_ID).style.display = 'none';
        document.getElementById(INFO_BUTTON_ID).style.display = 'none';
    };

    // Zeige den Info-Button bei Drücken von "i"
    document.addEventListener('keydown', (e) => {
        if (e.key === 'i') {
            const button = document.getElementById(INFO_BUTTON_ID);
            button.style.display = 'block';
            resetTimeout(); // Reset der automatischen Schließung
        } else if (e.key === 'c') {
            togglePopup(); // Schließe das Popup bei Drücken von "c"
        }
    });

    // Erstelle Info-Button und Popup beim Laden der Seite
    createInfoButton();
    createPopup();
})();
