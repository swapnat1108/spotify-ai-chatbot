// Check if user is authenticated
const accessToken = localStorage.getItem('spotify_access_token');
if (!accessToken) {
  window.location.href = 'index.html';
}

// Initialize variables
let player;
let deviceId;
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Initialize Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
  player = new Spotify.Player({
    name: 'Spotify AI Assistant',
    getOAuthToken: cb => { cb(accessToken); }
  });

  // Error handling
  player.addListener('initialization_error', ({ message }) => { console.error(message); });
  player.addListener('authentication_error', ({ message }) => { 
    console.error(message);
    localStorage.removeItem('spotify_access_token');
    window.location.href = 'index.html';
  });
  player.addListener('account_error', ({ message }) => { console.error(message); });
  player.addListener('playback_error', ({ message }) => { console.error(message); });

  // Playback status updates
  player.addListener('player_state_changed', state => {
    if (state) {
      updatePlayerInfo(state);
    }
  });

  // Ready
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    deviceId = device_id;
  });

  // Connect to the player
  player.connect();
};

// Update player information
function updatePlayerInfo(state) {
  if (state.track_window.current_track) {
    const track = state.track_window.current_track;
    document.getElementById('track-name').textContent = track.name;
    document.getElementById('artist-name').textContent = track.artists.map(artist => artist.name).join(', ');
    document.getElementById('album-art').src = track.album.images[0].url;
    
    document.getElementById('play-pause').textContent = state.paused ? 'Play' : 'Pause';
  }
}

// Add message to chat
function addMessage(text, isUser) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = text;
  
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Process user input
async function processUserInput() {
  const text = userInput.value.trim();
  if (!text) return;
  
  // Add user message to chat
  addMessage(text, true);
  userInput.value = '';
  
  // Show thinking indicator
  addMessage('Thinking...', false);
  
  try {
    // Call your AI backend here
    // For now, we'll use a simple mock response
    const response = await mockAIResponse(text);
    
    // Remove thinking message
    chatMessages.removeChild(chatMessages.lastChild);
    
    // Add AI response
    addMessage(response.message, false);
    
    // Handle playback if needed
    if (response.action === 'play' && response.trackUri) {
      playSong(response.trackUri);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    chatMessages.removeChild(chatMessages.lastChild);
    addMessage('Sorry, I encountered an error. Please try again.', false);
  }
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

// Play a song or playlist
function playSong(uri) {
  if (!deviceId) {
    addMessage('Playback device not ready. Please try again in a moment.', false);
    return;
  }
  
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: uri.startsWith('spotify:track') ? [uri] : undefined,
      context_uri: uri.startsWith('spotify:playlist') ? uri : undefined
    })
  }).catch(error => {
    console.error('Error playing track:', error);
    addMessage('Sorry, I couldn\'t play that track. Please try again.', false);
  });
}

// Event listeners
sendButton.addEventListener('click', processUserInput);
userInput.addEventListener('keypress', event => {
  if (event.key === 'Enter') {
    processUserInput();
  }
});

document.getElementById('play-pause').addEventListener('click', () => {
  player.togglePlay();
});

document.getElementById('skip').addEventListener('click', () => {
  player.nextTrack();
});
// Define the required function for Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = function() {
  console.log("Spotify Web Playback SDK is ready");
  // The SDK initialization will happen here once we have authentication
};
