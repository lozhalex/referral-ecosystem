import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface Apartment {
  id: number;
  comment: string;
  billingDay: number;
}

interface Meter {
  id: number;
  type: string;
  comment: string;
  serialNumber: string;
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

export default function Input({ onAddMeter }: { onAddMeter: () => void }) {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [currentAptIndex, setCurrentAptIndex] = useState(0);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApartments();
  }, []);

  useEffect(() => {
    if (apartments.length > 0) {
      loadMeters(apartments[currentAptIndex].id);
    }
  }, [currentAptIndex, apartments]);

  const loadApartments = async () => {
    try {
      const res = await apiClient.get('/api/apartments');
      if (res.data.success) {
        setApartments(res.data.apartments);
      }
    } catch (err) {
      console.error('Ошибка загрузки квартир:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMeters = async (apartmentId: number) => {
    try {
      const res = await apiClient.get(`/api/meters?apartmentId=${apartmentId}`);
      if (res.data.success) {
        setMeters(res.data.meters);
      }
    } catch (err) {
      console.error('Ошибка загрузки счётчиков:', err);
    }
  };

  const handlePrevApartment = () => {
    if (currentAptIndex > 0) {
      setCurrentAptIndex(prev => prev - 1);
    }
  };

  const handleNextApartment = () => {
    if (currentAptIndex < apartments.length - 1) {
      setCurrentAptIndex(prev => prev + 1);
    }
  };

  if (loading) {
    return <div className="text-center text-slate-400 py-10">Загрузка...</div>;
  }

  if (apartments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-32 h-40 mx-auto mb-4 flex items-center justify-center">
          <img src="/bumi/pose-2.png" alt="Буми" className="h-full w-auto object-contain" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Пока нет квартир</h3>
        <p className="text-slate-400 mb-6">Добавьте первую квартиру, чтобы начать учёт</p>
        <button
          onClick={onAddMeter}
          className="px-6 py-3 bg-neon-purple text-white rounded-xl font-bold hover:bg-purple-600 transition"
        >
          Добавить квартиру и счётчик
        </button>
      </div>
    );
  }

  const currentApartment = apartments[currentAptIndex];
  const needsSubmission = meters.filter(m => !m.isSubmittedCurrent);

  return (
    <div className="space-y-4">
      {/* Название квартиры и дата показаний со стрелками */}
      <div className="flex items-center justify-between glass rounded-xl p-4 border border-white/5">
        <button
          onClick={handlePrevApartment}
          disabled={currentAptIndex === 0}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition"
        >
          ‹
        </button>
        <div className="text-center flex-1">
          <div className="font-bold text-white text-lg">{currentApartment.comment}</div>
          <div className="text-sm text-slate-400">Дата показаний: до {currentApartment.billingDay}-го числа</div>
        </div>
        <button
          onClick={handleNextApartment}
          disabled={currentAptIndex === apartments.length - 1}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition"
        >
          ›
        </button>
      </div>

      {/* Предупреждение о необходимости подачи */}
      {needsSubmission.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-400 font-medium flex items-center gap-2">
            ⚠️ Пора подать показания ({needsSubmission.length} шт.)
          </p>
        </div>
      )}

      {/* Список счётчиков */}
      {meters.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">В этой квартире пока нет счётчиков</p>
          <button
            onClick={onAddMeter}
            className="px-6 py-3 bg-neon-purple text-white rounded-xl font-bold hover:bg-purple-600 transition"
          >
            Добавить первый счётчик
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meters.map(meter => (
            <div
              key={meter.id}
              className="glass rounded-xl p-4 border border-white/5 relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getResourceIcon(meter.type)}</span>
                  <div>
                    <div className="font-bold text-white">{meter.comment}</div>
                    <div className="text-sm text-slate-400">Пред.: {meter.initialReading}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  meter.isSubmittedCurrent 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {meter.isSubmittedCurrent ? '✅ Передано' : '⏳ Ожидает'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Кнопка добавить счётчик */}
      <button
        onClick={onAddMeter}
        className="w-full mt-6 py-3 border border-dashed border-white/20 text-slate-400 rounded-xl hover:bg-white/5 hover:text-white transition flex items-center justify-center gap-2"
      >
        ➕ Добавить новый счётчик
      </button>
    </div>
  );
}