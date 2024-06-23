document.getElementById('file-input').addEventListener('change', handleFileSelect);
document.getElementById('fetch-url').addEventListener('click', handleFetchUrl);
document.getElementById('change-playlist').addEventListener('click', handleChangePlaylist);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            parseM3U(content);
        };
        reader.readAsText(file);
    }
}

function handleFetchUrl() {
    const url = document.getElementById('m3u-url').value;
    if (url) {
        fetch(url)
            .then(response => response.text())
            .then(data => parseM3U(data))
            .catch(error => console.error('Error fetching M3U:', error));
    }
}

function handleChangePlaylist() {
    document.getElementById('playlist').getElementsByTagName('tbody')[0].innerHTML = '';
    document.getElementById('m3u-url').value = '';
    document.getElementById('file-input').value = '';
}

function parseM3U(content) {
    const lines = content.split('\n');
    const playlist = document.getElementById('playlist').getElementsByTagName('tbody')[0];
    playlist.innerHTML = '';
    let channelInfo = null;

    lines.forEach((line) => {
        if (line.startsWith('#EXTINF')) {
            const info = line.split(',');
            const channelName = info[1].trim();
            const logoMatch = line.match(/tvg-logo="(.*?)"/);
            const logo = logoMatch ? logoMatch[1] : '';
            channelInfo = { channelName, logo };
        } else if (line && !line.startsWith('#')) {
            const url = line.trim();
            if (channelInfo) {
                channelInfo.url = url;
                addChannelToTable(channelInfo);
                channelInfo = null;
            }
        }
    });
}

function addChannelToTable(channelInfo) {
    const playlist = document.getElementById('playlist').getElementsByTagName('tbody')[0];
    const row = playlist.insertRow();
    
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);

    cell1.innerHTML = `<img src="${channelInfo.logo}" alt="Logo" /> ${channelInfo.channelName}`;
    cell2.innerHTML = `<span class="play-button" onclick="playVideo('${channelInfo.url}')">Play</span>`;
}

function playVideo(src) {
    const player = videojs('video');
    player.src({ src: src, type: 'application/x-mpegURL' });

    player.ready(() => {
        // Add HTTP Source Selector plugin
        player.httpSourceSelector();
        player.controlBar.addChild('QualitySelector');

        // Add Picture-in-Picture button
        if (!document.getElementById('pip-button')) {
            const pipButton = document.createElement('button');
            pipButton.id = 'pip-button';
            pipButton.className = 'vjs-pip-control vjs-control vjs-button';
            pipButton.innerHTML = `<span class="vjs-control-text">Picture-in-Picture</span>`;
            pipButton.onclick = () => {
                if (document.pictureInPictureElement) {
                    document.exitPictureInPicture();
                } else {
                    player.el().requestPictureInPicture();
                }
            };
            player.controlBar.el().insertBefore(pipButton, player.controlBar.getChild('fullscreenToggle').el());
        }
    });

    player.play();
}

// Initialize Video.js with HTTP Source Selector plugin
videojs('video', {
    html5: {
        hls: {
            overrideNative: true  // Override native HLS support to ensure plugin compatibility
        }
    }
}, function() {
    this.httpSourceSelector();
    this.controlBar.addChild('QualitySelector');
});
