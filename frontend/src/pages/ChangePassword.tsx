import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Проверка совпадения паролей
    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают');
      setLoading(false);
      return;
    }

    // Проверка длины пароля
    if (newPassword.length < 4) {
      setError('Пароль должен содержать минимум 4 символа');
      setLoading(false);
      return;
    }

    try {
      // Отправляем запрос на смену пароля
      const response = await apiClient.post('/api/auth/change-password', {
        new_password: newPassword,
      });

      if (response.data.success) {
        setSuccess(true);
        alert('✅ Пароль успешно изменен!\nТеперь используйте новый пароль для входа.');
        navigate('/profile');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Ошибка при смене пароля';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
        Смена пароля
      </h1>
      <p className="text-center text-gray-500 mb-6 text-sm">
        Придумайте новый надежный пароль
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Текущий пароль
          </label>
          <input
            type="password"
            name="current_password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Введите текущий пароль"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Новый пароль
          </label>
          <input
            type="password"
            name="new_password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Минимум 4 символа"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Подтвердите новый пароль
          </label>
          <input
            type="password"
            name="confirm_password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Повторите новый пароль"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg border border-green-200">
            Пароль успешно изменен!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 px-4 rounded-lg text-white font-semibold transition ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Сохранение...' : 'Сменить пароль'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-full py-2.5 px-4 rounded-lg text-gray-700 font-semibold bg-gray-200 hover:bg-gray-300 transition"
        >
          Отмена
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;