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

// Debounce function
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

// Fetch radio stations
async function fetchRadioStations() {
    loadingDiv.classList.remove('hidden');
    
    // Check if we have cached data
    const cachedData = JSON.parse(localStorage.getItem('radioStations'));
    const cacheTimestamp = localStorage.getItem('cacheTimestamp');
    const now = new Date().getTime();
    const threeDaysInMillis = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

    // If cached data exists and is less than 3 days old, use it
    if (cachedData && cacheTimestamp && (now - cacheTimestamp < threeDaysInMillis)) {
        stations = cachedData;
        console.log('Loaded stations from cache:', stations);
        populateStationSelect(stations);
        loadingDiv.classList.add('hidden');
        return;
    }

    // If no valid cache, fetch fresh data
    try {
        const response = await fetch('https://de1.api.radio-browser.info/json/stations');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        stations = await response.json();
        console.log('Fetched stations:', stations);
        
        // Cache the fetched data and the current timestamp
        localStorage.setItem('radioStations', JSON.stringify(stations));
        localStorage.setItem('cacheTimestamp', now.toString());
        
        populateStationSelect(stations);
    } catch (error) {
        console.error('Error fetching stations:', error);
        alert('Failed to load radio stations. Please try again later.');
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

// Populate station select
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
    audioPlayer.src = url;
    audioPlayer.play();
    nowPlayingStation.textContent = `Station: ${name}`;
    nowPlayingSong.textContent = `Song: Loading...`;
    nowPlayingUrl.textContent = `URL: ${url}`;
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
        stationImage.src = station.image || 'https://via.placeholder.com/50';

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

// Search functionality with debouncing
const debouncedSearch = debounce(() => {
    const query = searchInput.value.toLowerCase().trim();
    const queryWords = query.split(/\s+/); // Split query into words

    const filteredStations = stations.filter(station => {
        const stationName = station.name.toLowerCase();
        return queryWords.every(word => stationName.includes(word)); // Check if all words are included
    });

    populateStationSelect(filteredStations);
}, 300); // 300ms delay

searchInput.addEventListener('input', debouncedSearch);

// Show radio controls on "Browse Radio" button click
browseRadioButton.addEventListener('click', () => {
    radioControlsDiv.classList.remove('hidden');
    fetchRadioStations();
});

// Load favorites on page load
displayFavorites();
