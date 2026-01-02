import axios from 'axios';

// Get the API base URL from environment variables or use the proxy path
// In production (Firebase), this should be your deployed backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
