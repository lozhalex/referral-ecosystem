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
  lastReadingDate: string | null;
  lastReadingPeriod: string | null;
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

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const todayStr = () => new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function Input({ onAddMeter }: { onAddMeter: () => void }) {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [currentAptIndex, setCurrentAptIndex] = useState(0);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [newValue, setNewValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadApartments(); }, []);

  useEffect(() => {
    if (apartments.length > 0) {
      loadMeters(apartments[currentAptIndex].id);
    }
  }, [currentAptIndex, apartments]);

  const loadApartments = async () => {
    try {
      const res = await apiClient.get('/api/apartments');
      if (res.data.success) setApartments(res.data.apartments);
    } catch (err) {
      console.error('Ошибка загрузки квартир:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMeters = async (apartmentId: number) => {
    try {
      const res = await apiClient.get(`/api/meters?apartmentId=${apartmentId}`);
      if (res.data.success) setMeters(res.data.meters);
    } catch (err) {
      console.error('Ошибка загрузки счётчиков:', err);
    }
  };

  const handlePrevApartment = () => {
    if (currentAptIndex > 0) setCurrentAptIndex(prev => prev - 1);
  };
  const handleNextApartment = () => {
    if (currentAptIndex < apartments.length - 1) setCurrentAptIndex(prev => prev + 1);
  };

  const openMeterForm = (idx: number) => {
    setSelectedIdx(idx);
    setNewValue('');
    setInputError('');
  };

  const closeForm = () => {
    setSelectedIdx(null);
    setNewValue('');
    setInputError('');
  };

  const goToPrevMeter = () => {
    if (selectedIdx !== null && selectedIdx > 0) openMeterForm(selectedIdx - 1);
  };

  const goToNextMeter = () => {
    if (selectedIdx !== null && selectedIdx < meters.length - 1) openMeterForm(selectedIdx + 1);
  };

  const handleConfirm = async () => {
    if (selectedIdx === null) return;
    const meter = meters[selectedIdx];
    const val = parseFloat(newValue);

    if (isNaN(val)) { setInputError('Введите корректное число'); return; }
    if (val < meter.initialReading) {
      setInputError(`Новое показание не может быть меньше предыдущего (${meter.initialReading})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/api/meters/${meter.id}/readings`, {
        t1: val, usedOcr: false, mlConsent: false
      });
      if (res.data.success) {
        await loadMeters(apartments[currentAptIndex].id);
        setInputError('');
        setNewValue('');

        if (selectedIdx < meters.length - 1) {
          setSelectedIdx(selectedIdx + 1);
        } else {
          closeForm();
        }
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'READING_DECREASED') {
        setInputError(err.response.data.message);
      } else {
        setInputError('Ошибка сохранения');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedMeter = selectedIdx !== null ? meters[selectedIdx] : null;
  const consumption = newValue && selectedMeter
    ? (parseFloat(newValue) - selectedMeter.initialReading).toFixed(1)
    : null;

  if (loading) return <div className="text-center text-slate-400 py-10">Загрузка...</div>;

  if (apartments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-32 h-40 mx-auto mb-4 flex items-center justify-center">
          <img src="/bumi/pose-2.png" alt="Буми" className="h-full w-auto object-contain" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Пока нет квартир</h3>
        <p className="text-slate-400 mb-6">Добавьте первую квартиру, чтобы начать учёт</p>
        <button onClick={onAddMeter} className="px-6 py-3 bg-neon-purple text-white rounded-xl font-bold hover:bg-purple-600 transition">
          Добавить квартиру и счётчик
        </button>
      </div>
    );
  }

  const currentApartment = apartments[currentAptIndex];
  const needsSubmission = meters.filter(m => !m.isSubmittedCurrent);

  // ===== ФОРМА ВВОДА =====
  if (selectedMeter && selectedIdx !== null) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className="flex items-center justify-between mb-6">
          <button onClick={closeForm} className="text-slate-400 hover:text-white">← Назад</button>
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrevMeter}
              disabled={selectedIdx === 0}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition"
            >‹</button>
            <span className="text-sm text-slate-400">Счетчик {selectedIdx + 1} из {meters.length}</span>
            <button
              onClick={goToNextMeter}
              disabled={selectedIdx === meters.length - 1}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition"
            >›</button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-6 px-4">
          <div className="text-center">
            <div className="text-5xl mb-3">{getResourceIcon(selectedMeter.type)}</div>
            <h2 className="text-2xl font-bold text-white">{selectedMeter.comment}</h2>
            <div className="text-sm text-slate-400 mt-1">№ {selectedMeter.serialNumber}</div>
          </div>

          <div className="w-full max-w-xs space-y-5">
            <div>
              <label className="text-sm text-slate-400 block mb-1">
                Предыдущее показание <span className="text-slate-500">· {selectedMeter.lastReadingDate ? formatDate(selectedMeter.lastReadingDate) : 'начальное'}</span>
              </label>
              <div className="text-3xl font-mono text-slate-300">{selectedMeter.initialReading}</div>
            </div>

            <div>
              <label className="text-sm text-slate-400 block mb-1">
                Новое показание <span className="text-slate-500">· {todayStr()}</span>
              </label>
              <input
                type="number"
                value={newValue}
                onChange={(e) => { setNewValue(e.target.value); setInputError(''); }}
                className={`w-full bg-dark-900 border ${inputError ? 'border-red-500' : 'border-white/20 focus:border-neon-cyan'} rounded-xl px-4 py-3 text-2xl font-mono text-white outline-none transition`}
                placeholder="00000"
                autoFocus
              />
              {inputError && <p className="text-red-400 text-sm mt-2">{inputError}</p>}
            </div>

            {consumption !== null && parseFloat(consumption) >= 0 && (
              <div className="bg-neon-cyan/10 border border-neon-cyan/30 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-400 mb-1">Расход за период</div>
                <div className="text-2xl font-bold text-neon-cyan">{consumption}</div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 mt-auto mb-4 px-4">
          <button
            onClick={handleConfirm}
            disabled={!newValue || submitting}
            className="w-full py-4 bg-neon-purple text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition"
          >
            {submitting ? 'Сохранение...' : 'Подтвердить'}
          </button>
          <button onClick={closeForm} className="w-full py-3 bg-white/10 text-slate-300 rounded-xl hover:bg-white/20 transition">
            Отмена
          </button>
        </div>
      </div>
    );
  }

  // ===== СПИСОК СЧЕТЧИКОВ =====
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between glass rounded-xl p-4 border border-white/5">
        <button
          onClick={handlePrevApartment}
          disabled={currentAptIndex === 0}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition"
        >‹</button>
        <div className="text-center flex-1">
          <div className="font-bold text-white text-lg">{currentApartment.comment}</div>
          <div className="text-sm text-slate-400">Дата показаний: до {currentApartment.billingDay}-го числа</div>
        </div>
        <button
          onClick={handleNextApartment}
          disabled={currentAptIndex === apartments.length - 1}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition"
        >›</button>
      </div>

      {needsSubmission.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-yellow-400 font-medium flex items-center gap-2">
            ⚠️ Пора подать показания ({needsSubmission.length} шт.)
          </p>
        </div>
      )}

      {meters.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 mb-4">В этой квартире пока нет счётчиков</p>
          <button onClick={onAddMeter} className="px-6 py-3 bg-neon-purple text-white rounded-xl font-bold hover:bg-purple-600 transition">
            Добавить первый счётчик
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meters.map((meter, idx) => (
            <div
              key={meter.id}
              onClick={() => openMeterForm(idx)}
              className="glass rounded-xl p-4 border border-white/5 relative overflow-hidden cursor-pointer hover:border-neon-cyan/30 transition"
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
                  meter.isSubmittedCurrent ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {meter.isSubmittedCurrent ? '✅ Передано' : '⏳ Ожидает'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onAddMeter} className="w-full mt-6 py-3 border border-dashed border-white/20 text-slate-400 rounded-xl hover:bg-white/5 hover:text-white transition flex items-center justify-center gap-2">
        ➕ Добавить новый счётчик
      </button>
    </div>
  );
}