import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import History from './History';
import Input from './Input';
import Profile from './Profile';

export default function Zhkh() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'input' | 'profile'>('dashboard');
  const navigate = useNavigate();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigateToInput={() => setActiveTab('input')} />;
      case 'history': return <History />;
      case 'input': return <Input onBack={() => setActiveTab('dashboard')} />;
      case 'profile': return <Profile />;
      default: return <Dashboard onNavigateToInput={() => setActiveTab('input')} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-24 relative">
      {/* Верхний бар (только для не-input экранов) */}
      {activeTab !== 'input' && (
        <div className="sticky top-0 z-20 bg-dark-900/90 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition">
            ← Назад
          </button>
          <h1 className="text-lg font-bold font-display">Счетчики ЖКХ</h1>
          <div className="w-10 h-10 flex items-center justify-center">
            {/* Буми статичный в углу */}
            <img src="/bumi/pose-1.png" alt="Буми" className="w-10 h-10 object-contain" />
          </div>
        </div>
      )}

      {/* Контент */}
      <main className="px-4 py-4">
        {renderContent()}
      </main>

      {/* Нижний таб-бар с FAB */}
      {activeTab !== 'input' && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-900/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)] z-30">
          <div className="flex items-end justify-around h-16 relative">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center w-16 h-full transition ${activeTab === 'dashboard' ? 'text-neon-cyan' : 'text-slate-500'}`}
            >
              <span className="text-xl">🏠</span>
              <span className="text-[10px] mt-1">Главная</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center justify-center w-16 h-full transition ${activeTab === 'history' ? 'text-neon-cyan' : 'text-slate-500'}`}
            >
              <span className="text-xl">📊</span>
              <span className="text-[10px] mt-1">История</span>
            </button>

            {/* FAB Кнопка ВВОД */}
            <button 
              onClick={() => setActiveTab('input')}
              className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center text-white text-2xl font-bold border-4 border-dark-900 hover:scale-105 transition-transform"
            >
              ➕
            </button>

            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center justify-center w-16 h-full transition ${activeTab === 'profile' ? 'text-neon-cyan' : 'text-slate-500'}`}
            >
              <span className="text-xl">👤</span>
              <span className="text-[10px] mt-1">Профиль</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}