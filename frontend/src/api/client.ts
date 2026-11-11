import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://booomerang.ru', // 👈 Пока HTTP, пока не настроим HTTPS
  headers: {
    'Content-Type': 'application/json',
    'x-requested-with': 'XMLHttpRequest', // Для CSRF-защиты на бэкенде
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // window.location.href = '/'; // Раскомментируй, если нужен авто-редирект на логин
    }
    return Promise.reject(error);
  }
);

export default apiClient;