import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const Register: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Системный реферер по умолчанию
  const DEFAULT_REFERRER = '+79503278027';

  // Функция для автоматической подстановки номера
  const handleSetDefaultReferrer = () => {
    setReferredBy(DEFAULT_REFERRER);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/register', {
        phone,
        // Если поле пустое, отправляем undefined, иначе отправляем введенный или системный номер
        referred_by_phone: referredBy.trim() === '' ? undefined : referredBy,
      });

      if (response.data.success) {
        alert('✅ Регистрация успешна!\nВаш временный пароль: 1234\nТеперь вы можете войти.');
        navigate('/'); // Перенаправляем на страницу входа
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Регистрация
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ваш номер телефона
          </label>
          <input
            type="tel"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+79001234567"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Телефон пригласившего (необязательно)
          </label>
          <input
            type="tel"
            name="referred_by"
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
            placeholder="+79001234567"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {/* Кнопка для автоматической подстановки системного реферера */}
          <button
            type="button"
            onClick={handleSetDefaultReferrer}
            className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline focus:outline-none"
          >
            Не знаю номера (использовать системный)
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 px-4 rounded-lg text-white font-semibold transition ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Уже есть аккаунт?{' '}
          <Link to="/" className="text-blue-600 font-medium hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;