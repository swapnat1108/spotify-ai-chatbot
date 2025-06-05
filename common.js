/**
 * Spotify AI Music Assistant - Common Utilities
 * Shared utilities and helper functions
 */

/**
 * Format time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Create an element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement} content - Element content
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  
  // Set content
  if (typeof content === 'string') {
    element.textContent = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  }
  
  return element;
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Show a toast notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success', 'error', 'info')
 * @param {number} duration - Display duration in milliseconds
 */
function showToast(message, type = 'info', duration = 3000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = createElement('div', { id: 'toast-container' });
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = createElement('div', { class: `toast ${type}` }, message);
  toastContainer.appendChild(toast);
  
  // Show toast with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide and remove toast after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300); // Match transition duration
  }, duration);
}

/**
 * Make an API request with automatic token refresh
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  const accessToken = window.SpotifyAuth.getAccessToken();
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  // Set default options
  const fetchOptions = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  // Add body if provided
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  
  try {
    const response = await fetch(`https://api.spotify.com/v1/${endpoint}`, fetchOptions);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await window.SpotifyAuth.refreshToken();
        if (refreshed) {
          // Retry with new token
          return apiRequest(endpoint, options);
        } else {
          throw new Error('Token refresh failed');
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Some endpoints return no content
    if (response.status === 204) {
      return {};
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Export functions for use in other modules
window.SpotifyUtils = {
  formatTime,
  createElement,
  debounce,
  showToast,
  apiRequest
};
