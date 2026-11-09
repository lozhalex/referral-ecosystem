import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/login', {
        phone,
        password,
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // 🎯 ЛОГИКА РЕДИРЕКТА ПОСЛЕ ВХОДА
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin'); // Очищаем после использования
          navigate(redirectPath);
        } else {
          navigate('/profile'); // Стандартный переход, если редирект не был запрошен
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Произошла ошибка при входе';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          С возвращением!
        </h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          Войдите в свой аккаунт
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Номер телефона
            </label>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (9XX) XXX-XX-XX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Пароль
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 space-y-3">
              <p>{error}</p>
              <div className="flex gap-2">
                <Link 
                  to="/register" 
                  className="flex-1 text-center py-1.5 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium transition"
                >
                  Регистрация
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setPassword('');
                  }}
                  className="flex-1 py-1.5 px-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 text-xs font-medium transition"
                >
                  Повторный вход
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-lg text-white font-semibold transition ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        {/* 🔒 БЛОК ВОССТАНОВЛЕНИЯ ПАРОЛЯ (ВАРИАНТ 4) */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔒</span>
            <h3 className="text-sm font-semibold text-gray-800">Забыли пароль?</h3>
          </div>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Пароль будет выслан в ручном режиме администратором, это займет какое-то время. 
            Пожалуйста, напишите нам <strong>с того номера</strong>, на который зарегистрирован аккаунт.
          </p>
          
          <div className="grid grid-cols-3 gap-2">
            <a 
              href="https://t.me/your_admin_telegram" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 py-2 px-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-xs font-medium border border-blue-200"
            >
              <span>✈️</span> Telegram
            </a>
            <a 
              href="https://wa.me/79000000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 py-2 px-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition text-xs font-medium border border-green-200"
            >
              <span>💬</span> WhatsApp
            </a>
            <a 
              href="https://max.me/your_admin_max" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 py-2 px-1 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition text-xs font-medium border border-purple-200"
            >
              <span>📱</span> Max
            </a>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;