import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ShareModal from '../components/ShareModal';

export default function SmartBenefits() {
  const navigate = useNavigate();
  const [showShareModal, setShowShareModal] = useState(false);
  const token = localStorage.getItem('token');
  const user = token ? JSON.parse(atob(token.split('.')[1])) : null;
  const userPhone = user?.phone || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
          >
            ← На главную
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="text-sm text-gray-300 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
          >
            🎁 Пригласить друга
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Привет, {userPhone}</span>
            <button
              onClick={() => navigate('/profile')}
              className="text-sm text-gray-300 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
            >
              Профиль
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-red-400 hover:text-red-300 transition px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4 font-display">
            Текст о максимальной выгоде
          </h1>
          <p className="text-lg text-slate-400">
            Эта страница находится в разработке. Здесь будет подробное описание преимуществ тарифа СМАРТ.
          </p>
        </div>

        <div className="glass p-8 border border-white/10 rounded-2xl text-center">
          <div className="text-6xl mb-4">💎</div>
          <h2 className="text-2xl font-bold text-white mb-4">Скоро здесь появится подробная информация</h2>
          <p className="text-slate-400 mb-6">
            Мы готовим детальное описание всех преимуществ партнёрского статуса СМАРТ.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition"
          >
            Вернуться на главную
          </button>
        </div>
      </main>

      {showShareModal && (
        <ShareModal
          moduleId="ecosystem"
          userPhone={userPhone}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}