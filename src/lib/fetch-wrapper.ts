// Global fetch wrapper to handle API URL configuration
// This automatically replaces localhost URLs with the correct production URL

const getBaseUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default to localhost for development
  return 'http://localhost:3001';
};

const BASE_URL = getBaseUrl();

// Store original fetch
const originalFetch = window.fetch;

// Override global fetch
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  // Convert input to string if it's a Request or URL object
  let url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  
  // Replace localhost:3001 with the configured base URL
  if (url.includes('localhost:3001')) {
    url = url.replace('http://localhost:3001', BASE_URL);
    console.log('🔄 Fetch URL rewritten:', url);
  }
  
  // Call original fetch with modified URL
  return originalFetch(url, init);
};

console.log('✅ Global fetch wrapper initialized with base URL:', BASE_URL);

export {};
