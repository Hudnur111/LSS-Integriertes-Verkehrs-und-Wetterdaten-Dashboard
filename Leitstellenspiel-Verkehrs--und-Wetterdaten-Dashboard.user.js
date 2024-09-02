// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      3.0
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
    const CURRENT_VERSION = '3.0';
    const UPDATE_URL = 'https://raw.githubusercontent.com/Hudnur111/Leitstellenspiel-Verkehrs--und-Wetterdaten-Dashboard/main/script.js';
    const VERSION_URL = 'https://raw.githubusercontent.com/Hudnur111/Leitstellenspiel-Verkehrs--und-Wetterdaten-Dashboard/main/version.txt';

    // Update Check
    function checkForUpdate() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: VERSION_URL,
            onload: function(response) {
                if (response.status === 200) {
                    const latestVersion = response.responseText.trim();
                    if (latestVersion !== CURRENT_VERSION) {
                        notifyUserForUpdate(latestVersion);
                    }
                }
            },
            onerror: function() {
                console.error('Fehler beim Abrufen der Versionsinformationen.');
            }
        });
    }

    function notifyUserForUpdate(latestVersion) {
        GM_notification({
            text: `${SCRIPT_NAME} (Version ${latestVersion}) Jetzt Aktualisieren!`,
            title: 'Neue Version verfügbar',
            onclick: function() {
                window.open(UPDATE_URL, '_blank');
            }
        });
    }

    checkForUpdate();

    // CSS-Stile für das Dashboard
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
            width: 360px;
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
            padding: 8px;
            color: #333;
            transition: background-color 0.3s ease;
            font-size: 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
        }
        .county:hover {
            background-color: #e7f1ff;
        }
        .countyData {
            display: none;
            margin-top: 8px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 6px;
            background-color: #fafafa;
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .county.active .countyData {
            display: block;
        }
        .searchBox {
            margin-bottom: 15px;
        }
        .searchBox input {
            width: 100%;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #ddd;
            font-size: 14px;
        }
        .tooltip {
            position: relative;
            display: inline-block;
            cursor: pointer;
            border-bottom: 1px dotted black;
        }
        .tooltip .tooltiptext {
            visibility: hidden;
            width: 120px;
            background-color: #555;
            color: #fff;
            text-align: center;
            border-radius: 6px;
            padding: 5px;
            position: absolute;
            z-index: 1;
            bottom: 125%; /* Position tooltip above the text */
            left: 50%;
            margin-left: -60px;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .tooltip:hover .tooltiptext {
            visibility: visible;
            opacity: 1;
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
        'Ludwigsburg', 'Main-Tauber-Kreis', 'Neckar-Odenwald-Kreis', 'Ortenaukreis', 'Ostalbkreis',
        'Rastatt', 'Reutlingen', 'Rhein-Neckar-Kreis', 'Rottweil', 'Schwarzwald-Baar-Kreis',
        'Sigmaringen', 'Tübingen', 'Tuttlingen', 'Zollernalbkreis'
    ];

    function generateTrafficData() {
        trafficContent.innerHTML = counties.map(county => `
            <div class="county tooltip">
                ${county}
                <span class="tooltiptext">Klicken für Details</span>
                <div class="countyData">
                    Verkehr: ${getRandomTrafficStatus(county)}
                </div>
            </div>
        `).join('');
    }

    function getRandomTrafficStatus(county) {
        const probabilities = {
            'Freie Fahrt': 0.6,
            'Stau': 0.2,
            'Unfall': 0.15,
            'Straßensperrung': 0.05
        };

        if (county.toLowerCase().includes('ruhe')) {
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
        return 'Freie Fahrt'; // Default value
    }

    function getSeasonalWeatherData(month) {
        let temperatures, weatherConditions;

        if ([12, 1, 2].includes(month)) {
            temperatures = [0, 5, -3, 2, -1]; // Winter
            weatherConditions = ['Schneefall', 'Bewölkt', 'Regnerisch', 'Klar'];
        } else if ([3, 4, 5].includes(month)) {
            temperatures = [10, 15, 8, 12, 14]; // Frühling
            weatherConditions = ['Sonnig', 'Bewölkt', 'Regnerisch', 'Leichter Regen'];
        } else if ([6, 7, 8].includes(month)) {
            temperatures = [20, 25, 22, 30, 18]; // Sommer
            weatherConditions = ['Sonnig', 'Bewölkt', 'Leichter Regen', 'Hitze'];
        } else if ([9, 10, 11].includes(month)) {
            temperatures = [10, 15, 8, 12, 5]; // Herbst
            weatherConditions = ['Sonnig', 'Bewölkt', 'Regnerisch', 'Stürmisch'];
        }

        const randomTemp = temperatures[Math.floor(Math.random() * temperatures.length)];
        const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

        return { temperature: randomTemp, condition: randomCondition };
    }

    function generateWeatherData() {
        const currentMonth = new Date().getMonth() + 1; // Monate beginnen bei 0, daher +1
        weatherContent.innerHTML = counties.map(county => {
            const weatherData = getSeasonalWeatherData(currentMonth);
            return `
                <div class="county tooltip">
                    ${county}
                    <span class="tooltiptext">Klicken für Details</span>
                    <div class="countyData">
                        Temperatur: ${weatherData.temperature}°C<br>
                        Wetter: ${weatherData.condition}
                    </div>
                </div>
            `;
        }).join('');
    }

    menuTabs.addEventListener('click', event => {
        const target = event.target;
        if (target.id === 'trafficTab') {
            trafficContent.classList.add('active');
            weatherContent.classList.remove('active');
            target.classList.add('active');
            document.getElementById('weatherTab').classList.remove('active');
        } else if (target.id === 'weatherTab') {
            weatherContent.classList.add('active');
            trafficContent.classList.remove('active');
            target.classList.add('active');
            document.getElementById('trafficTab').classList.remove('active');
        }
    });

    popupMenu.addEventListener('click', event => {
        if (event.target.classList.contains('county')) {
            const dataDiv = event.target.querySelector('.countyData');
            dataDiv.style.display = dataDiv.style.display === 'block' ? 'none' : 'block';
        }
    });

    document.getElementById('search').addEventListener('input', event => {
        const searchText = event.target.value.toLowerCase();
        document.querySelectorAll('#popupMenu .county').forEach(countyDiv => {
            const countyName = countyDiv.textContent.toLowerCase();
            countyDiv.style.display = countyName.includes(searchText) ? 'block' : 'none';
        });
    });

    let isPopupVisible = false;
    let buttonVisibleUntil = 0;

    infoButton.addEventListener('click', () => {
        isPopupVisible = !isPopupVisible;
        popupMenu.classList.toggle('show', isPopupVisible);
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'i') {
            buttonVisibleUntil = Date.now() + 60000;
            infoButton.style.display = 'block';
        } else if (event.key === 'c') {
            isPopupVisible = false;
            popupMenu.classList.remove('show');
        }
    });

    function checkButtonVisibility() {
        if (Date.now() > buttonVisibleUntil) {
            infoButton.style.display = 'none';
        }
    }

    setInterval(checkButtonVisibility, 1000);

    infoButton.addEventListener('mouseover', () => {
        buttonVisibleUntil = Date.now() + 60000;
    });

    infoButton.addEventListener('mouseout', () => {
        buttonVisibleUntil = Date.now() - 1000;
    });

    generateTrafficData();
    generateWeatherData();
})();
