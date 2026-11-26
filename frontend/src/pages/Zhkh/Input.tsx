import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import History from './History';
import Input from './Input';
import Profile from './Profile';
import AddMeter from './AddMeter';
import Settings from './Settings';

type Tab = 'dashboard' | 'history' | 'input' | 'profile' | 'addMeter' | 'settings';

export default function Zhkh() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const navigate = useNavigate();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigateToInput={() => setActiveTab('input')} onAddMeter={() => setActiveTab('addMeter')} />;
      case 'history': return <History />;
      case 'input': return <Input onAddMeter={() => setActiveTab('addMeter')} />;
      case 'profile': return <Profile />;
      case 'addMeter': return <AddMeter onBack={() => setActiveTab('input')} />;
      case 'settings': return <Settings onBack={() => setActiveTab('dashboard')} onAddMeter={() => setActiveTab('addMeter')} />;
      default: return <Dashboard onNavigateToInput={() => setActiveTab('input')} onAddMeter={() => setActiveTab('addMeter')} />;
    }
  };

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'dashboard', icon: '🏠', label: 'Главная' },
    { key: 'history', icon: '📊', label: 'История' },
    { key: 'input', icon: '➕', label: 'Ввод' },
    { key: 'profile', icon: '👤', label: 'Профиль' },
  ];

  // Таб-бар скрываем только на полноэкранных формах (добавление, настройки)
  // Вкладка 'input' теперь является основным списком, поэтому таб-бар там НУЖЕН.
  const showTabBar = activeTab !== 'addMeter' && activeTab !== 'settings';

  return (
    <div className="min-h-screen bg-dark-900 text-white pb-24 relative">
      {/* Верхний бар */}
      <div className="sticky top-0 z-20 bg-dark-900/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="p-2 text-slate-300 hover:text-white transition">
          ← Назад
        </button>
        <h1 className="text-base font-bold font-display text-white">Счетчики ЖКХ</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('settings')}
            className="p-2 text-slate-300 hover:text-white transition"
            title="Настройки"
          >
            ⚙️
          </button>
          <div className="w-8 h-12 flex items-center justify-center">
            <img src="/bumi/pose-1.png" alt="Буми" className="h-full w-auto object-contain" />
          </div>
        </div>
      </div>

      {/* Контент */}
      <main className="px-4 py-4">
        {renderContent()}
      </main>

      {/* Нижний таб-бар */}
      {showTabBar && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-900/95 backdrop-blur-md border-t border-white/10 pb-[env(safe-area-inset-bottom)] z-30">
          <div className="grid grid-cols-4 h-16">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const isInput = tab.key === 'input';
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex flex-col items-center justify-center gap-1 transition ${
                    isActive ? 'text-neon-cyan' : 'text-slate-500'
                  }`}
                >
                  {isInput ? (
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-bold ${
                        isActive
                          ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      ➕
                    </span>
                  ) : (
                    <span className="text-xl leading-none">{tab.icon}</span>
                  )}
                  <span className="text-[10px]">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}