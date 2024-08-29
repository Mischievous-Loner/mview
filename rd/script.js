// Constants for IndexedDB
const DB_NAME = "RadioStationsDB";
const DB_VERSION = 1;
const STORE_NAME = "stations";
const PROXY_URL = "https://pprrooxxyy.vercel.app"; // Proxy base URL

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
const countryFilter = document.getElementById('country-filter');
const languageFilter = document.getElementById('language-filter');
const sortOptions = document.getElementById('sort-options');

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
            populateFilters(stations); // Populate filters with fetched stations
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
            favicon: station.favicon,
            country: station.country,
            language: station.language,
            votes: station.votes
        }));

        // Store the fetched data in IndexedDB
        await storeStationsInDB(stations);

        populateStationSelect(stations);
        populateFilters(stations); // Populate filters with fetched stations
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

// Populate filter options for country and language
function populateFilters(stations) {
    const countries = [...new Set(stations.map(station => station.country))].sort(); // Sort countries A-Z
    const languages = [...new Set(stations.map(station => station.language))].sort(); // Sort languages A-Z

    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countryFilter.appendChild(option);
    });

    languages.forEach(language => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        languageFilter.appendChild(option);
    });
}

// Filter and sort stations based on user selection
function filterAndSortStations() {
    let filteredStations = [...stations];

    // Filter by country
    const selectedCountry = countryFilter.value;
    if (selectedCountry) {
        filteredStations = filteredStations.filter(station => station.country === selectedCountry);
    }

    // Filter by language
    const selectedLanguage = languageFilter.value;
    if (selectedLanguage) {
        filteredStations = filteredStations.filter(station => station.language === selectedLanguage);
    }

    // Sort stations
    const sortValue = sortOptions.value;
    if (sortValue === "az") {
        filteredStations.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortValue === "za") {
        filteredStations.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortValue === "popularity-asc") {
        filteredStations.sort((a, b) => a.votes - b.votes);
    } else if (sortValue === "popularity-desc") {
        filteredStations.sort((a, b) => b.votes - a.votes);
    }

    populateStationSelect(filteredStations);
}

// Event listeners for filters and sort options
countryFilter.addEventListener('change', filterAndSortStations);
languageFilter.addEventListener('change', filterAndSortStations);
sortOptions.addEventListener('change', filterAndSortStations);

// Modify URL to stream through proxy
function getProxiedUrl(url) {
    if (!url) return ''; // Handle invalid URLs gracefully

    let proxiedUrl;
    if (url.startsWith('http://')) {
        proxiedUrl = `${PROXY_URL}/http/${url.substring(7)}`;
    } else if (url.startsWith('https://')) {
        proxiedUrl = `${PROXY_URL}/https/${url.substring(8)}`;
    } else {
        proxiedUrl = url; // Return original if not http or https
    }

    console.log('Original URL:', url);  // Debugging line
    console.log('Proxied URL:', proxiedUrl);  // Debugging line
    return proxiedUrl;
}

// Play selected station
function playStation(url, name, image) {
    const proxiedUrl = getProxiedUrl(url);
    const proxiedImageUrl = image ? getProxiedUrl(image) : 'https://via.placeholder.com/50'; // Use proxy for images
    audioPlayer.src = proxiedUrl;  // Ensure proxy URL is used for audio
    audioPlayer.play();
    nowPlayingStation.textContent = `Station: ${name}`;
    nowPlayingSong.textContent = `Song: Loading...`;
    nowPlayingUrl.textContent = `URL: ${proxiedUrl}`;
    nowPlayingImage.src = proxiedImageUrl; // Ensure proxy URL is used for images
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

    if (!favorites.some(fav => fav.url === selectedStation)) {
        favorites.push({ url: selectedStation, name: stationName, image: stationImage });
        localStorage.setItem('favorites', JSON.stringify(favorites));
        displayFavorites();
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
    favorites.forEach(station => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';

        const stationImage = document.createElement('img');
        const proxiedImageUrl = station.image ? getProxiedUrl(station.image) : 'https://via.placeholder.com/50';
        stationImage.src = proxiedImageUrl; // Use proxy for images
        stationImage.onerror = () => stationImage.src = 'https://via.placeholder.com/50'; // Fallback if proxy fails

        const stationName = document.createElement('span');
        stationName.textContent = station.name;

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-favorite';
        removeButton.textContent = '✖';
        removeButton.onclick = () => removeFavorite(station.url);

        favoriteItem.onclick = () => playStation(station.url, station.name, station.image);

        favoriteItem.appendChild(stationImage);
        favoriteItem.appendChild(stationName);
        favoriteItem.appendChild(removeButton);
        favoritesDiv.appendChild(favoriteItem);
    });
}

// Debounced search functionality
function debounce(func, delay) {
    let debounceTimer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

// Search functionality
searchInput.addEventListener('input', debounce(() => {
    const query = searchInput.value.toLowerCase().trim();
    const queryWords = query.split(/\s+/); // Split query into words

    const filteredStations = stations.filter(station => {
        const stationName = station.name.toLowerCase();
        return queryWords.every(word => stationName.includes(word)); // Check if all words are included
    });

    populateStationSelect(filteredStations);
}, 300));

// Show radio controls on "Browse Radio" button click
browseRadioButton.addEventListener('click', () => {
    radioControlsDiv.classList.remove('hidden');
    fetchRadioStations();
});

// Load favorites on page load
displayFavorites();
