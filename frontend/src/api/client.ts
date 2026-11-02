import axios from 'axios';

// Адрес вашего бэкенда. 
// Если тестируете на ПК, оставьте localhost. Если на телефоне — замените на 192.168.3.16
const API_BASE_URL = 'http://localhost:3000'; 

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Автоматически добавляем токен ко всем запросам, если он сохранен в браузере
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});