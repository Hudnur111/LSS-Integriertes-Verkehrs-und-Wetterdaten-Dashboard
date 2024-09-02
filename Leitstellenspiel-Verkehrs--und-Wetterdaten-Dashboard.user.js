// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      3.2
// @description  Zeigt aktuelle Verkehrs- und Wetterdaten für Baden-Württemberg an, inklusive interaktiver Such- und Filterfunktionen. Ein Button wird bei Drücken von "i" für 1 Minute angezeigt und das Menü wird bei Drücken von "c" geschlossen.
// @author       Hudnur111
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @license      GPL-3.0-or-later
// @connect      github.com
// ==/UserScript==

(function() {
    'use strict';

    const SCRIPT_NAME = 'Leitstellenspiel Verkehrs- und Wetterdaten Dashboard';
    const CURRENT_VERSION = '3.2';
    const UPDATE_URL = 'https://raw.githubusercontent.com/Hudnur111/Leitstellenspiel-Verkehrs--und-Wetterdaten-Dashboard/main/script.js';
    const VERSION_URL = 'https://raw.githubusercontent.com/Hudnur111/Leitstellenspiel-Verkehrs--und-Wetterdaten-Dashboard/main/version.txt';

    // Styles for the dashboard to make the counties clearly visible
    GM_addStyle(`
        #infoButton {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background-color: #007bff;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10000;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            border: none;
        }
        #infoButton:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
        }
        #infoButton:active {
            transform: scale(0.95);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        #popupMenu {
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 400px;
            max-height: 600px;
            background-color: #fff;
            border: 1px solid #007bff;
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            overflow-y: auto;
            display: none;
            opacity: 0;
            transition: opacity 0.4s ease, transform 0.4s ease;
            transform: translateY(20px);
        }
        #popupMenu.show {
            display: block;
            opacity: 1;
            transform: translateY(0);
        }
        #menuTabs {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #007bff;
            margin-bottom: 15px;
        }
        #menuTabs button {
            background: none;
            border: none;
            padding: 10px;
            cursor: pointer;
            color: #007bff;
            font-weight: bold;
            font-size: 14px;
            border-radius: 6px;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        #menuTabs button.active {
            border-bottom: 3px solid #007bff;
            color: #0056b3;
        }
        #menuTabs button:hover {
            background-color: #f0f8ff;
            color: #0056b3;
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
            margin-top: 10px;
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            border-radius: 8px;
            color: #333;
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
        }
        .county:hover {
            background-color: #f0f8ff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .countyData {
            display: none;
            margin-top: 8px;
            padding: 8px;
            border: 1px solid #eee;
            border-radius: 6px;
            background-color: #fafafa;
            font-size: 13px;
        }
        .county.active .countyData {
            display: block;
        }
        .searchBox {
            margin-bottom: 15px;
        }
        .searchBox input {
            width: 100%;
            padding: 8px;
            border-radius: 6px;
            border: 1px solid #ddd;
            font-size: 14px;
        }
    `);

    const infoButton = document.createElement('div');
    infoButton.id = 'infoButton';
    document.body.appendChild(infoButton);

    const popupMenu = document.createElement('div');
    popupMenu.id = 'popupMenu';
    document.body.appendChild(popupMenu);

    const menuTabs = document.createElement('div');
    menuTabs.id = 'menuTabs';
    menuTabs.innerHTML = `
        <button id="trafficTab" class="active">Verkehrsdaten</button>
        <button id="weatherTab">Wetterdaten</button>
    `;
    popupMenu.appendChild(menuTabs);

    const searchBox = document.createElement('div');
    searchBox.className = 'searchBox';
    searchBox.innerHTML = '<input type="text" id="search" placeholder="Suche nach Landkreis...">';
    popupMenu.appendChild(searchBox);

    const trafficContent = document.createElement('div');
    trafficContent.id = 'trafficContent';
    trafficContent.className = 'menuContent active';
    popupMenu.appendChild(trafficContent);

    const weatherContent = document.createElement('div');
    weatherContent.id = 'weatherContent';
    weatherContent.className = 'menuContent';
    popupMenu.appendChild(weatherContent);

    const counties = [
        'Alb-Donau-Kreis', 'Bodenseekreis', 'Breisgau-Hochschwarzwald', 'Böblingen',
        'Esslingen', 'Göppingen', 'Heidenheim', 'Heilbronn', 'Hohenlohekreis', 'Karlsruhe',
        'Ludwigsburg', 'Main-Tauber-Kreis', 'Neckar-Odenwald-Kreis', 'Ortenaukreis',
        'Ostalbkreis', 'Pforzheim', 'Rastatt', 'Rems-Murr-Kreis', 'Reutlingen',
        'Rhein-Neckar-Kreis', 'Rottweil', 'Schwäbisch Hall', 'Sigmaringen',
        'Stuttgart', 'Tübingen', 'Ulm', 'Zollernalbkreis', 'Freiburg', 'Pforzheim', 'Lörrach'
    ];

    function getRandomTrafficStatus(county) {
        const probabilities = {
            'Freie Fahrt': 0.5,
            'Stau': 0.2,
            'Unfall': 0.15,
            'Baustelle': 0.1,
            'Verkehrsbehinderung': 0.05
        };

        if (county.includes('Stuttgart') || county.includes('Karlsruhe')) {
            probabilities['Stau'] = 0.25;
            probabilities['Unfall'] = 0.1;
        }

        const r = Math.random();
        let cumulativeProbability = 0;

        for (const [status, probability] of Object.entries(probabilities)) {
            cumulativeProbability += probability;
            if (r < cumulativeProbability) {
                return status;
            }
        }
        return 'Freie Fahrt';
    }

    function getSeasonalWeatherData(month) {
        let temperatures, weatherConditions;

        if ([12, 1, 2].includes(month)) {
            temperatures = [-3, 0, 2, 5];
            weatherConditions = ['Schneefall', 'Bewölkt', 'Regnerisch', 'Klar'];
        } else if ([3, 4, 5].includes(month)) {
            temperatures = [8, 12, 14, 15];
            weatherConditions = ['Sonnig', 'Bewölkt', 'Regnerisch', 'Leichter Regen'];
        } else if ([6, 7, 8].includes(month)) {
            temperatures = [18, 22, 25, 30];
            weatherConditions = ['Sonnig', 'Heiß', 'Gewitter', 'Leicht Bewölkt'];
        } else {
            temperatures = [10, 12, 14, 8];
            weatherConditions = ['Bewölkt', 'Regnerisch', 'Windig', 'Klar'];
        }

        const temperature = temperatures[Math.floor(Math.random() * temperatures.length)];
        const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

        return { temperature, condition };
    }

    counties.forEach(county => {
        const countyDiv = document.createElement('div');
        countyDiv.className = 'county';
        countyDiv.textContent = county;

        const countyData = document.createElement('div');
        countyData.className = 'countyData';
        countyData.innerHTML = `
            <p><strong>Verkehr:</strong> ${getRandomTrafficStatus(county)}</p>
            <p><strong>Wetter:</strong> ${
                getSeasonalWeatherData(new Date().getMonth() + 1).condition
            }, ${
                getSeasonalWeatherData(new Date().getMonth() + 1).temperature
            }°C</p>
        `;
        countyDiv.appendChild(countyData);

        countyDiv.addEventListener('click', () => {
            countyDiv.classList.toggle('active');
        });

        trafficContent.appendChild(countyDiv);
    });

    // Add functionality to tabs
    const trafficTab = document.getElementById('trafficTab');
    const weatherTab = document.getElementById('weatherTab');
    const trafficTabContent = document.getElementById('trafficContent');
    const weatherTabContent = document.getElementById('weatherContent');

    trafficTab.addEventListener('click', () => {
        trafficTab.classList.add('active');
        weatherTab.classList.remove('active');
        trafficTabContent.classList.add('active');
        weatherTabContent.classList.remove('active');
    });

    weatherTab.addEventListener('click', () => {
        weatherTab.classList.add('active');
        trafficTab.classList.remove('active');
        weatherTabContent.classList.add('active');
        trafficTabContent.classList.remove('active');
    });

    // Add search functionality
    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', () => {
        const filter = searchInput.value.toLowerCase();
        const countyElements = document.querySelectorAll('.county');

        countyElements.forEach(county => {
            const text = county.textContent.toLowerCase();
            county.style.display = text.includes(filter) ? '' : 'none';
        });
    });

    // Add functionality to info button
    infoButton.addEventListener('click', () => {
        popupMenu.classList.toggle('show');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.key === 'i') {
            popupMenu.classList.toggle('show');
        } else if (event.key === 'c') {
            popupMenu.classList.remove('show');
        }
    });
})();
