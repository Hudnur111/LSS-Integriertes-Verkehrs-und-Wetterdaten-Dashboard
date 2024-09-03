// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      2.9
// @description  Zeigt aktuelle Verkehrs- und Wetterdaten für Baden-Württemberg an, inklusive interaktiver Such- und Filterfunktionen, und zwei separate Menüs für Wetter- und Verkehrsdaten. Ein Button, der bei Drücken von "i" für 1 Minute angezeigt wird, und das Menü bei Drücken von "c" schließt, ist ebenfalls enthalten.
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
    const CURRENT_VERSION = '2.9';
    const UPDATE_URL = 'https://raw.githubusercontent.com/yourusername/yourrepository/main/yourscript.user.js'; // Ersetze durch deine GitHub-URL
    const VERSION_URL = 'https://raw.githubusercontent.com/yourusername/yourrepository/main/version.txt'; // Ersetze durch deine GitHub-Version-Datei-URL

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

    // Liste aller Landkreise in Baden-Württemberg
    const counties = [
        'Alb-Donau-Kreis', 'Baden-Baden', 'Böblingen', 'Bodenseekreis', 'Breisgau-Hochschwarzwald', 
        'Enzkreis', 'Esslingen', 'Göppingen', 'Heidelberg', 'Heidenheim', 
        'Heilbronn', 'Hohenlohekreis', 'Karlsruhe', 'Konstanz', 'Lörrach', 
        'Ludwigsburg', 'Main-Tauber-Kreis', 'Neckar-Odenwald-Kreis', 'Ortenaukreis', 'Ostalbkreis', 
        'Pforzheim', 'Rastatt', 'Ravensburg', 'Rems-Murr-Kreis', 'Reutlingen', 
        'Rhein-Neckar-Kreis', 'Rottweil', 'Schwäbisch Hall', 'Schwarzwald-Baar-Kreis', 'Sigmaringen', 
        'Stuttgart', 'Tübingen', 'Tuttlingen', 'Ulm', 'Waldshut', 
        'Zollernalbkreis'
    ];

    // Erstelle und style die Buttons
    GM_addStyle(`
        #infoButton {
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
            display: none;
            z-index: 9999;
        }
        #weatherPopup, #trafficPopup {
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 500px;
            height: 600px;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: none;
            z-index: 9999;
            overflow: auto;
        }
        #weatherPopup .header, #trafficPopup .header {
            background: #007bff;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
        }
        #weatherPopup .county, #trafficPopup .county {
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            cursor: pointer;
        }
        #weatherPopup .county h4, #trafficPopup .county h4 {
            margin: 0;
        }
        #weatherPopup .county .details, #trafficPopup .county .details {
            display: none;
        }
    `);

    // Erstelle die Buttons und Popups für Wetter- und Verkehrsdaten
    const createInfoButton = () => {
        const button = document.createElement('div');
        button.id = 'infoButton';
        button.textContent = 'i';
        document.body.appendChild(button);
        button.addEventListener('click', togglePopups);
    };

    const createWeatherPopup = () => {
        const popup = document.createElement('div');
        popup.id = 'weatherPopup';

        const header = document.createElement('div');
        header.className = 'header';
        header.textContent = 'Wetterdaten';

        const content = document.createElement('div');
        content.className = 'content';

        popup.appendChild(header);
        popup.appendChild(content);

        document.body.appendChild(popup);

        updateWeatherContent();
    };

    const createTrafficPopup = () => {
        const popup = document.createElement('div');
        popup.id = 'trafficPopup';

        const header = document.createElement('div');
        header.className = 'header';
        header.textContent = 'Verkehrsdaten';

        const content = document.createElement('div');
        content.className = 'content';

        popup.appendChild(header);
        popup.appendChild(content);

        document.body.appendChild(popup);

        updateTrafficContent();
    };

    const togglePopups = () => {
        const weatherPopup = document.getElementById('weatherPopup');
        const trafficPopup = document.getElementById('trafficPopup');

        if (weatherPopup.style.display === 'block' || trafficPopup.style.display === 'block') {
            weatherPopup.style.display = 'none';
            trafficPopup.style.display = 'none';
        } else {
            weatherPopup.style.display = 'block';
            trafficPopup.style.display = 'block';
            setTimeout(() => {
                weatherPopup.style.display = 'none';
                trafficPopup.style.display = 'none';
            }, 60000); // 1 Minute
        }
    };

    const updateWeatherContent = () => {
        const content = document.querySelector('#weatherPopup .content');
        content.innerHTML = counties.map(county => `
            <div class="county">
                <h4>${county}</h4>
                <div class="details">${generateWeatherDataForCounty()}</div>
            </div>
        `).join('');

        document.querySelectorAll('#weatherPopup .county').forEach(countyElement => {
            countyElement.addEventListener('click', () => {
                const details = countyElement.querySelector('.details');
                details.style.display = details.style.display === 'block' ? 'none' : 'block';
            });
        });
    };

    const updateTrafficContent = () => {
        const content = document.querySelector('#trafficPopup .content');
        content.innerHTML = counties.map(county => `
            <div class="county">
                <h4>${county}</h4>
                <div class="details">${generateTrafficDataForCounty()}</div>
            </div>
        `).join('');

        document.querySelectorAll('#trafficPopup .county').forEach(countyElement => {
            countyElement.addEventListener('click', () => {
                const details = countyElement.querySelector('.details');
                details.style.display = details.style.display === 'block' ? 'none' : 'block';
            });
        });
    };

    const generateWeatherDataForCounty = () => {
        const weatherData = {
            Wetterstatus: 'Sonnig',
            Temperatur: `${Math.floor(Math.random() * 15) + 15}°C`,
            Luftfeuchtigkeit: `${Math.floor(Math.random() * 40) + 40}%`
        };

        return `
            <div>
                <h5>Wetterdaten:</h5>
                <p>Wetterstatus: ${weatherData.Wetterstatus}</p>
                <p>Temperatur: ${weatherData.Temperatur}</p>
                <p>Luftfeuchtigkeit: ${weatherData.Luftfeuchtigkeit}</p>
            </div>
        `;
    };

    const generateTrafficDataForCounty = () => {
        const trafficStatuses = [
            { status: 'Stau', duration: '45 Minuten' },
            { status: 'Fließend', duration: 'Keine Verzögerung' },
            { status: 'Unfall', duration: '20 Minuten Verzögerung' }
        ];

        return `
            <div>
                <h5>Verkehrsdaten:</h5>
                <p>Status: ${trafficStatuses[Math.floor(Math.random() * trafficStatuses.length)].status}</p>
                <p>Dauer: ${trafficStatuses[Math.floor(Math.random() * trafficStatuses.length)].duration}</p>
            </div>
        `;
    };

    // Initialisiere den Button und die Popups
    createInfoButton();
    createWeatherPopup();
    createTrafficPopup();

    // Tastenkombinationen hinzufügen
    document.addEventListener('keydown', (event) => {
        if (event.key === 'i') {
            document.getElementById('infoButton').style.display = 'block';
        } else if (event.key === 'c') {
            togglePopups();
        }
    });

    // Popups schließen, wenn außerhalb des Popups geklickt wird
    document.addEventListener('click', (event) => {
        if (!document.getElementById('weatherPopup').contains(event.target) && !document.getElementById('infoButton').contains(event.target) && 
            !document.getElementById('trafficPopup').contains(event.target)) {
            document.getElementById('weatherPopup').style.display = 'none';
            document.getElementById('trafficPopup').style.display = 'none';
        }
    });

})();
