import axios from 'axios';

// ПУСТАЯ строка означает "использовать текущий домен". 
// Nginx перехватит запросы к /api и перенаправит их на localhost:3000
const API_BASE_URL = '';

export const apiClient = axios.create({
  baseURL: 'https://booomerang.ru',
  headers: {
    'Content-Type': 'application/json',
    // ПУНКТ 16: Добавлен заголовок для прохождения CSRF-проверки на бэкенде
    'x-requested-with': 'XMLHttpRequest',
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
      // При истечении токена (или невалидном) очищаем хранилище
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Опционально: можно сделать редирект на страницу входа
      // window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;