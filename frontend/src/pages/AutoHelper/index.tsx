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
        return <Dashboard selectedCarId={selectedCarId} onCarChange={setSelectedCarId} />;
      case 'journal':
        return <Journal selectedCarId={selectedCarId} onCarChange={setSelectedCarId} />;
      case 'cars':
        return <Cars onCarChange={setSelectedCarId} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard selectedCarId={selectedCarId} onCarChange={setSelectedCarId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition"
          >
            ← Назад
          </button>
          <h1 className="text-lg font-bold text-gray-800">🚗 Помощник автомобилиста</h1>
          <div className="w-16"></div> {/* Spacer для центрирования */}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-2 text-xs font-medium transition ${
              activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="text-xl mb-1">🏠</div>
            Главная
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`py-3 px-2 text-xs font-medium transition ${
              activeTab === 'journal' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="text-xl mb-1">📋</div>
            Журнал
          </button>
          <button
            onClick={() => setActiveTab('cars')}
            className={`py-3 px-2 text-xs font-medium transition ${
              activeTab === 'cars' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="text-xl mb-1">🚗</div>
            Авто
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-2 text-xs font-medium transition ${
              activeTab === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="text-xl mb-1">⚙️</div>
            Настройки
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoHelper;