// Check if user is authenticated
const accessToken = localStorage.getItem('spotify_access_token');
if (!accessToken) {
  window.location.href = 'index.html';
}

// Initialize variables
let spotifyPlayer = null; // Changed to let since we'll reassign it
let deviceId = null;
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Define the Spotify Web Playback SDK ready function FIRST
function initializeSpotifyPlayer() {
  if (spotifyPlayer) return; // Prevent duplicate initialization

  player = new Spotify.Player({
    name: 'Spotify AI Assistant',
    getOAuthToken: cb => { cb(accessToken); },
    volume: 0.5 // Added default volume
  });

  // Error handling
  player.addListener('initialization_error', ({ message }) => { 
    console.error('Initialization Error:', message);
  });
  
  player.addListener('authentication_error', ({ message }) => { 
    console.error('Auth Error:', message);
    localStorage.removeItem('spotify_access_token');
    window.location.href = 'index.html';
  });
  
  player.addListener('account_error', ({ message }) => { 
    console.error('Account Error:', message);
  });
  
  player.addListener('playback_error', ({ message }) => { 
    console.error('Playback Error:', message);
  });

  // Playback status updates
  player.addListener('player_state_changed', state => {
    console.log('Player State Changed:', state);
    if (state) {
      updatePlayerInfo(state);
    }
  });

  // Ready event
  player.addListener('ready', ({ device_id }) => {
    console.log('Player Ready with Device ID:', device_id);
    deviceId = device_id;
    // Notify user player is ready
    addMessage('Player is connected and ready!', false);
  });

  // Not Connected handling
  spotifyPlayer.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
    addMessage('Player disconnected. Trying to reconnect...', false);
  });

  // Connect to the player
  player.connect().then(success => {
    if (success) {
      console.log('Connected to Spotify successfully!');
    }
  });
}

// Set up the global callback required by Spotify SDK
window.onSpotifyWebPlaybackSDKReady = initializeSpotifyPlayer;

// Update player information
function updatePlayerInfo(state) {
  if (!state?.track_window?.current_track) return;
  
  const track = state.track_window.current_track;
  const elements = {
    track: document.getElementById('track-name'),
    artist: document.getElementById('artist-name'),
    albumArt: document.getElementById('album-art'),
    playPause: document.getElementById('play-pause')
  };

  if (elements.track) elements.track.textContent = track.name;
  if (elements.artist) {
    elements.artist.textContent = track.artists.map(artist => artist.name).join(', ');
  }
  if (elements.albumArt && track.album.images.length > 0) {
    elements.albumArt.src = track.album.images[0].url;
    elements.albumArt.alt = `${track.name} album art`;
  }
  if (elements.playPause) {
    elements.playPause.textContent = state.paused ? 'Play' : 'Pause';
    elements.playPause.title = state.paused ? 'Resume playback' : 'Pause playback';
  }
}

// Process user input
async function processUserInput() {
  const text = userInput.value.trim();
  if (!text) return;
  
  // Add user message to chat
  addMessage(text, true);
  userInput.value = '';
  
  // Show thinking indicator
  const thinkingMsg = addMessage('Thinking...', false);
  
  try {
    // Call your AI backend here
    const response = await mockAIResponse(text);
    
    // Remove thinking message
    chatMessages.removeChild(thinkingMsg);
    
    // Add AI response
    addMessage(response.message, false);
    
    // Handle playback if needed
    if (response.action === 'play' && response.trackUri) {
      await playSong(response.trackUri);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    chatMessages.removeChild(thinkingMsg);
    addMessage('Sorry, I encountered an error. Please try again.', false);
  }
}

// Modified addMessage to return the element for later removal
function addMessage(text, isUser) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = text;
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv;
}

// Mock AI response (replace with actual AI integration)
async function mockAIResponse(text) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const lowerText = text.toLowerCase();
  
  // Simple keyword matching for demo purposes
  if (lowerText.includes('jazz') && lowerText.includes('studying')) {
    return {
      message: 'Playing some relaxing jazz perfect for studying.',
      action: 'play',
      trackUri: 'spotify:playlist:37i9dQZF1DX0SM0LYsmbMT'
    };
  } else if (lowerText.includes('90s') && lowerText.includes('bollywood')) {
    return {
      message: 'Here\'s a mix of 90s Bollywood romantic songs—enjoy!',
      action: 'play',
      trackUri: 'spotify:playlist:37i9dQZF1DX0XUfTFmNBRM'
    };
  } else if (lowerText.includes('deep focus')) {
    return {
      message: 'Found a great playlist for deep focus. Playing now.',
      action: 'play',
      trackUri: 'spotify:playlist:37i9dQZF1DX3PFzdbtx1Us'
    };
  } else if (lowerText.includes('upbeat') && lowerText.includes('working out')) {
    return {
      message: 'Here\'s an energetic playlist for your workout!',
      action: 'play',
      trackUri: 'spotify:playlist:37i9dQZF1DX76Wlfdnj7AP'
    };
  } else {
    return {
      message: 'I\'m not sure what you\'re looking for. Try asking for a specific genre, mood, or activity.',
      action: 'none'
    };
  }
}

// Improved playSong function with better error handling
async function playSong(uri) {
  if (!deviceId) {
    addMessage('Playback device not ready. Please try again in a moment.', false);
    return false;
  }
  
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uris: uri.startsWith('spotify:track') ? [uri] : undefined,
        context_uri: uri.startsWith('spotify:playlist') ? uri : undefined
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error playing track:', error);
    addMessage('Sorry, I couldn\'t play that track. Please try again.', false);
    return false;
  }
}

// Event listeners
sendButton.addEventListener('click', processUserInput);
userInput.addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    processUserInput();
  }
});

// Player control handlers with error checking
document.getElementById('play-pause')?.addEventListener('click', () => {
  if (spotifyPlayer) {
    spotifyPlayer.togglePlay().catch(error => {
      console.error('Toggle play error:', error);
    });
  }
});

document.getElementById('skip')?.addEventListener('click', () => {
  if (player) {
    player.nextTrack().catch(error => {
      console.error('Skip track error:', error);
    });
  }
});

// Add a check for player initialization
function checkPlayerInitialization() {
  if (!spotifyPlayer && window.Spotify) {
    initializeSpotifyPlayer();
  }
}

// Periodically check for SDK availability (fallback)
const initializationCheck = setInterval(() => {
  if (window.Spotify) {
    initializeSpotifyPlayer();
    clearInterval(initializationCheck);
  }
}, 500);
