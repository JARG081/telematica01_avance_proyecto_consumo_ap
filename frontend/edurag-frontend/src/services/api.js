import axios from 'axios';

export const authApi = axios.create({
  baseURL: 'http://localhost:5132/api',
});

export const eduragApi = axios.create({
  baseURL: 'http://localhost:5004/api',
});

eduragApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
