/**
 * Spotify AI Music Assistant - Authentication Module
 * Handles Spotify authentication, token management, and authorization flow
 */

// Configuration
const clientId = '54cc45b87374449585152aedac126fdf';
const redirectUri = window.location.origin + '/callback.html';
const scopes = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-top-read',
  'user-read-recently-played',
  'streaming'
];

// Storage keys
const ACCESS_TOKEN_KEY = 'spotify_access_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const EXPIRES_AT_KEY = 'spotify_token_expires_at';
const CODE_VERIFIER_KEY = 'spotify_code_verifier';
const STATE_KEY = 'spotify_auth_state';

/**
 * Generate a random string for state and code verifier
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Generate a code challenge from code verifier using SHA-256
 * @param {string} codeVerifier - The code verifier
 * @returns {Promise<string>} Code challenge
 */
async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Initiate the Spotify authorization flow
 */
async function login() {
  // Generate and store state and code verifier
  const state = generateRandomString(16);
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store the code verifier and state in localStorage for later use
  localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
  localStorage.setItem(STATE_KEY, state);
  
  // Construct the authorization URL
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  const params = {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state: state,
    scope: scopes.join(' ')
  };
  
  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}

/**
 * Handle the callback from Spotify authorization
 * @returns {Promise<boolean>} Success status
 */
async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  const storedState = localStorage.getItem(STATE_KEY);
  
  // Verify state to prevent CSRF attacks
  if (!state || state !== storedState) {
    console.error('State mismatch');
    return false;
  }
  
  if (code) {
    try {
      // Exchange the code for an access token
      const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        })
      });
      
      if (!response.ok) {
        throw new Error('HTTP status ' + response.status);
      }
      
      const data = await response.json();
      
      // Store tokens and expiration
      storeTokens(data);
      
      // Clean up
      localStorage.removeItem(CODE_VERIFIER_KEY);
      localStorage.removeItem(STATE_KEY);
      
      return true;
    } catch (error) {
      console.error('Error during token exchange:', error);
      return false;
    }
  } else {
    console.error('No code found in callback');
    return false;
  }
}

/**
 * Store tokens and expiration time
 * @param {Object} data - Token response data
 */
function storeTokens(data) {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  }
  const expiresAt = Date.now() + (data.expires_in * 1000);
  localStorage.setItem(EXPIRES_AT_KEY, expiresAt.toString());
}

/**
 * Get the current access token
 * @returns {string|null} Access token or null if not available
 */
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Check if the current token is expired
 * @returns {boolean} True if token is expired or about to expire
 */
function isTokenExpired() {
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!expiresAt) return true;
  
  // Consider token expired if less than 5 minutes remaining
  return Date.now() > (parseInt(expiresAt) - 300000);
}

/**
 * Refresh the access token
 * @returns {Promise<boolean>} Success status
 */
async function refreshToken() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  
  if (!refreshToken) {
    console.error('No refresh token available');
    return false;
  }
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
      })
    });
    
    if (!response.ok) {
      throw new Error('HTTP status ' + response.status);
    }
    
    const data = await response.json();
    storeTokens(data);
    
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
}

/**
 * Check authentication status and refresh token if needed
 * @returns {Promise<boolean>} Authentication status
 */
async function checkAuth() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return false;
  }
  
  if (isTokenExpired()) {
    return await refreshToken();
  }
  
  try {
    // Verify token is valid with a profile request
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.ok) {
      return true;
    } else if (response.status === 401) {
      // Token is invalid, try to refresh
      return await refreshToken();
    } else {
      console.error('Profile request failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    return false;
  }
}

/**
 * Logout user by clearing tokens
 */
function logout() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
  window.location.href = '/index.html';
}

/**
 * Get user profile information
 * @returns {Promise<Object|null>} User profile or null if request fails
 */
async function getUserProfile() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return null;
  }
  
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await refreshToken();
        if (refreshed) {
          return getUserProfile();
        } else {
          throw new Error('Token refresh failed');
        }
      }
      throw new Error('HTTP status ' + response.status);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Export functions for use in other modules
window.SpotifyAuth = {
  login,
  handleCallback,
  checkAuth,
  getAccessToken,
  refreshToken,
  logout,
  getUserProfile
};
