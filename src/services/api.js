import axios from 'axios';
import { API_BASE_URL } from '../config/env';

// Tạo một instance axios với cấu hình sẵn
const api = axios.create({
    baseURL: API_BASE_URL, // Địa chỉ Backend
    timeout: 10000,
});

// Interceptor để tự động gắn Token vào mỗi request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token'); // Lấy token đã lưu sau khi login
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
