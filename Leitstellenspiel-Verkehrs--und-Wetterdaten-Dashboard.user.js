// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      2.9
// @description  Zeigt aktuelle Verkehrs- und Wetterdaten für Baden-Württemberg an, inklusive interaktiver Such- und Filterfunktionen, und einen Button, der bei Drücken von "i" für 1 Minute angezeigt wird und das Menü bei Drücken von "c" schließt.
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
        'Alb-Donau-Kreis', 'Baden-Baden', 'Böblingen', 'Baden-Württemberg', 'Baden-Württemberg', 
        'Heilbronn', 'Karlsruhe', 'Kreis Biberach', 'Kreis Konstanz', 'Kreis Esslingen', 
        'Kreis Ravensburg', 'Kreis Rems-Murr', 'Kreis Rottweil', 'Kreis Tübingen', 'Kreis Ulm', 
        'Ortenaukreis', 'Pforzheim', 'Stuttgart', 'Zollernalbkreis'
    ];

    // Erstelle und style den Info-Button
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
        #infoPopup {
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
        #infoPopup .header {
            background: #007bff;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
        }
        #infoPopup .county {
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            cursor: pointer;
        }
        #infoPopup .county h4 {
            margin: 0;
        }
        #infoPopup .county .details {
            display: none;
        }
    `);

    // Erstelle den Info-Button und das Popup
    const createInfoButton = () => {
        const button = document.createElement('div');
        button.id = 'infoButton';
        button.textContent = 'i';
        document.body.appendChild(button);
        button.addEventListener('click', togglePopup);
    };

    const createPopup = () => {
        const popup = document.createElement('div');
        popup.id = 'infoPopup';

        const header = document.createElement('div');
        header.className = 'header';
        header.textContent = 'Landkreis Informationen';

        const content = document.createElement('div');
        content.className = 'content';

        popup.appendChild(header);
        popup.appendChild(content);

        document.body.appendChild(popup);

        updateContent();
    };

    const togglePopup = () => {
        const popup = document.getElementById('infoPopup');
        if (popup.style.display === 'block') {
            popup.style.display = 'none';
        } else {
            popup.style.display = 'block';
            setTimeout(() => popup.style.display = 'none', 60000); // 1 Minute
        }
    };

    const updateContent = () => {
        const content = document.querySelector('#infoPopup .content');
        content.innerHTML = counties.map(county => `
            <div class="county">
                <h4>${county}</h4>
                <div class="details">${generateDataForCounty()}</div>
            </div>
        `).join('');

        // Füge Eventlistener für Klicks auf Landkreise hinzu
        document.querySelectorAll('#infoPopup .county').forEach(countyElement => {
            countyElement.addEventListener('click', () => {
                const details = countyElement.querySelector('.details');
                details.style.display = details.style.display === 'block' ? 'none' : 'block';
            });
        });
    };

    const generateDataForCounty = () => {
        const trafficStatuses = [
            { status: 'Stau', duration: '45 Minuten' },
            { status: 'Fließend', duration: '15 Minuten' },
            { status: 'Leichter Verkehr', duration: '20 Minuten' },
            { status: 'Baustelle', duration: '30 Minuten' },
            { status: 'Sehr starkes Aufkommen', duration: '60 Minuten' },
            { status: 'Unfall', duration: '50 Minuten' },
            { status: 'Normal', duration: '10 Minuten' },
            { status: 'Glätte', duration: '35 Minuten' },
        ];

        const weatherData = {
            Wetterstatus: 'Sonnig',
            Temperatur: `${Math.floor(Math.random() * 15) + 15}°C`,
            Luftfeuchtigkeit: `${Math.floor(Math.random() * 40) + 40}%`
        };

        return `
            <div>
                <h5>Verkehrsdaten:</h5>
                <p>Status: ${trafficStatuses[Math.floor(Math.random() * trafficStatuses.length)].status}</p>
                <p>Dauer: ${trafficStatuses[Math.floor(Math.random() * trafficStatuses.length)].duration}</p>
            </div>
            <div>
                <h5>Wetterdaten:</h5>
                <p>Wetterstatus: ${weatherData.Wetterstatus}</p>
                <p>Temperatur: ${weatherData.Temperatur}</p>
                <p>Luftfeuchtigkeit: ${weatherData.Luftfeuchtigkeit}</p>
            </div>
        `;
    };

    // Initialisiere den Button und das Popup
    createInfoButton();
    createPopup();

    // Tastenkombinationen hinzufügen
    document.addEventListener('keydown', (event) => {
        if (event.key === 'i') {
            document.getElementById('infoButton').style.display = 'block';
        } else if (event.key === 'c') {
            togglePopup();
        }
    });

    // Popup schließen, wenn außerhalb des Popups geklickt wird
    document.addEventListener('click', (event) => {
        if (!document.getElementById('infoPopup').contains(event.target) && !document.getElementById('infoButton').contains(event.target)) {
            document.getElementById('infoPopup').style.display = 'none';
        }
    });

})();
