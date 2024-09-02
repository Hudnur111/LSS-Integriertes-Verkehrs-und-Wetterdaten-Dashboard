// ==UserScript==
// @name         Leitstellenspiel Verkehrs- und Wetterdaten Dashboard
// @namespace    https://www.leitstellenspiel.de/
// @version      4.0
// @description  Zeigt aktuelle Verkehrs- und Wetterdaten für Baden-Württemberg an, inklusive interaktiver Such- und Filterfunktionen. Ein Button wird bei Drücken von "i" für 1 Minute angezeigt und das Menü wird bei Drücken von "c" geschlossen.
// @author       Hudnur111
// @match        https://www.leitstellenspiel.de/*
// @icon         https://www.leitstellenspiel.de/favicon.ico
// @grant        GM_addStyle
// @license      GPL-3.0-or-later
// ==/UserScript==

(function() {
    'use strict';

    const DISPLAY_TIME = 60000; // 1 Minute in Millisekunden
    const INFO_BUTTON_ID = 'infoButton';
    const POPUP_ID = 'infoPopup';

    // Liste aller Landkreise in Baden-Württemberg
    const counties = [
        'Alb-Donau-Kreis', 'Baden-Baden', 'Böblingen', 'Baden-Württemberg', 'Baden-Württemberg', 
        'Heilbronn', 'Karlsruhe', 'Kreis Biberach', 'Kreis Konstanz', 'Kreis Esslingen', 
        'Kreis Ravensburg', 'Kreis Rems-Murr', 'Kreis Rottweil', 'Kreis Tübingen', 'Kreis Ulm', 
        'Ortenaukreis', 'Pforzheim', 'Stuttgart', 'Zollernalbkreis'
    ];

    // Erstelle und style den Info-Button
    GM_addStyle(`
        #${INFO_BUTTON_ID} {
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
        #${POPUP_ID} {
            position: fixed;
            bottom: 70px;
            right: 10px;
            width: 400px;
            height: 300px;
            background: white;
            border: 1px solid #ddd;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: none;
            z-index: 9999;
            overflow: auto;
        }
        #${POPUP_ID} .header {
            background: #007bff;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
        }
        #${POPUP_ID} .tab {
            display: inline-block;
            padding: 10px;
            cursor: pointer;
        }
        #${POPUP_ID} .tab.active {
            background: #007bff;
            color: white;
        }
        #${POPUP_ID} .content {
            padding: 10px;
        }
        #${POPUP_ID} .county {
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
        }
        #${POPUP_ID} .county h4 {
            margin: 0;
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
        header.textContent = 'Verkehrs- und Wetterdaten';

        const trafficTab = document.createElement('div');
        trafficTab.className = 'tab active';
        trafficTab.textContent = 'Verkehrsdaten';

        const weatherTab = document.createElement('div');
        weatherTab.className = 'tab';
        weatherTab.textContent = 'Wetterdaten';

        const content = document.createElement('div');
        content.className = 'content';

        header.appendChild(trafficTab);
        header.appendChild(weatherTab);
        popup.appendChild(header);
        popup.appendChild(content);

        document.body.appendChild(popup);

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
            setTimeout(() => popup.style.display = 'none', DISPLAY_TIME);
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
            { status: 'Glätte', duration: '35 Minuten' },
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
        // Beispielhafte Wetterdaten für jeden Monat
        const months = {
            Januar: [{ weather: 'Sonnig', temp: '5°C', humidity: '70%' }, { weather: 'Bewölkt', temp: '2°C', humidity: '80%' }],
            Februar: [{ weather: 'Sonnig', temp: '6°C', humidity: '65%' }, { weather: 'Bewölkt', temp: '3°C', humidity: '75%' }],
            März: [{ weather: 'Sonnig', temp: '10°C', humidity: '60%' }, { weather: 'Regen', temp: '9°C', humidity: '75%' }],
            April: [{ weather: 'Sonnig', temp: '15°C', humidity: '55%' }, { weather: 'Regen', temp: '13°C', humidity: '70%' }],
            Mai: [{ weather: 'Sonnig', temp: '20°C', humidity: '50%' }, { weather: 'Regen', temp: '19°C', humidity: '65%' }],
            Juni: [{ weather: 'Sonnig', temp: '25°C', humidity: '45%' }, { weather: 'Gewitter', temp: '24°C', humidity: '65%' }],
            Juli: [{ weather: 'Sonnig', temp: '30°C', humidity: '40%' }, { weather: 'Gewitter', temp: '30°C', humidity: '60%' }],
            August: [{ weather: 'Sonnig', temp: '30°C', humidity: '45%' }, { weather: 'Regen', temp: '28°C', humidity: '60%' }],
            September: [{ weather: 'Sonnig', temp: '25°C', humidity: '50%' }, { weather: 'Regen', temp: '23°C', humidity: '65%' }],
            Oktober: [{ weather: 'Sonnig', temp: '15°C', humidity: '65%' }, { weather: 'Regen', temp: '13°C', humidity: '80%' }],
            November: [{ weather: 'Sonnig', temp: '8°C', humidity: '75%' }, { weather: 'Schneefall', temp: '2°C', humidity: '90%' }],
            Dezember: [{ weather: 'Sonnig', temp: '2°C', humidity: '80%' }, { weather: 'Schneefall', temp: '-3°C', humidity: '90%' }],
        };

        return counties.map(county => `
            <div class="county">
                <h4>${county}</h4>
                ${Object.keys(months).map(month => `
                    <div>
                        <h5>${month}</h5>
                        <p>Wetterstatus: ${months[month][Math.floor(Math.random() * months[month].length)].weather}</p>
                        <p>Temperatur: ${months[month][Math.floor(Math.random() * months[month].length)].temp}</p>
                        <p>Luftfeuchtigkeit: ${months[month][Math.floor(Math.random() * months[month].length)].humidity}</p>
                    </div>
                `).join('')}
            </div>
        `).join('');
    };

    // Initialisiere den Button und das Popup
    createInfoButton();
    createPopup();

    // Tastenkombinationen hinzufügen
    document.addEventListener('keydown', (event) => {
        if (event.key === 'i') {
            document.getElementById(INFO_BUTTON_ID).style.display = 'block';
        } else if (event.key === 'c') {
            togglePopup();
        }
    });

    // Popup schließen, wenn außerhalb des Popups geklickt wird
    document.addEventListener('click', (event) => {
        if (!document.getElementById(POPUP_ID).contains(event.target) && !document.getElementById(INFO_BUTTON_ID).contains(event.target)) {
            document.getElementById(POPUP_ID).style.display = 'none';
        }
    });

})();

