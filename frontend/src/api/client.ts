import axios from 'axios';

// ЖЕСТКО ЗАДАЕМ АДРЕС ВАШЕГО VPS СЕРВЕРА
 const API_BASE_URL = 'https://stable-defining-coal-radio.trycloudflare.com';
console.log('🚀 ПРОВЕРКА: Текущий API URL равен:', API_BASE_URL);
// Создаем экземпляр axios с базовыми настройками
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Интерцептор для добавления токена к запросам
apiClient.interceptors.request.use(
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

// Интерцептор для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Если токен истек, удаляем его и перенаправляем на вход
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API методы для аутентификации
export const authApi = {
  // Вход в систему
  login: async (phone: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', {
      phone,
      password,
    });
    return response.data;
  },

  // Регистрация
  register: async (phone: string, password: string, referralCode?: string) => {
    const response = await apiClient.post('/api/auth/register', {
      phone,
      password,
      referralCode,
    });
    return response.data;
  },

  // Выход
  logout: () => {
    localStorage.removeItem('token');
  },
};

// API методы для работы с профилем
export const profileApi = {
  // Получение профиля текущего пользователя
  getProfile: async () => {
    const response = await apiClient.get('/api/profile');
    return response.data;
  },

  // Обновление профиля
  updateProfile: async (data: any) => {
    const response = await apiClient.put('/api/profile', data);
    return response.data;
  },

  // Смена пароля
  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await apiClient.post('/api/profile/change-password', {
      oldPassword,
      newPassword,
    });
    return response.data;
  },
};

// API методы для работы с рефералами
export const referralApi = {
  // Получение списка рефералов
  getReferrals: async () => {
    const response = await apiClient.get('/api/referrals');
    return response.data;
  },

  // Получение статистики
  getStats: async () => {
    const response = await apiClient.get('/api/referrals/stats');
    return response.data;
  },
};

export default apiClient;