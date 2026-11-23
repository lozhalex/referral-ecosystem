import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

const RESOURCE_TYPES = [
  { value: 'HWS', label: 'Холодная вода (ХВС)', icon: '💧' },
  { value: 'GWS', label: 'Горячая вода (ГВС)', icon: '🔴' },
  { value: 'DRINKING_WATER', label: 'Питьевая вода', icon: '💧' },
  { value: 'ELECTRICITY', label: 'Электроэнергия', icon: '⚡' },
  { value: 'GAS', label: 'Газ', icon: '🔥' },
  { value: 'HEAT', label: 'Тепло', icon: '🔥' },
];

const TARIFF_TYPES = [
  { value: 'SINGLE', label: 'Однотарифный' },
  { value: 'TWO_TARIFF', label: 'Двухтарифный (день/ночь)' },
  { value: 'THREE_TARIFF', label: 'Трёхтарифный' },
];

interface Apartment {
  id: number;
  comment: string;
}

export default function AddMeter({ onBack }: { onBack: () => void }) {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | ''>('');
  const [showCreateApartment, setShowCreateApartment] = useState(false);
  const [newApartmentComment, setNewApartmentComment] = useState('');
  const [newApartmentBillingDay, setNewApartmentBillingDay] = useState('20');
  
  const [type, setType] = useState('');
  const [tariffType, setTariffType] = useState('SINGLE');
  const [comment, setComment] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [initialReading, setInitialReading] = useState('');
  const [nextVerificationDate, setNextVerificationDate] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadApartments();
  }, []);

  const loadApartments = async () => {
    try {
      const res = await apiClient.get('/api/apartments');
      if (res.data.success) {
        setApartments(res.data.apartments);
        if (res.data.apartments.length > 0) {
          setSelectedApartmentId(res.data.apartments[0].id);
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки квартир:', err);
    }
  };

  const handleCreateApartment = async () => {
    if (!newApartmentComment.trim()) {
      setError('Укажите название квартиры');
      return;
    }

    try {
      const res = await apiClient.post('/api/apartments', {
        comment: newApartmentComment.trim(),
        billingDay: Number(newApartmentBillingDay) || 20
      });

      if (res.data.success) {
        await loadApartments();
        setSelectedApartmentId(res.data.apartment.id);
        setShowCreateApartment(false);
        setNewApartmentComment('');
        setNewApartmentBillingDay('20');
        setError('');
      } else {
        setError(res.data.message || 'Ошибка создания квартиры');
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'NEED_SMART') {
        setError('Добавление второй квартиры доступно в тарифе СМАРТ');
      } else {
        setError('Ошибка сервера');
      }
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!selectedApartmentId) return setError('Выберите или создайте квартиру');
    if (!type) return setError('Выберите тип ресурса');
    if (!comment.trim()) return setError('Укажите комментарий (например, "Кухня, верхний")');
    if (!serialNumber.trim()) return setError('Укажите серийный номер');
    if (!initialReading.trim()) return setError('Укажите начальные показания');

    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/meters', {
        apartmentId: Number(selectedApartmentId),
        type,
        tariffType: type === 'ELECTRICITY' ? tariffType : 'SINGLE',
        comment: comment.trim(),
        serialNumber: serialNumber.trim(),
        initialReading: parseFloat(initialReading),
        nextVerificationDate: nextVerificationDate || undefined
      });

      if (res.data.success) {
        onBack();
      } else {
        setError(res.data.message || 'Ошибка сохранения');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка сервера');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← Назад</button>
        <h2 className="text-lg font-bold text-white">Новый счетчик</h2>
      </div>

      {/* Квартира */}
      <div>
        <label className="text-sm text-slate-400 block mb-1.5">Квартира *</label>
        {apartments.length === 0 ? (
          <div className="space-y-3">
            {!showCreateApartment ? (
              <button
                onClick={() => setShowCreateApartment(true)}
                className="w-full py-3 bg-neon-purple/20 border border-neon-purple/30 text-neon-purple rounded-lg hover:bg-neon-purple/30 transition"
              >
                ➕ Создать первую квартиру
              </button>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Название</label>
                  <input
                    type="text"
                    value={newApartmentComment}
                    onChange={(e) => setNewApartmentComment(e.target.value)}
                    placeholder="Например: Моя квартира"
                    className="w-full bg-dark-900 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-neon-cyan"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">День подачи показаний</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={newApartmentBillingDay}
                    onChange={(e) => setNewApartmentBillingDay(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-neon-cyan"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateApartment}
                    className="flex-1 py-2 bg-neon-purple text-white rounded hover:bg-purple-600 transition"
                  >
                    Создать
                  </button>
                  <button
                    onClick={() => setShowCreateApartment(false)}
                    className="flex-1 py-2 bg-white/10 text-slate-300 rounded hover:bg-white/20 transition"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <select
            value={selectedApartmentId}
            onChange={(e) => setSelectedApartmentId(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white outline-none focus:border-neon-cyan transition"
          >
            {apartments.map(apt => (
              <option key={apt.id} value={apt.id} className="bg-dark-900">{apt.comment}</option>
            ))}
          </select>
        )}
      </div>

      {/* Тип ресурса */}
      <div>
        <label className="text-sm text-slate-400 block mb-1.5">Тип ресурса *</label>
        <div className="grid grid-cols-2 gap-2">
          {RESOURCE_TYPES.map(rt => (
            <button
              key={rt.value}
              onClick={() => setType(rt.value)}
              className={`p-3 rounded-lg border text-left transition ${
                type === rt.value
                  ? 'bg-neon-purple/20 border-neon-purple text-white'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span className="text-lg mr-2">{rt.icon}</span>
              <span className="text-sm">{rt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Тариф (только для электричества) */}
      {type === 'ELECTRICITY' && (
        <div>
          <label className="text-sm text-slate-400 block mb-1.5">Тип тарифа</label>
          <select
            value={tariffType}
            onChange={(e) => setTariffType(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white outline-none focus:border-neon-cyan transition"
          >
            {TARIFF_TYPES.map(tt => (
              <option key={tt.value} value={tt.value} className="bg-dark-900">{tt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Комментарий */}
      <div>
        <label className="text-sm text-slate-400 block mb-1.5">
          Комментарий * <span className="text-slate-600">(до 100 символов)</span>
        </label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 100))}
          placeholder="Например: Кухня, верхний"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white outline-none focus:border-neon-cyan transition"
        />
        <div className="text-xs text-slate-600 mt-1 text-right">{comment.length}/100</div>
      </div>

      {/* Серийный номер */}
      <div>
        <label className="text-sm text-slate-400 block mb-1.5">Серийный номер *</label>
        <input
          type="text"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="С наклейки на корпусе"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white outline-none focus:border-neon-cyan transition"
        />
      </div>

      {/* Начальные показания */}
      <div>
        <label className="text-sm text-slate-400 block mb-1.5">Начальные показания *</label>
        <input
          type="number"
          step="0.001"
          value={initialReading}
          onChange={(e) => setInitialReading(e.target.value)}
          placeholder="0"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white outline-none focus:border-neon-cyan transition"
        />
      </div>

      {/* Дата поверки (опционально) */}
      <div>
        <label className="text-sm text-slate-400 block mb-1.5">Дата следующей поверки</label>
        <input
          type="date"
          value={nextVerificationDate}
          onChange={(e) => setNextVerificationDate(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white outline-none focus:border-neon-cyan transition"
        />
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Кнопка сохранения */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 bg-neon-purple text-white font-bold rounded-xl disabled:opacity-50 hover:bg-purple-600 transition mt-4"
      >
        {submitting ? 'Сохранение...' : 'Сохранить счетчик'}
      </button>
    </div>
  );
}