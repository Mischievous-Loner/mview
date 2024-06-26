document.getElementById('load-playlist').addEventListener('click', loadPlaylist);
document.getElementById('close-player').addEventListener('click', closePlayer);
document.getElementById('apply-filters').addEventListener('click', applyFilters);

let channels = [];
let player = null;

function loadPlaylist() {
    const urlInput = document.getElementById('playlist-url').value;
    const fileInput = document.getElementById('playlist-file').files[0];

    if (urlInput) {
        fetch(urlInput)
            .then(response => response.text())
            .then(data => parseM3U(data));
    } else if (fileInput) {
        const reader = new FileReader();
        reader.onload = function(event) {
            parseM3U(event.target.result);
        };
        reader.readAsText(fileInput);
    }
}

function parseM3U(data) {
    channels = [];
    const lines = data.split('\n');
    let currentChannel = {};

    lines.forEach(line => {
        line = line.trim();
        if (line.startsWith('#EXTINF')) {
            const info = line.match(/#EXTINF:.*,(.*)/)[1];
            const logoMatch = line.match(/tvg-logo="(.*?)"/);
            const categoryMatch = line.match(/group-title="(.*?)"/);
            const languageMatch = line.match(/language="(.*?)"/);

            currentChannel = {
                name: info,
                logo: logoMatch ? logoMatch[1] : '',
                category: categoryMatch ? categoryMatch[1] : 'Other',
                language: languageMatch ? languageMatch[1] : 'Unknown'
            };
        } else if (line && !line.startsWith('#')) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {};
        }
    });

    updateFilters();
    displayChannels(channels);
}

function updateFilters() {
    const categoryFilter = document.getElementById('category-filter');
    const languageFilter = document.getElementById('language-filter');

    const categories = [...new Set(channels.map(channel => channel.category))];
    const languages = [...new Set(channels.map(channel => channel.language))];

    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    languageFilter.innerHTML = '<option value="all">All Languages</option>';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    languages.forEach(language => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language;
        languageFilter.appendChild(option);
    });
}

function displayChannels(channels) {
    const channelList = document.getElementById('channel-list');
    channelList.innerHTML = '';

    channels.forEach(channel => {
        const channelElement = document.createElement('div');
        channelElement.className = 'channel';
        channelElement.innerHTML = `
            <img src="${channel.logo}" alt="${channel.name}">
            <p>${channel.name}</p>
        `;
        channelElement.addEventListener('click', () => playChannel(channel.url));
        channelList.appendChild(channelElement);
    });
}

function applyFilters() {
    const searchQuery = document.getElementById('search-channels').value.toLowerCase();
    const selectedCategory = document.getElementById('category-filter').value;
    const selectedLanguage = document.getElementById('language-filter').value;

    const filteredChannels = channels.filter(channel => {
        const matchesSearch = channel.name.toLowerCase().includes(searchQuery);
        const matchesCategory = selectedCategory === 'all' || channel.category === selectedCategory;
        const matchesLanguage = selectedLanguage === 'all' || channel.language === selectedLanguage;
        return matchesSearch && matchesCategory && matchesLanguage;
    });

    displayChannels(filteredChannels);
}

function playChannel(url) {
    const playerContainer = document.getElementById('video-player-container');
    const copyUrlBtn = document.getElementById('copy-url-btn');

    if (!playerContainer.classList.contains('hidden') && player && player.core.activePlayback.src === url) {
        return;
    }

    if (player) {
        player.destroy();
    }

    playerContainer.classList.remove('hidden');

    player = new Clappr.Player({
        source: url,
        parentId: '#player',
        width: '100%',
        height: '100%',
        autoPlay: true
    });

    copyUrlBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(url);
    });
}

function closePlayer() {
    const playerContainer = document.getElementById('video-player-container');
    playerContainer.classList.add('hidden');
    if (player) {
        player.destroy();
        player = null;
    }
    document.getElementById('player').innerHTML = '';
}
