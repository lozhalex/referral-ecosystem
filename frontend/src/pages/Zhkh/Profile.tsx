import { useState, useEffect } from 'react';

const ACHIEVEMENTS = [
  { code: 'FIRST_METER', title: 'Первый счетчик', icon: '🥉', unlocked: true },
  { code: 'FIRST_READING', title: 'Первые показания', icon: '📝', unlocked: false },
  { code: 'RESPONSIBLE_3', title: 'Ответственный', icon: '🔥', unlocked: false },
  { code: 'REPORT_EXPORTED', title: 'Аналитик', icon: '📊', unlocked: false },
];

export default function Profile() {
  const [stats, setStats] = useState({ meters: 0, readings: 0 });

  useEffect(() => {
    // Заглушка для статистики, можно подключить к реальному API
    setStats({ meters: 3, readings: 12 });
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-6 border border-white/5 text-center">
        <div className="w-20 h-20 bg-neon-purple/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 border border-neon-purple/30">
          👤
        </div>
        <h2 className="text-xl font-bold text-white">Пользователь</h2>
        <p className="text-slate-400 text-sm">В системе с 2026 года</p>
      </div>

      <div className="glass rounded-xl p-6 border border-white/5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🏆 Мои достижения
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map(ach => (
            <div 
              key={ach.code} 
              className={`p-3 rounded-lg border flex flex-col items-center text-center transition ${
                ach.unlocked 
                  ? 'bg-neon-cyan/10 border-neon-cyan/30' 
                  : 'bg-white/5 border-white/10 opacity-50'
              }`}
            >
              <span className="text-2xl mb-1">{ach.unlocked ? ach.icon : '🔒'}</span>
              <span className="text-sm font-medium text-white">{ach.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-white/5">
        <h3 className="text-lg font-bold text-white mb-4">📊 Статистика модуля</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Счетчиков добавлено:</span>
            <span className="text-white font-mono">{stats.meters}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Показаний введено:</span>
            <span className="text-white font-mono">{stats.readings}</span>
          </div>
        </div>
      </div>
    </div>
  );
}