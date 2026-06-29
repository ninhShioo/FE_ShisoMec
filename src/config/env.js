const getDefaultBackendUrl = () => {
    if (typeof window === 'undefined') {
        return 'http://localhost:8080';
    }

    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';

    if (protocol === 'file:' || !hostname) {
        return 'http://localhost:8080';
    }

    return `${protocol}//${hostname}:8080`;
};

const DEFAULT_BACKEND_URL = getDefaultBackendUrl();

export const API_BASE_URL = import.meta.env.VITE_API_URL || `${DEFAULT_BACKEND_URL}/api`;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_BACKEND_URL;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
