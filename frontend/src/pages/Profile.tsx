import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

interface Referral {
  id: number;
  phone: string;
  registeredAt: string;
}

interface UserData {
  id: number;
  phone: string;
  role: string;
  referralCount: number;
  createdAt: string;
  referrals: Referral[];
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await apiClient.get('/api/auth/me');
        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (err: any) {
        setError('Не удалось загрузить профиль. Возможно, сессия истекла.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <p className="text-gray-500">Загрузка профиля...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <p className="text-red-500 mb-4">{error || 'Ошибка загрузки'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Вернуться ко входу
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Мой профиль</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
          user.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {user.role === 'SUPER_ADMIN' ? 'Супер-админ' : user.role === 'ADMIN' ? 'Админ' : 'Пользователь'}
        </span>
      </div>

      <div className="space-y-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-500">Ваш номер телефона</p>
          <p className="text-lg font-semibold text-gray-800">{user.phone}</p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-600">Всего приглашено</p>
          <p className="text-3xl font-bold text-blue-700">{user.referralCount}</p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Мои рефералы</h2>
        {user.referrals.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Пока никого не приглашено.</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {user.referrals.map((ref) => (
              <li key={ref.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg text-sm">
                <span className="font-medium text-gray-700">{ref.phone}</span>
                <span className="text-gray-400 text-xs">
                  {new Date(ref.registeredAt).toLocaleDateString('ru-RU')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => navigate('/change-password')}
          className="w-full py-2.5 px-4 rounded-lg text-white font-semibold bg-yellow-500 hover:bg-yellow-600 transition"
        >
          Сменить пароль
        </button>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 rounded-lg text-white font-semibold bg-red-500 hover:bg-red-600 transition"
        >
          Выйти из аккаунта
        </button>
      </div>
    </div>
  );
};

export default Profile;