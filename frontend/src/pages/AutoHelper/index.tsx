import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Journal from './Journal';
import Cars from './Cars';
import Settings from './Settings';

type Tab = 'dashboard' | 'journal' | 'cars' | 'settings';

const AutoHelper: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard selectedCarId={selectedCarId} onCarChange={setSelectedCarId} onTabChange={setActiveTab} />;
      case 'journal':
        return <Journal selectedCarId={selectedCarId} onCarChange={setSelectedCarId} />;
      case 'cars':
        return <Cars onCarChange={setSelectedCarId} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard selectedCarId={selectedCarId} onCarChange={setSelectedCarId} onTabChange={setActiveTab} />;
    }
  };

  const navItems = [
    { id: 'dashboard', icon: '🏠', label: 'Главная' },
    { id: 'journal', icon: '📋', label: 'Журнал' },
    { id: 'cars', icon: '🚗', label: 'Авто' },
    { id: 'settings', icon: '⚙️', label: 'Настройки' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 pb-24">
      {/* Sticky Header */}
      <div className="bg-slate-900/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-cyan-400 transition-colors"
          >
            ← Назад
          </button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            🚗 Помощник автомобилиста
          </h1>
          <div className="w-16"></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 shadow-2xl shadow-black/50 z-30">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`relative py-3 px-2 text-xs font-medium transition-all duration-300 ${
                  isActive 
                    ? 'text-cyan-400 bg-white/5' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                )}
                <div className="text-xl mb-1">{item.icon}</div>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AutoHelper;