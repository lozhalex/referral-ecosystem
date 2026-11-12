import { useState, useEffect } from 'react';
import Header from '../components/Header';
import ProjectCard from '../components/ProjectCard';
import { projects } from '../data/projects';
import { apiClient } from '../api/client';
import { 
  isPushSupported, 
  requestNotificationPermission, 
  registerServiceWorker, 
  subscribeToPush,
  getVapidPublicKey,
  urlBase64ToUint8Array
} from '../utils/push';

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

  // Загрузка общего количества пользователей
  useEffect(() => {
    apiClient.get('/api/stats/total-users')
      .then((res) => {
        if (res.data.success) {
          setUserCount(res.data.count);
        } else {
          setUserCount(0);
        }
      })
      .catch((err) => {
        console.error('Ошибка загрузки счетчика пользователей:', err);
        setUserCount(0);
      });
  }, []);

  // Загрузка количества уведомлений для бейджа
  useEffect(() => {
    apiClient.get('/api/auto/notifications')
      .then((res) => {
        if (res.data.success) setAutoNotifications(res.data.totalCount || 0);
      })
      .catch((err) => {
        console.error('Ошибка загрузки уведомлений:', err);
        setAutoNotifications(0);
      });
  }, []);

  // 🆕 Инициализация Push-уведомлений с РЕАЛЬНЫМ VAPID ключом
  useEffect(() => {
    const initPush = async () => {
      if (user && isPushSupported()) {
        // Запрашиваем разрешение только если оно еще не было дано или отклонено
        if (Notification.permission === 'default') {
          const permission = await requestNotificationPermission();
          
          if (permission === 'granted') {
            const registration = await registerServiceWorker();
            if (registration) {
              try {
                // Получаем реальный публичный ключ с бэкенда
                const publicKey = await getVapidPublicKey();
                
                if (publicKey) {
                  const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey)
                  });
                  
                  await subscribeToPush(subscription.toJSON());
                  console.log('Push subscription successful');
                }
              } catch (err) {
                console.error('Push subscription failed:', err);
              }
            }
          }
        }
      }
    };
    initPush();
  }, [user]);

  const available = projects.filter(p => p.status === 'available');
  const development = projects.filter(p => p.status === 'development');
  const planned = projects.filter(p => p.status === 'planned');
  const hiddenCount = planned.length;

  const renderProjectCard = (p: any) => {
    // Показываем бейдж только на плитке "auto" и если есть непрочитанные уведомления
    const hasNotification = p.id === 'auto' && autoNotifications > 0;
    
    return (
      <div key={p.id} className="relative group">
        <ProjectCard project={p} isAuthorized={!!user} />
        {hasNotification && (
          <div className="absolute -top-2 -right-2 z-10">
            <div className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg animate-pulse border-2 border-dark-900">
              {autoNotifications > 9 ? '9+' : autoNotifications}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-900 relative">
      {/* Декоративные фоновые пятна */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>
      
      <Header user={user} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <section className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 font-display tracking-tight">
            Добро пожаловать в <span className="text-neon-gradient">Бумеранг</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Один аккаунт — доступ ко всем сервисам. Приглашай друзей и получай бонусы за каждое действие.
          </p>
        </section>

        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass px-6 py-3 border border-neon-cyan/20">
            <span className="text-neon-cyan font-semibold font-display text-lg">
              {userCount !== null ? (
                <>👥 Нас уже {userCount.toLocaleString('ru-RU')} {getUserCountText(userCount)}</>
              ) : (
                <>👥 Загрузка...</>
              )}
            </span>
          </div>
        </section>

        {available.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 font-display">
              <span className="w-3 h-3 rounded-full bg-neon-green shadow-[0_0_10px_#10B981]"></span>
              Доступны сейчас
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {available.map(renderProjectCard)}
            </div>
          </section>
        )}

        {development.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 font-display">
              <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_10px_#FACC15]"></span>
              В разработке
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {development.map(renderProjectCard)}
            </div>
          </section>
        )}

        {!showAll && hiddenCount > 0 && (
          <section className="text-center mb-12">
            <button
              onClick={() => setShowAll(true)}
              className="px-8 py-3 glass text-slate-300 rounded-xl hover:bg-white/10 hover:text-white transition font-medium border border-white/10"
            >
              Показать ещё {hiddenCount} проектов ▼
            </button>
          </section>
        )}

        {showAll && planned.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3 font-display">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              В планах
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {planned.map(renderProjectCard)}
            </div>
          </section>
        )}

        <section className="glass rounded-2xl border border-white/5 p-8 sm:p-10 mb-12">
          <h2 className="text-2xl font-bold text-white mb-8 text-center font-display">
            Как работает экосистема
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="w-14 h-14 mx-auto mb-4 bg-neon-purple/10 rounded-full flex items-center justify-center text-3xl border border-neon-purple/20">
                📱
              </div>
              <h3 className="font-semibold text-white mb-2 font-display">1. Регистрируешься</h3>
              <p className="text-sm text-slate-400">
                Один аккаунт по номеру телефона работает во всех проектах экосистемы
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="w-14 h-14 mx-auto mb-4 bg-neon-cyan/10 rounded-full flex items-center justify-center text-3xl border border-neon-cyan/20">
                🎁
              </div>
              <h3 className="font-semibold text-white mb-2 font-display">2. Приглашаешь друзей</h3>
              <p className="text-sm text-slate-400">
                Делись своей ссылкой — получай бонусы за каждого приглашённого
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="w-14 h-14 mx-auto mb-4 bg-neon-green/10 rounded-full flex items-center justify-center text-3xl border border-neon-green/20">
                💰
              </div>
              <h3 className="font-semibold text-white mb-2 font-display">3. Получаешь кэшбек</h3>
              <p className="text-sm text-slate-400">
                Используй сервисы — получай баллы на единый кошелёк экосистемы
              </p>
            </div>
          </div>
        </section>

        <footer className="text-center text-sm text-slate-500 pb-8 border-t border-white/5 pt-8">
          <p>© 2026 Бумеранг · Один аккаунт — все сервисы</p>
        </footer>
      </main>
    </div>
  );
}