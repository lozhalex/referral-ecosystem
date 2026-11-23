import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface Meter {
  id: number;
  type: string;
  comment: string;
  initialReading: number;
  isSubmittedCurrent: boolean;
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'HWS': return '💧';
    case 'GWS': return '🔴';
    case 'DRINKING_WATER': return '💧';
    case 'ELECTRICITY': return '⚡';
    case 'GAS': return '🔥';
    case 'HEAT': return '🔥';
    default: return '📏';
  }
};

export default function Dashboard({ onNavigateToInput }: { onNavigateToInput: () => void }) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeters();
  }, []);

  const loadMeters = async () => {
    try {
      const res = await apiClient.get('/api/meters');
      if (res.data.success) {
        setMeters(res.data.meters);
      }
    } catch (err) {
      console.error('Ошибка загрузки счетчиков:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-400 py-10">Загрузка...</div>;
  }

  if (meters.length === 0) {
    return (
      <div className="text-center py-12">
        <img src="/bumi/pose-2.png" alt="Буми" className="w-24 h-24 mx-auto mb-4 opacity-80" />
        <h3 className="text-xl font-bold text-white mb-2">Пока нет счетчиков</h3>
        <p className="text-slate-400 mb-6">Добавьте первый счетчик, чтобы начать учет</p>
        <button 
          onClick={onNavigateToInput}
          className="px-6 py-3 bg-neon-purple text-white rounded-xl font-bold hover:bg-purple-600 transition"
        >
          Добавить первый счетчик
        </button>
      </div>
    );
  }

  const needsSubmission = meters.filter(m => !m.isSubmittedCurrent);

  return (
    <div className="space-y-4">
      {needsSubmission.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
          <p className="text-yellow-400 font-medium flex items-center gap-2">
            ⚠️ Пора подать показания ({needsSubmission.length} шт.)
          </p>
        </div>
      )}

      {meters.map(meter => (
        <div key={meter.id} className="glass rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getResourceIcon(meter.type)}</span>
              <div>
                <div className="font-bold text-white">{meter.comment}</div>
                <div className="text-sm text-slate-400">Пред.: {meter.initialReading}</div>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${meter.isSubmittedCurrent ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {meter.isSubmittedCurrent ? '✅ Передано' : '⏳ Ожидает'}
            </span>
          </div>
          
          {!meter.isSubmittedCurrent && (
            <button 
              onClick={onNavigateToInput}
              className="w-full mt-2 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition text-sm"
            >
              Ввести показания
            </button>
          )}
        </div>
      ))}

      <button 
        onClick={onNavigateToInput}
        className="w-full mt-6 py-3 border border-dashed border-white/20 text-slate-400 rounded-xl hover:bg-white/5 hover:text-white transition flex items-center justify-center gap-2"
      >
        ➕ Добавить новый счетчик
      </button>
    </div>
  );
}