// Constants for IndexedDB
const DB_NAME = "RadioStationsDB";
const DB_VERSION = 1;
const STORE_NAME = "stations";

// DOM elements
const browseRadioButton = document.getElementById('browse-radio');
const radioControlsDiv = document.getElementById('radio-controls');
const radioStationsSelect = document.getElementById('radio-stations');
const playButton = document.getElementById('play-button');
const favoriteButton = document.getElementById('favorite-button');
const audioPlayer = document.getElementById('audio-player');
const nowPlayingDiv = document.getElementById('now-playing');
const nowPlayingImage = document.getElementById('now-playing-image');
const nowPlayingStation = document.getElementById('now-playing-station');
const nowPlayingSong = document.getElementById('now-playing-song');
const nowPlayingUrl = document.getElementById('now-playing-url');
const searchInput = document.getElementById('search');
const loadingDiv = document.getElementById('loading');
const favoritesDiv = document.getElementById('favorites');

let stations = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Open or create an IndexedDB database
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "url" });
            }
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        request.onerror = (event) => {
            reject("Database error: " + event.target.errorCode);
        };
    });
}

// Store fetched data in IndexedDB
async function storeStationsInDB(stations) {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    stations.forEach(station => store.put(station));
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
}

// Retrieve stations from IndexedDB
async function getStationsFromDB() {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Fetch radio stations
async function fetchRadioStations() {
    loadingDiv.classList.remove('hidden');
    // Try to load stations from IndexedDB
    try {
        stations = await getStationsFromDB();
        if (stations.length > 0) {
            console.log('Loaded stations from IndexedDB:', stations);
            populateStationSelect(stations);
            loadingDiv.classList.add('hidden');
            return;
        }
    } catch (error) {
        console.error('Error loading stations from IndexedDB:', error);
    }

    // If no cached data, fetch fresh data from the API
    try {
        const response = await fetch('https://de1.api.radio-browser.info/json/stations');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const fetchedStations = await response.json();
        console.log('Fetched stations:', fetchedStations);
        // Reduce the data to only the required fields
        stations = fetchedStations.map(station => ({
            name: station.name,
            url: station.url,
            favicon: station.favicon
        }));
        // Store the fetched data in IndexedDB
        await storeStationsInDB(stations);
        populateStationSelect(stations);
    } catch (error) {
        console.error('Error fetching stations:', error);
        alert('Failed to load radio stations. Please try again later.');
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

// Populate station select dropdown
function populateStationSelect(stations) {
    radioStationsSelect.innerHTML = '';
    stations.forEach(station => {
        const option = document.createElement('option');
        option.value = station.url;
        option.textContent = station.name;
        radioStationsSelect.appendChild(option);
    });
}

// Play selected station
function playStation(url, name, image) {
    const proxyBase = 'https://pprrooxxyy.vercel.app/';
    let proxyUrl;

    if (url.startsWith('http://')) {
        proxyUrl = proxyBase + 'http/' + url.slice(7);
    } else if (url.startsWith('https://')) {
        proxyUrl = proxyBase + 'https/' + url.slice(8);
    } else {
        proxyUrl = url; // Fallback to original URL if it doesn't match
    }

    audioPlayer.src = proxyUrl; // Set the audio player source to the proxy URL
    audioPlayer.play();
    nowPlayingStation.textContent = `Station: ${name}`;
    nowPlayingSong.textContent = `Song: Loading...`;
    nowPlayingUrl.textContent = `URL: ${proxyUrl}`;
    nowPlayingImage.src = image || 'https://via.placeholder.com/50';
}

// Play selected station from dropdown
playButton.addEventListener('click', () => {
    const selectedStation = radioStationsSelect.value;
    const selectedStationName = radioStationsSelect.options[radioStationsSelect.selectedIndex].text;
    const selectedStationImage = stations.find(station => station.url === selectedStation)?.favicon || '';
    playStation(selectedStation, selectedStationName, selectedStationImage);
});

// Add to favorites
favoriteButton.addEventListener('click', () => {
    const selectedStation = radioStationsSelect.value;
    const stationName = radioStationsSelect.options[radioStationsSelect.selectedIndex].text;
    const stationImage = stations.find(station => station.url === selectedStation)?.favicon || '';
    
    // Check if the station is already in favorites
    if (!favorites.some(fav => fav.url === selectedStation)) {
        favorites.push({ url: selectedStation, name: stationName, image: stationImage });
        localStorage.setItem('favorites', JSON.stringify(favorites));
        displayFavorites();
    } else {
        alert('This station is already in your favorites.');
    }
});

// Remove from favorites
function removeFavorite(url) {
    favorites = favorites.filter(fav => fav.url !== url);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    displayFavorites();
}

// Display favorites
function displayFavorites() {
    favoritesDiv.innerHTML = '<h2>Favorites</h2>';
    favorites.forEach(favorite => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        favoriteItem.innerHTML = `
            <img src="${favorite.image || 'https://via.placeholder.com/50'}" alt="${favorite.name}" />
            <span>${favorite.name}</span>
            <button class="remove-favorite" onclick="removeFavorite('${favorite.url}')">❌</button>
        `;

        // Add click event to play the favorite station
        favoriteItem.addEventListener('click', () => {
            playStation(favorite.url, favorite.name, favorite.image);
        });

        favoritesDiv.appendChild(favoriteItem);
    });
}

// Initialize the application
browseRadioButton.addEventListener('click', () => {
    radioControlsDiv.classList.toggle('hidden');
    if (!stations.length) {
        fetchRadioStations();
    }
});

// Display favorites on load
displayFavorites();
