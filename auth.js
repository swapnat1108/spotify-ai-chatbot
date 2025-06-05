/**
 * Spotify AI Music Assistant - Authentication Module for GitHub Pages
 * Handles Spotify authentication, token management, and authorization flow
 */

// Configuration
const clientId = '54cc45b87374449585152aedac126fdf';
// Use the full GitHub Pages URL for the redirect
const redirectUri = 'https://swapnat1108.github.io/spotify-ai-chatbot/callback.html';
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
 * For GitHub Pages, we'll use the implicit grant flow
 */
function login() {
  // Generate state for CSRF protection
  const state = generateRandomString(16);
  localStorage.setItem(STATE_KEY, state);
  
  // Construct the authorization URL for implicit grant
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  const params = {
    client_id: clientId,
    response_type: 'token',
    redirect_uri: redirectUri,
    state: state,
    scope: scopes.join(' ')
  };
  
  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
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
 * Check authentication status
 * @returns {Promise<boolean>} Authentication status
 */
async function checkAuth() {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return false;
  }
  
  if (isTokenExpired()) {
    // For GitHub Pages with implicit grant, we need to re-authenticate
    // as refresh tokens aren't available
    return false;
  }
  
  try {
    // Verify token is valid with a profile request
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    return response.ok;
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
  localStorage.removeItem(EXPIRES_AT_KEY);
  window.location.href = '/spotify-ai-chatbot/index.html';
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
  checkAuth,
  getAccessToken,
  logout,
  getUserProfile
};
