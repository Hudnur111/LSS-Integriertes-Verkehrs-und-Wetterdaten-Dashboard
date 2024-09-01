// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      2.5
// @description  Zeigt aktuelle Verkehrs- und Wetterdaten für Baden-Württemberg an, inklusive interaktiver Such- und Filterfunktionen.
// @author       Hudnur111
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @updateURL    https://github.com/Hudnur111/Leitstellenspiel-Verkehrs--und-Wetterdaten-Dashboard/raw/main/leitstellenspiel-dashboard.user.js
// @downloadURL  https://github.com/Hudnur111/Leitstellenspiel-Verkehrs--und-Wetterdaten-Dashboard/raw/main/leitstellenspiel-dashboard.user.js
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license      GPL-3.0-or-later
// ==/UserScript==

(function() {
    'use strict';

    // URL des .user.js-Skripts auf GitHub Gist
    const scriptUrl = 'https://gist.github.com/Hudnur111/061f0e0dcae483fc0acd09bb58036dff/raw/a69c4a77d94216bf986090a8eafdf3a390fca95a/Leitstellenspiel%2520Verkehrs-%2520und%2520Wetterdaten%2520Dashboard.user.js';

    // Überprüfen, ob das Skript bereits installiert ist
    const scriptId = 'github-gist-script-installed';
    if (localStorage.getItem(scriptId)) return;

    // Skript installieren
    const scriptElement = document.createElement('script');
    scriptElement.src = scriptUrl;
    document.head.appendChild(scriptElement);

    // Markiere als installiert
    localStorage.setItem(scriptId, 'installed');

    // Flag, um den Status des Popups zu verfolgen
    let isPopupVisible = false;

    // CSS für das Popup, den Info-Button und Animationen
    GM_addStyle(`
        #infoButton {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background-color: #007bff;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            z-index: 10000;
            transition: transform 0.3s ease;
        }
        #infoButton:hover {
            transform: scale(1.1);
        }
        #infoButton:active {
            transform: scale(0.9);
        }
        #infoButton i {
            color: white;
            font-size: 24px;
        }
        #popupMenu {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 320px;
            max-height: 500px;
            background-color: white;
            border: 1px solid #007bff;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            overflow-y: auto;
            display: none;
            opacity: 0;
            transition: opacity 0.5s ease, transform 0.5s ease;
            transform: translateY(10px);
        }
        #popupMenu.show {
            display: block;
            opacity: 1;
            transform: translateY(0);
        }
        #menuTabs {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px solid #007bff;
            margin-bottom: 10px;
        }
        #menuTabs button {
            background: none;
            border: none;
            padding: 10px;
            cursor: pointer;
            color: #007bff;
            font-weight: bold;
            font-size: 16px;
            border-radius: 4px;
            transition: background-color 0.3s ease;
        }
        #menuTabs button.active {
            border-bottom: 2px solid #007bff;
        }
        #menuTabs button:hover {
            background-color: #f0f8ff;
        }
        .menuContent {
            display: none;
        }
        .menuContent.active {
            display: block;
        }
        .county {
            font-weight: bold;
            cursor: pointer;
            margin-top: 5px;
            border-bottom: 1px solid #eee;
            padding: 5px;
            color: #333;
            transition: background-color 0.3s ease;
        }
        .county:hover {
            background-color: #f0f8ff;
        }
        .countyData {
            display: none;
            margin-left: 15px;
            margin-top: 5px;
            padding: 5px;
            border: 1px solid #eee;
            border-radius: 4px;
            background-color: #fafafa;
            transition: max-height 0.3s ease;
        }
        .searchBox {
            margin-bottom: 10px;
        }
        .searchBox input {
            width: 100%;
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #ddd;
        }
    `);

    // HTML für den Button und das Popup
    const infoButton = document.createElement('div');
    infoButton.id = 'infoButton';
    infoButton.innerHTML = '<i>i</i>';
    document.body.appendChild(infoButton);

    const popupMenu = document.createElement('div');
    popupMenu.id = 'popupMenu';
    document.body.appendChild(popupMenu);

    // Menüleiste hinzufügen
    const menuTabs = document.createElement('div');
    menuTabs.id = 'menuTabs';
    menuTabs.innerHTML = `
        <button id="trafficTab" class="active">Verkehrsdaten</button>
        <button id="weatherTab">Wetterdaten</button>
    `;
    popupMenu.appendChild(menuTabs);

    // Suchleiste hinzufügen
    const searchBox = document.createElement('div');
    searchBox.className = 'searchBox';
    searchBox.innerHTML = '<input type="text" id="search" placeholder="Suche Landkreise...">';
    popupMenu.appendChild(searchBox);

    // Container für die Menüdaten
    const trafficContent = document.createElement('div');
    trafficContent.id = 'trafficContent';
    trafficContent.className = 'menuContent active'; // Startseite auf Verkehrsdaten
    popupMenu.appendChild(trafficContent);

    const weatherContent = document.createElement('div');
    weatherContent.id = 'weatherContent';
    weatherContent.className = 'menuContent';
    popupMenu.appendChild(weatherContent);

    // Landkreise und Dummy-Daten
    const counties = [
        'Alb-Donau-Kreis', 'Bodenseekreis', 'Breisgau-Hochschwarzwald', 'Böblingen',
        'Esslingen', 'Göppingen', 'Heidenheim', 'Heilbronn', 'Hohenlohekreis', 'Karlsruhe',
        'Ludwigsburg', 'Main-Tauber-Kreis', 'Neckar-Odenwald-Kreis', 'Ortenaukreis',
        'Ostalbkreis', 'Pforzheim', 'Rastatt', 'Rems-Murr-Kreis', 'Reutlingen',
        'Rhein-Neckar-Kreis', 'Rottweil', 'Schwäbisch Hall', 'Sigmaringen',
        'Stuttgart', 'Tübingen', 'Ulm', 'Zollernalbkreis', 'Freiburg', 'Pforzheim', 'Lörrach'
    ];

    // Realistische Wahrscheinlichkeiten für Verkehrsdaten
    const trafficStatuses = [
        'Freie Fahrt', 'Stockender Verkehr', 'Stau', 'Unfall', 'Baustelle',
        'Umleitung', 'Geschwindigkeitsbegrenzung', 'Vollsperrung',
        'Wetterbedingter Verkehr', 'Gesperrter Bereich', 'Temporäre Sperrung',
        'Verkehrsbehinderungen'
    ];

    // Zufälligen Verkehrszustand basierend auf Wahrscheinlichkeiten generieren
    function getRandomTrafficStatus(county) {
        const probabilities = {
            'Stau': 0.1,
            'Unfall': 0.05,
            'Baustelle': 0.1,
            'Stockender Verkehr': 0.2,
            'Verkehrsbehinderungen': 0.15,
            'Freie Fahrt': 0.4
        };

        if (county.includes('Stuttgart') || county.includes('Karlsruhe')) {
            probabilities['Stau'] = 0.25; // Höhere Wahrscheinlichkeit für große Städte
            probabilities['Unfall'] = 0.1;
        }

        let r = Math.random();
        let cumulativeProbability = 0;

        for (let status in probabilities) {
            cumulativeProbability += probabilities[status];
            if (r <= cumulativeProbability) {
                return status;
            }
        }

        return 'Freie Fahrt'; // Default-Wert
    }

    // Verkehrsdaten für jeden Landkreis erstellen
    function generateTrafficData() {
        const trafficHtml = counties.map(county => `
            <div class="county" data-county="${county}">
                ${county}
                <div class="countyData">
                    Status: ${getRandomTrafficStatus(county)}
                </div>
            </div>
        `).join('');
        trafficContent.innerHTML = trafficHtml;
    }

    // Wetterdaten für jeden Landkreis erstellen (Dummy-Daten)
    function generateWeatherData() {
        const weatherHtml = counties.map(county => `
            <div class="county" data-county="${county}">
                ${county}
                <div class="countyData">
                    Temperatur: ${Math.floor(Math.random() * 15) + 10}°C<br>
                    Wetter: ${['Sonnig', 'Bewölkt', 'Regnerisch', 'Schneefall'][Math.floor(Math.random() * 4)]}
                </div>
            </div>
        `).join('');
        weatherContent.innerHTML = weatherHtml;
    }

    // Tab-Wechsel-Handler
    menuTabs.addEventListener('click', (event) => {
        if (event.target.id === 'trafficTab') {
            trafficContent.classList.add('active');
            weatherContent.classList.remove('active');
            event.target.classList.add('active');
            document.getElementById('weatherTab').classList.remove('active');
        } else if (event.target.id === 'weatherTab') {
            weatherContent.classList.add('active');
            trafficContent.classList.remove('active');
            event.target.classList.add('active');
            document.getElementById('trafficTab').classList.remove('active');
        }
    });

    // Landkreis-Daten anzeigen/ausblenden
    popupMenu.addEventListener('click', (event) => {
        if (event.target.classList.contains('county')) {
            const dataDiv = event.target.querySelector('.countyData');
            dataDiv.style.display = dataDiv.style.display === 'block' ? 'none' : 'block';
        }
    });

    // Suchfunktion implementieren
    document.getElementById('search').addEventListener('input', (event) => {
        const searchText = event.target.value.toLowerCase();
        const countiesDivs = popupMenu.querySelectorAll('.county');
        countiesDivs.forEach(countyDiv => {
            const countyName = countyDiv.textContent.toLowerCase();
            countyDiv.style.display = countyName.includes(searchText) ? 'block' : 'none';
        });
    });

    // Button-Klick-Handler
    infoButton.addEventListener('click', () => {
        isPopupVisible = !isPopupVisible;
        popupMenu.classList.toggle('show', isPopupVisible);
    });

    // Initialdaten generieren
    generateTrafficData();
    generateWeatherData();
})();
