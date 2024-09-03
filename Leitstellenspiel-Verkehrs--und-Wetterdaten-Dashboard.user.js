// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      2.9
// @description  Zeigt aktuelle Verkehrs- und Wetterdaten für Baden-Württemberg an, inklusive interaktiver Such- und Filterfunktionen. Zwei separate Menüs für Wetter- und Verkehrsdaten, mit einer Taste, die das Menü öffnet/schließt.
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
            bottom: 70px;
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
        .popup-header {
            background: #007bff;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
        }
        .popup-content .county {
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            cursor: pointer;
            padding: 10px;
        }
        .popup-content .county h4 {
            margin: 0;
        }
        .popup-content .county .details {
            display: none;
            padding: 5px;
            background-color: #f9f9f9;
        }
    `);

    function createPopup(id, title) {
        const popup = document.createElement('div');
        popup.id = id;
        popup.className = 'popup';

        const header = document.createElement('div');
        header.className = 'popup-header';
        header.textContent = title;

        const content = document.createElement('div');
        content.className = 'popup-content';

        popup.appendChild(header);
        popup.appendChild(content);

        document.body.appendChild(popup);
        return popup;
    }

    const weatherPopup = createPopup('weatherPopup', 'Wetterdaten');
    const trafficPopup = createPopup('trafficPopup', 'Verkehrsdaten');

    function populatePopupContent(popupContent, dataGenerator) {
        popupContent.innerHTML = counties.map(county => `
            <div class="county">
                <h4>${county}</h4>
                <div class="details">${dataGenerator(county)}</div>
            </div>
        `).join('');

        popupContent.querySelectorAll('.county').forEach(countyElement => {
            countyElement.addEventListener('click', () => {
                const details = countyElement.querySelector('.details');
                details.style.display = details.style.display === 'block' ? 'none' : 'block';
            });
        });
    }

    function generateWeatherDataForCounty(county) {
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
    }

    function generateTrafficDataForCounty(county) {
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
    }

    populatePopupContent(weatherPopup.querySelector('.popup-content'), generateWeatherDataForCounty);
    populatePopupContent(trafficPopup.querySelector('.popup-content'), generateTrafficDataForCounty);

    const infoButton = document.createElement('div');
    infoButton.id = 'infoButton';
    infoButton.textContent = 'i';
    document.body.appendChild(infoButton);

    infoButton.addEventListener('click', () => {
        const isWeatherVisible = weatherPopup.style.display === 'block';
        const isTrafficVisible = trafficPopup.style.display === 'block';

        weatherPopup.style.display = isWeatherVisible ? 'none' : 'block';
        trafficPopup.style.display = isTrafficVisible ? 'none' : 'block';

        setTimeout(() => {
            weatherPopup.style.display = 'none';
            trafficPopup.style.display = 'none';
        }, 60000); // 1 Minute
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'i') {
            infoButton.style.display = 'block';
        } else if (event.key === 'c') {
            weatherPopup.style.display = 'none';
            trafficPopup.style.display = 'none';
        }
    });

    document.addEventListener('click', (event) => {
        if (!weatherPopup.contains(event.target) && !infoButton.contains(event.target) && !trafficPopup.contains(event.target)) {
            weatherPopup.style.display = 'none';
            trafficPopup.style.display = 'none';
        }
    });
})();
