/**
 * Spotify AI Music Assistant - Chat Module
 * Handles chat interface, user input, and AI responses
 */

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Track the thinking message for removal
let thinkingMessage = null;

/**
 * Initialize the chat interface
 */
function initializeChat() {
  // Add welcome message
  addMessage("Hello! I'm your Spotify AI Music Assistant. What would you like to listen to today?", false);
  
  // Set up event listeners
  sendButton.addEventListener('click', processUserInput);
  userInput.addEventListener('keypress', event => {
    if (event.key === 'Enter') {
      processUserInput();
    }
  });
  
  // Set up example query listeners if they exist
  const exampleQueries = document.querySelectorAll('.example-query');
  exampleQueries.forEach(query => {
    query.addEventListener('click', () => {
      userInput.value = query.textContent.replace(/"/g, '');
      processUserInput();
    });
  });
}

/**
 * Process user input and generate response
 */
async function processUserInput() {
  const text = userInput.value.trim();
  if (!text) return;
  
  // Add user message to chat
  addMessage(text, true);
  userInput.value = '';
  
  // Show thinking indicator
  showThinking();
  
  try {
    // Call AI response function
    const response = await getAIResponse(text);
    
    // Remove thinking message
    hideThinking();
    
    // Add AI response
    addMessage(response.message, false);
    
    // Handle playback if needed
    if (response.action === 'play' && response.trackUri) {
      const success = await window.SpotifyPlayer.playSong(response.trackUri);
      if (!success) {
        addMessage('I had trouble playing that track. Please make sure your Spotify account is active and try again.', false);
      }
    }
  } catch (error) {
    console.error('Error processing request:', error);
    hideThinking();
    addMessage('Sorry, I encountered an error. Please try again.', false);
  }
}

/**
 * Add a message to the chat interface
 * @param {string} text - Message text
 * @param {boolean} isUser - Whether the message is from the user
 * @returns {HTMLElement} The message element
 */
function addMessage(text, isUser) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = text;
  
  // Add timestamp
  const timestamp = document.createElement('div');
  timestamp.className = 'message-time';
  timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(timestamp);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv;
}

/**
 * Show thinking indicator
 */
function showThinking() {
  thinkingMessage = addMessage('Thinking...', false);
  
  // Remove timestamp from thinking message
  const timestamp = thinkingMessage.querySelector('.message-time');
  if (timestamp) {
    timestamp.remove();
  }
  
  // Add animated dots
  const content = thinkingMessage.querySelector('.message-content');
  content.innerHTML = 'Thinking<span class="typing-indicator"><span></span><span></span><span></span></span>';
}

/**
 * Hide thinking indicator
 */
function hideThinking() {
  if (thinkingMessage && thinkingMessage.parentNode) {
    chatMessages.removeChild(thinkingMessage);
    thinkingMessage = null;
  }
}

/**
 * Get AI response to user input
 * @param {string} text - User input text
 * @returns {Promise<Object>} AI response object
 */
async function getAIResponse(text) {
  // For demo purposes, using a mock response
  // In a real application, this would call an AI service
  
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
  } else if (lowerText.includes('help') || lowerText.includes('what can you do')) {
    return {
      message: 'I can help you find and play music on Spotify. Try asking for music by mood (like "happy" or "relaxing"), activity (like "studying" or "workout"), genre (like "jazz" or "rock"), or specific artists and songs.',
      action: 'none'
    };
  } else {
    // Search for music based on the query
    return {
      message: `I'll look for "${text}" on Spotify. You can also try being more specific about genres, moods, or activities.`,
      action: 'none'
    };
  }
}

/**
 * Update player UI with current track information
 * @param {Object} trackInfo - Track information object
 */
function updatePlayerUI(trackInfo) {
  const trackName = document.getElementById('track-name');
  const artistName = document.getElementById('artist-name');
  const albumArt = document.getElementById('album-art');
  const playPauseButton = document.getElementById('play-pause');
  
  if (!trackInfo || !trackInfo.track) {
    // Reset to default state if no track
    if (trackName) trackName.textContent = 'Not Playing';
    if (artistName) artistName.textContent = '';
    if (albumArt) albumArt.src = 'default-album.png';
    if (playPauseButton) playPauseButton.textContent = 'Play';
    return;
  }
  
  const track = trackInfo.track;
  
  if (trackName) trackName.textContent = track.name;
  
  if (artistName) {
    artistName.textContent = track.artists.map(artist => artist.name).join(', ');
  }
  
  if (albumArt && track.album.images.length > 0) {
    albumArt.src = track.album.images[0].url;
    albumArt.alt = `${track.name} album art`;
  }
  
  if (playPauseButton) {
    playPauseButton.textContent = trackInfo.isPlaying ? 'Pause' : 'Play';
  }
}

// Export functions for use in other modules
window.SpotifyChat = {
  initializeChat,
  addMessage,
  updatePlayerUI
};
