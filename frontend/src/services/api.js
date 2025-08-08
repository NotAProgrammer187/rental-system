import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Utility function to get full image URL for Base64 images stored in MongoDB
export const getImageUrl = (imageData, rentalId, imageIndex) => {
  if (!imageData) return null;
  
  // If it's already a full URL, return as is
  if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
    return imageData;
  }
  
  // If it's a blob URL, return as is (for existing data that might have blob URLs)
  if (typeof imageData === 'string' && imageData.startsWith('blob:')) {
    return imageData;
  }
  
  // If it's the new Base64 image structure (object with data property)
  if (typeof imageData === 'object' && imageData.data) {
    // Return the Base64 data URL
    return `data:${imageData.contentType};base64,${imageData.data}`;
  }
  
  // If it's a rental ID and image index (for the new MongoDB storage)
  if (rentalId && typeof imageIndex === 'number') {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseURL = isDevelopment ? 'http://localhost:5000' : window.location.origin;
    return `${baseURL}/api/rentals/${rentalId}/image/${imageIndex}`;
  }
  
  // If it's a relative path (starts with /), construct the full URL (legacy support)
  if (typeof imageData === 'string' && imageData.startsWith('/')) {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseURL = isDevelopment ? 'http://localhost:5000' : window.location.origin;
    return `${baseURL}${imageData}`;
  }
  
  // If it's just a filename, construct the full URL (legacy support)
  if (typeof imageData === 'string') {
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const baseURL = isDevelopment ? 'http://localhost:5000' : window.location.origin;
    return `${baseURL}/uploads/${imageData}`;
  }
  
  return null;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login for 401 errors on non-auth endpoints
    if (error.response?.status === 401 && !error.config.url.includes('/auth/me')) {
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
      
      // Only redirect if we're not already on the login page and not during auth verification
      if (window.location.pathname !== '/login' && !error.config.url.includes('/auth/')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

