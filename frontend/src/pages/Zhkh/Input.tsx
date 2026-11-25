import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface Meter {
  id: number;
  type: string;
  comment: string;
  initialReading: number;
  isSubmittedCurrent: boolean;
}

export default function Input({ onBack }: { onBack: () => void }) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMeters();
  }, []);

  const loadMeters = async () => {
    try {
      const res = await apiClient.get('/api/meters');
      if (res.data.success) {
        setMeters(res.data.meters);
        if (res.data.meters.length === 0) {
          onBack();
        }
      }
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentMeter = meters[currentIndex];
  
  const consumption = newValue && currentMeter 
    ? (parseFloat(newValue) - currentMeter.initialReading).toFixed(1)
    : null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setNewValue('');
      setError('');
    }
  };

  const handleNext = () => {
    if (currentIndex < meters.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setNewValue('');
      setError('');
    }
  };

  const handleConfirm = async () => {
    const val = parseFloat(newValue);
    if (isNaN(val)) {
      setError('Введите корректное число');
      return;
    }
    if (val < currentMeter.initialReading) {
      setError(`Новое показание не может быть меньше предыдущего (${currentMeter.initialReading})`);
      return;
    }
    try {
      const res = await apiClient.post(`/api/meters/${currentMeter.id}/readings`, {
        t1: val,
        usedOcr: false,
        mlConsent: false
      });
      if (res.data.success) {
        setNewValue('');
        setError('');
        if (currentIndex < meters.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          onBack();
        }
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'READING_DECREASED') {
        setError(err.response.data.message);
      } else {
        setError('Ошибка сохранения');
      }
    }
  };

  if (loading || !currentMeter) {
    return <div className="text-center text-slate-400 py-10">Загрузка...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-slate-400 hover:text-white">← Назад</button>
        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition"
          >
            ‹
          </button>
          <span className="text-sm text-slate-500">Счетчик {currentIndex + 1} из {meters.length}</span>
          <button 
            onClick={handleNext}
            disabled={currentIndex === meters.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-2">
            {currentMeter.type === 'HWS' ? '💧' : currentMeter.type === 'GWS' ? '🔴' : '⚡'}
          </div>
          <h2 className="text-2xl font-bold text-white">{currentMeter.comment}</h2>
        </div>

        <div className="w-full max-w-xs space-y-6">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Предыдущее показание</label>
            <div className="text-3xl font-mono text-slate-500">{currentMeter.initialReading}</div>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Новое показание</label>
            <input
              type="number"
              value={newValue}
              onChange={(e) => {
                setNewValue(e.target.value);
                setError('');
              }}
              className={`w-full bg-dark-900 border ${error ? 'border-red-500' : 'border-white/20 focus:border-neon-cyan'} rounded-xl px-4 py-3 text-2xl font-mono text-white outline-none transition`}
              placeholder="00000"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
          
          {consumption !== null && parseFloat(consumption) >= 0 && (
            <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-400 mb-1">Расход за период</div>
              <div className="text-2xl font-bold text-neon-cyan">{consumption}</div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 mt-auto mb-4">
        <button
          onClick={handleConfirm}
          disabled={!newValue}
          className="w-full py-4 bg-neon-purple text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition"
        >
          Подтвердить
        </button>
        <button
          onClick={onBack}
          className="w-full py-3 bg-white/10 text-slate-300 rounded-xl hover:bg-white/20 transition"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}