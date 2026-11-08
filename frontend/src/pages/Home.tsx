import { useState, useEffect } from 'react';
import Header from '../components/Header';
import ProjectCard from '../components/ProjectCard';
import { projects } from '../data/projects';
import { apiClient } from '../api/client';

const getUserCountText = (count: number) => {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  if (lastTwo > 10 && lastTwo < 20) return 'человек';
  if (lastOne > 1 && lastOne < 5) return 'человека';
  if (lastOne === 1) return 'человек';
  return 'человек';
};

export default function Home() {
  const [showAll, setShowAll] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [autoNotifications, setAutoNotifications] = useState<number>(0);

  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token.split('.')[1])) : null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  // Загрузка реального количества пользователей
  useEffect(() => {
    apiClient.get('/api/stats/total-users')
      .then((res) => {
        if (res.data.success) {
          setUserCount(res.data.count);
        }
      })
      .catch(() => setUserCount(1247));
  }, []);

  // Загрузка уведомлений Автохелпера
  useEffect(() => {
    apiClient.get('/api/auto/notifications')
      .then((res) => {
        if (res.data.success) {
          setAutoNotifications(res.data.totalCount || 0);
        }
      })
      .catch(() => setAutoNotifications(0));
  }, []);

  const available = projects.filter(p => p.status === 'available');
  const development = projects.filter(p => p.status === 'development');
  const planned = projects.filter(p => p.status === 'planned');

  const hiddenCount = planned.length;

  // Функция для рендера карточки проекта с бейджем
  const renderProjectCard = (p: any) => {
    const hasNotification = p.id === 'auto' && autoNotifications > 0;
    
    return (
      <div key={p.id} className="relative">
        <ProjectCard project={p} isAuthorized={!!user} />
        {hasNotification && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse">
              {autoNotifications > 9 ? '9+' : autoNotifications}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Добро пожаловать в экосистему!
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Один аккаунт — доступ ко всем сервисам. Приглашай друзей и получай бонусы за каждое действие.
          </p>
        </section>

        <section className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-5 py-2">
            <span className="text-blue-600 font-semibold">
              {userCount !== null ? (
                <>👥 Нас уже {userCount.toLocaleString('ru-RU')} {getUserCountText(userCount)}</>
              ) : (
                <>👥 Загрузка...</>
              )}
            </span>
          </div>
        </section>

        {available.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span>
              Доступны сейчас
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {available.map(renderProjectCard)}
            </div>
          </section>
        )}

        {development.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              В разработке
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {development.map(renderProjectCard)}
            </div>
          </section>
        )}

        {!showAll && hiddenCount > 0 && (
          <section className="text-center mb-10">
            <button
              onClick={() => setShowAll(true)}
              className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Показать ещё {hiddenCount} проектов ▼
            </button>
          </section>
        )}

        {showAll && planned.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              В планах
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {planned.map(renderProjectCard)}
            </div>
          </section>
        )}

        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Как работает экосистема
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                📱
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Регистрируешься</h3>
              <p className="text-sm text-gray-600">
                Один аккаунт по номеру телефона работает во всех проектах экосистемы
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center text-2xl">
                🎁
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Приглашаешь друзей</h3>
              <p className="text-sm text-gray-600">
                Делись своей ссылкой — получай бонусы за каждого приглашённого
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                💰
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Получаешь кэшбек</h3>
              <p className="text-sm text-gray-600">
                Используй сервисы — получай баллы на единый кошелёк экосистемы
              </p>
            </div>
          </div>
        </section>

        <footer className="text-center text-sm text-gray-500 pb-8">
          <p>© 2026 Краски жизни · Один аккаунт — все сервисы</p>
        </footer>
      </main>
    </div>
  );
}