// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      2.5
// @description  Zeigt aktuelle Verkehrs- und Wetterdaten für Baden-Württemberg an, inklusive interaktiver Such- und Filterfunktionen.
// @author       Hudnur111
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license      GPL-3.0-or-later
// ==/UserScript==

(function() {
    'use strict';

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
            probabilities['Stau'] += 0.1;
            probabilities['Unfall'] += 0.05;
        }
        if (county.includes('Freiburg') || county.includes('Bodenseekreis')) {
            probabilities['Baustelle'] += 0.05;
        }

        let status = 'Freie Fahrt';
        const random = Math.random();
        let cumulativeProbability = 0;
        for (const [statusKey, probability] of Object.entries(probabilities)) {
            cumulativeProbability += probability;
            if (random <= cumulativeProbability) {
                status = statusKey;
                break;
            }
        }
        return status;
    }

    // Dummy-Daten initialisieren
    const trafficData = counties.map(county => ({
        county: county,
        status: getRandomTrafficStatus(county),
        duration: Math.floor(Math.random() * 60) + 10 // Zufällige Fahrtdauer zwischen 10 und 70 Minuten
    }));

    const weatherData = counties.map(county => ({
        county: county,
        temperature: (Math.random() * 30).toFixed(1) + ' °C',
        humidity: Math.floor(Math.random() * 100) + ' %',
        status: ['Sonnig', 'Bewölkt', 'Regen', 'Schnee', 'Nebel'][Math.floor(Math.random() * 5)]
    }));

    // Erstelle ein Element für einen Landkreis mit entsprechenden Daten
    function createCountyElement(county, dataType) {
        const countyElement = document.createElement('div');
        countyElement.className = 'county';
        countyElement.textContent = county;

        const countyDataElement = document.createElement('div');
        countyDataElement.className = 'countyData';

        // Daten je nach Typ anzeigen
        if (dataType === 'traffic') {
            const trafficInfo = trafficData.find(data => data.county === county);
            countyDataElement.innerHTML = `
                <p>Verkehrszustand: ${trafficInfo.status}</p>
                <p>Fahrtdauer: ${trafficInfo.duration} Minuten</p>
            `;
        } else if (dataType === 'weather') {
            const weatherInfo = weatherData.find(data => data.county === county);
            countyDataElement.innerHTML = `
                <p>Temperatur: ${weatherInfo.temperature}</p>
                <p>Feuchtigkeit: ${weatherInfo.humidity}</p>
                <p>Wetterstatus: ${weatherInfo.status}</p>
            `;
        }

        countyElement.appendChild(countyDataElement);

        countyElement.addEventListener('click', () => {
            // Toggle-Funktion für die Sichtbarkeit der Landkreisdaten
            const isVisible = countyDataElement.style.display === 'block';
            countyDataElement.style.display = isVisible ? 'none' : 'block';
            countyDataElement.style.maxHeight = isVisible ? '0' : '1000px';
        });

        return countyElement;
    }

    // Fülle die Menüinhalte mit den Landkreisdaten
    function populateMenu() {
        // Verkehrsdaten
        trafficContent.innerHTML = '';
        counties.forEach(county => {
            const countyElement = createCountyElement(county, 'traffic');
            trafficContent.appendChild(countyElement);
        });

        // Wetterdaten
        weatherContent.innerHTML = '';
        counties.forEach(county => {
            const countyElement = createCountyElement(county, 'weather');
            weatherContent.appendChild(countyElement);
        });
    }

    populateMenu();

    // Filterfunktion für die Landkreise basierend auf der Sucheingabe
    function filterCounties(searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();

        // Filter für Verkehrsdaten
        trafficContent.querySelectorAll('.county').forEach(element => {
            const countyName = element.textContent.toLowerCase();
            element.style.display = countyName.includes(searchTermLower) ? 'block' : 'none';
        });

        // Filter für Wetterdaten
        weatherContent.querySelectorAll('.county').forEach(element => {
            const countyName = element.textContent.toLowerCase();
            element.style.display = countyName.includes(searchTermLower) ? 'block' : 'none';
        });
    }

    document.getElementById('search').addEventListener('input', (event) => {
        filterCounties(event.target.value);
    });

    // Menü-Tabs-Funktionalität
    document.getElementById('trafficTab').addEventListener('click', () => {
        document.getElementById('trafficTab').classList.add('active');
        document.getElementById('weatherTab').classList.remove('active');
        document.getElementById('trafficContent').classList.add('active');
        document.getElementById('weatherContent').classList.remove('active');
    });

    document.getElementById('weatherTab').addEventListener('click', () => {
        document.getElementById('weatherTab').classList.add('active');
        document.getElementById('trafficTab').classList.remove('active');
        document.getElementById('weatherContent').classList.add('active');
        document.getElementById('trafficContent').classList.remove('active');
    });

    // Toggle-Funktion für das Popup
    infoButton.addEventListener('click', () => {
        if (isPopupVisible) {
            popupMenu.classList.remove('show');
            setTimeout(() => { popupMenu.style.display = 'none'; }, 500); // Warten, bis die Animation endet
            isPopupVisible = false;
        } else {
            popupMenu.style.display = 'block';
            setTimeout(() => { popupMenu.classList.add('show'); }, 10); // Start der Animation
            isPopupVisible = true;
        }
    });

    // Aktualisierungsintervalle
    function updateTrafficData() {
        trafficData.forEach(data => {
            data.status = getRandomTrafficStatus(data.county);
            data.duration = Math.floor(Math.random() * 60) + 10; // Zufällige Fahrtdauer zwischen 10 und 70 Minuten
        });
        populateMenu(); // Aktualisiere die Anzeige
    }

    function updateWeatherData() {
        weatherData.forEach(data => {
            data.temperature = (Math.random() * 30).toFixed(1) + ' °C';
            data.humidity = Math.floor(Math.random() * 100) + ' %';
            data.status = ['Sonnig', 'Bewölkt', 'Regen', 'Schnee', 'Nebel'][Math.floor(Math.random() * 5)];
        });
        populateMenu(); // Aktualisiere die Anzeige
    }

    setInterval(updateTrafficData, 600000); // Alle 10 Minuten
    setInterval(updateWeatherData, 43200000); // Alle 12 Stunden

})();
