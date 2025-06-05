/**
 * Spotify AI Music Assistant - Player Module
 * Handles Spotify Web Playback SDK integration and playback controls
 */

// Constants
const VOLUME_KEY = 'spotify_player_volume';
const DEFAULT_VOLUME = 0.5;

// Module state
let spotifyPlayer = null;
let deviceId = null;
let currentTrack = null;
let isPlaying = false;
let playerCallbacks = {
  onReady: [],
  onPlayerStateChanged: [],
  onError: []
};

/**
 * Initialize the Spotify Web Playback SDK
 * @returns {Promise<boolean>} Success status
 */
async function initializePlayer() {
  // Check if player is already initialized
  if (spotifyPlayer) {
    console.log('Player already initialized');
    return true;
  }
  
  // Check if Spotify SDK is available
  if (!window.Spotify) {
    console.error('Spotify Web Playback SDK not loaded');
    showPlaybackStatus('Spotify Web Playback SDK failed to load', 'error');
    return false;
  }
  
  // Get access token
  const accessToken = window.SpotifyAuth.getAccessToken();
  if (!accessToken) {
    console.error('No access token available');
    showPlaybackStatus('Authentication required', 'error');
    return false;
  }
  
  // Get saved volume or use default
  const savedVolume = localStorage.getItem(VOLUME_KEY);
  const initialVolume = savedVolume ? parseFloat(savedVolume) : DEFAULT_VOLUME;
  
  // Create player instance
  spotifyPlayer = new Spotify.Player({
    name: 'Spotify AI Music Assistant',
    getOAuthToken: cb => { cb(accessToken); },
    volume: initialVolume
  });
  
  // Error handling
  spotifyPlayer.addListener('initialization_error', ({ message }) => {
    console.error('Initialization error:', message);
    showPlaybackStatus('Player initialization failed: ' + message, 'error');
    triggerCallback('onError', { type: 'initialization', message });
  });
  
  spotifyPlayer.addListener('authentication_error', ({ message }) => {
    console.error('Authentication error:', message);
    showPlaybackStatus('Authentication error: ' + message, 'error');
    
    // Try to refresh the token
    window.SpotifyAuth.refreshToken().then(success => {
      if (success) {
        // Reinitialize player with new token
        spotifyPlayer.disconnect();
        spotifyPlayer = null;
        initializePlayer();
      } else {
        triggerCallback('onError', { type: 'authentication', message });
      }
    });
  });
  
  spotifyPlayer.addListener('account_error', ({ message }) => {
    console.error('Account error:', message);
    showPlaybackStatus('Account error: ' + message, 'error');
    triggerCallback('onError', { type: 'account', message });
  });
  
  spotifyPlayer.addListener('playback_error', ({ message }) => {
    console.error('Playback error:', message);
    showPlaybackStatus('Playback error: ' + message, 'error');
    triggerCallback('onError', { type: 'playback', message });
  });
  
  // Playback status updates
  spotifyPlayer.addListener('player_state_changed', state => {
    if (!state) {
      return;
    }
    
    currentTrack = state.track_window.current_track;
    isPlaying = !state.paused;
    
    // Trigger callbacks
    triggerCallback('onPlayerStateChanged', { 
      track: currentTrack,
      isPlaying: isPlaying,
      position: state.position,
      duration: state.duration,
      state: state
    });
  });
  
  // Ready event
  spotifyPlayer.addListener('ready', ({ device_id }) => {
    console.log('Player Ready with Device ID:', device_id);
    deviceId = device_id;
    showPlaybackStatus('Connected to Spotify', 'success');
    
    // Trigger callbacks
    triggerCallback('onReady', { deviceId: device_id });
    
    // Hide status after a delay
    setTimeout(() => {
      hidePlaybackStatus();
    }, 3000);
  });
  
  // Not Connected handling
  spotifyPlayer.addListener('not_ready', ({ device_id }) => {
    console.log('Device ID has gone offline', device_id);
    showPlaybackStatus('Disconnected from Spotify', 'error');
  });
  
  // Connect to the player
  try {
    const connected = await spotifyPlayer.connect();
    if (connected) {
      console.log('Connected to Spotify successfully!');
      return true;
    } else {
      console.error('Failed to connect to Spotify');
      showPlaybackStatus('Failed to connect to Spotify', 'error');
      return false;
    }
  } catch (error) {
    console.error('Error connecting to Spotify:', error);
    showPlaybackStatus('Error connecting to Spotify', 'error');
    return false;
  }
}

/**
 * Register callback functions for player events
 * @param {string} event - Event name ('onReady', 'onPlayerStateChanged', 'onError')
 * @param {Function} callback - Callback function
 */
function registerCallback(event, callback) {
  if (playerCallbacks[event] && typeof callback === 'function') {
    playerCallbacks[event].push(callback);
  }
}

/**
 * Trigger registered callbacks for an event
 * @param {string} event - Event name
 * @param {Object} data - Data to pass to callbacks
 */
function triggerCallback(event, data) {
  if (playerCallbacks[event]) {
    playerCallbacks[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${event} callback:`, error);
      }
    });
  }
}

/**
 * Display playback status message
 * @param {string} message - Status message
 * @param {string} type - Message type ('success', 'error', etc.)
 */
function showPlaybackStatus(message, type = '') {
  console.log(`Playback status: ${message} (${type})`);
  
  const playbackStatus = document.getElementById('playback-status');
  if (playbackStatus) {
    playbackStatus.textContent = message;
    playbackStatus.className = 'playback-status active';
    
    if (type) {
      playbackStatus.classList.add(type);
    }
  }
}

/**
 * Hide playback status message
 */
function hidePlaybackStatus() {
  const playbackStatus = document.getElementById('playback-status');
  if (playbackStatus) {
    playbackStatus.classList.remove('active');
  }
}

/**
 * Toggle play/pause
 * @returns {Promise<boolean>} Success status
 */
async function togglePlay() {
  if (!spotifyPlayer) {
    console.error('Player not initialized');
    return false;
  }
  
  try {
    return await spotifyPlayer.togglePlay();
  } catch (error) {
    console.error('Toggle play error:', error);
    return false;
  }
}

/**
 * Skip to next track
 * @returns {Promise<boolean>} Success status
 */
async function nextTrack() {
  if (!spotifyPlayer) {
    console.error('Player not initialized');
    return false;
  }
  
  try {
    return await spotifyPlayer.nextTrack();
  } catch (error) {
    console.error('Skip track error:', error);
    return false;
  }
}

/**
 * Skip to previous track
 * @returns {Promise<boolean>} Success status
 */
async function previousTrack() {
  if (!spotifyPlayer) {
    console.error('Player not initialized');
    return false;
  }
  
  try {
    return await spotifyPlayer.previousTrack();
  } catch (error) {
    console.error('Previous track error:', error);
    return false;
  }
}

/**
 * Set player volume
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {Promise<boolean>} Success status
 */
async function setVolume(volume) {
  if (!spotifyPlayer) {
    console.error('Player not initialized');
    return false;
  }
  
  try {
    const success = await spotifyPlayer.setVolume(volume);
    if (success) {
      localStorage.setItem(VOLUME_KEY, volume.toString());
    }
    return success;
  } catch (error) {
    console.error('Set volume error:', error);
    return false;
  }
}

/**
 * Play a specific track or playlist
 * @param {string} uri - Spotify URI (track or playlist)
 * @returns {Promise<boolean>} Success status
 */
async function playSong(uri) {
  if (!deviceId) {
    showPlaybackStatus('Playback device not ready. Please try again in a moment.', 'error');
    return false;
  }
  
  const accessToken = window.SpotifyAuth.getAccessToken();
  if (!accessToken) {
    console.error('No access token available');
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
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await window.SpotifyAuth.refreshToken();
        if (refreshed) {
          return playSong(uri);
        } else {
          throw new Error('Token refresh failed');
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error playing track:', error);
    showPlaybackStatus('Sorry, I couldn\'t play that track. Please try again.', 'error');
    return false;
  }
}

/**
 * Get available devices
 * @returns {Promise<Array>} List of available devices
 */
async function getAvailableDevices() {
  const accessToken = window.SpotifyAuth.getAccessToken();
  if (!accessToken) {
    console.error('No access token available');
    return [];
  }
  
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await window.SpotifyAuth.refreshToken();
        if (refreshed) {
          return getAvailableDevices();
        } else {
          throw new Error('Token refresh failed');
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.devices || [];
  } catch (error) {
    console.error('Error getting devices:', error);
    return [];
  }
}

/**
 * Transfer playback to another device
 * @param {string} deviceId - Target device ID
 * @returns {Promise<boolean>} Success status
 */
async function transferPlayback(deviceId) {
  const accessToken = window.SpotifyAuth.getAccessToken();
  if (!accessToken) {
    console.error('No access token available');
    return false;
  }
  
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: true
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await window.SpotifyAuth.refreshToken();
        if (refreshed) {
          return transferPlayback(deviceId);
        } else {
          throw new Error('Token refresh failed');
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error transferring playback:', error);
    return false;
  }
}

/**
 * Clean up player resources
 */
function cleanup() {
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
    spotifyPlayer = null;
  }
}

// Export functions for use in other modules
window.SpotifyPlayer = {
  initializePlayer,
  registerCallback,
  togglePlay,
  nextTrack,
  previousTrack,
  setVolume,
  playSong,
  getAvailableDevices,
  transferPlayback,
  showPlaybackStatus,
  hidePlaybackStatus,
  cleanup,
  
  // Getters
  getDeviceId: () => deviceId,
  getCurrentTrack: () => currentTrack,
  isPlaying: () => isPlaying
};
