import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Состояния для модальных окон
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (err: any) {
      setError('Не удалось загрузить профиль');
      if (err.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getReferralLink = () => {
    if (!user) return '';
    return `${window.location.origin}/?ref=${user.phone}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Фолбэк для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = getReferralLink();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const link = getReferralLink();
    const shareData = {
      title: 'RefPro — Реферальная экосистема',
      text: `Присоединяйся по моей ссылке!`,
      url: link,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Пользователь отменил шеринг — ничего не делаем
      }
    } else {
      // Если нативный share недоступен — копируем ссылку
      await handleCopyLink();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <p className="text-gray-500">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
      {/* Шапка профиля */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {/* Аватар-заглушка с инициалами */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
            {user.phone.slice(-2)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Мой профиль</h1>
            <p className="text-xs text-gray-500">
              В системе с {formatDate(user.registeredAt || user.createdAt)}
            </p>
          </div>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
          {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
        </span>
      </div>

      {/* Номер телефона */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-xs text-gray-500 mb-1">Ваш номер телефона</p>
        <p className="text-lg font-semibold text-gray-800">{user.phone}</p>
      </div>

      {/* Статистика рефералов */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-600 mb-1">Всего приглашено</p>
        <p className="text-3xl font-bold text-blue-700">{user.referralCount || 0}</p>
      </div>

      {/* Блок "Мои проекты" */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Доступные проекты</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚗</span>
              <span className="text-sm font-medium text-gray-800">Помощник автомобилиста</span>
            </div>
            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
              ✅ Доступен
            </span>
          </div>
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3 opacity-60">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎫</span>
              <span className="text-sm font-medium text-gray-800">Билеты на мероприятия</span>
            </div>
            <span className="text-xs bg-gray-400 text-white px-2 py-0.5 rounded-full">
              ⏳ В разработке
            </span>
          </div>
        </div>
      </div>

      {/* Мои рефералы (краткий список) */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Мои рефералы</h2>
        {user.referrals && user.referrals.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {user.referrals.map((ref: any) => (
              <div key={ref.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                <span className="text-sm font-medium text-gray-800">{ref.phone}</span>
                <span className="text-xs text-gray-500">{formatDate(ref.createdAt)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Пока никого не приглашено.</p>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="space-y-2">
        <button
          onClick={() => setShowInviteModal(true)}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center gap-2"
        >
          <span>🔗</span> Пригласить друга
        </button>

        <button
          onClick={() => navigate('/change-password')}
          className="w-full py-2.5 px-4 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition"
        >
          Сменить пароль
        </button>

        {/* КНОПКА АДМИН-ПАНЕЛИ (Только для роли admin) */}
        {user.role === 'admin' && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full py-2.5 px-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
          >
            <span>🔧</span> Админ-панель
          </button>
        )}

        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-2.5 px-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition"
        >
          Выйти из аккаунта
        </button>
      </div>

      {/* Toast-уведомление "Скопировано!" */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-fade-in">
          ✅ Ссылка скопирована!
        </div>
      )}

      {/* Модальное окно "Пригласить друга" */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Пригласить друга</h3>
            <p className="text-sm text-gray-600 mb-4">
              Отправьте эту ссылку другу. Когда он зарегистрируется, он станет вашим рефералом.
            </p>

            <div className="bg-gray-100 rounded-lg p-3 mb-4 break-all text-sm text-gray-700 font-mono">
              {getReferralLink()}
            </div>

            <div className="space-y-2">
              <button
                onClick={handleCopyLink}
                className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                  copied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? '✅ Скопировано!' : '📋 Скопировать ссылку'}
              </button>

              <button
                onClick={handleShare}
                className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                📤 Поделиться
              </button>

              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setCopied(false);
                }}
                className="w-full py-2 px-4 text-gray-500 text-sm hover:text-gray-700 transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения выхода */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Вы уверены?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Вы хотите выйти из аккаунта?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLogout}
                className="w-full py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
              >
                Да, выйти
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;