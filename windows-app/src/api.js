import axios from 'axios';
import { API_URL } from './config';

// Create a global axios instance that automatically:
// 1. Adds the auth token from localStorage
// 2. Adds the ngrok-skip-browser-warning header (required for ngrok free tier)
// 3. Validates that responses are JSON, not HTML interstitial pages

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'Accept': 'application/json'
  }
});

// Request interceptor — attach auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — detect ngrok HTML pages
api.interceptors.response.use(
  (response) => {
    // If the response data is a string starting with '<', it's HTML (ngrok interstitial)
    if (typeof response.data === 'string' && response.data.trim().startsWith('<')) {
      console.error('[API] Received HTML instead of JSON — likely ngrok interstitial page');
      return Promise.reject(new Error('Received HTML instead of JSON from API. The ngrok tunnel may need to be restarted.'));
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
