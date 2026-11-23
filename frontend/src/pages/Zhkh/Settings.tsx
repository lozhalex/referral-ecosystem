import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface Apartment {
  id: number;
  comment: string;
  billingDay: number;
}

interface Meter {
  id: number;
  apartmentId: number;
  type: string;
  tariffType: string;
  comment: string;
  serialNumber: string;
  initialReading: number;
  nextVerificationDate?: string;
  isActive: boolean;
}

const RESOURCE_TYPES = [
  { value: 'HWS', label: 'Холодная вода', icon: '💧' },
  { value: 'GWS', label: 'Горячая вода', icon: '🔴' },
  { value: 'DRINKING_WATER', label: 'Питьевая вода', icon: '💧' },
  { value: 'ELECTRICITY', label: 'Электроэнергия', icon: '⚡' },
  { value: 'GAS', label: 'Газ', icon: '🔥' },
  { value: 'HEAT', label: 'Тепло', icon: '🔥' },
];

const TARIFF_TYPES = [
  { value: 'SINGLE', label: 'Однотарифный' },
  { value: 'TWO_TARIFF', label: 'Двухтарифный' },
  { value: 'THREE_TARIFF', label: 'Трёхтарифный' },
];

const RESOURCE_NAMES: Record<string, string> = {
  HWS: 'Холодная вода', GWS: 'Горячая вода', DRINKING_WATER: 'Питьевая вода',
  ELECTRICITY: 'Электроэнергия', GAS: 'Газ', HEAT: 'Тепло',
};

export default function Settings({ onBack, onAddMeter }: { onBack: () => void; onAddMeter: () => void }) {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Редактирование квартиры
  const [editingAptId, setEditingAptId] = useState<number | null>(null);
  const [editAptComment, setEditAptComment] = useState('');
  const [editAptBillingDay, setEditAptBillingDay] = useState('20');

  // 🆕 Редактирование счетчика
  const [editingMeterId, setEditingMeterId] = useState<number | null>(null);
  const [editMeterType, setEditMeterType] = useState('');
  const [editMeterComment, setEditMeterComment] = useState('');
  const [editMeterSerial, setEditMeterSerial] = useState('');
  const [editMeterTariff, setEditMeterTariff] = useState('SINGLE');
  const [editMeterVerification, setEditMeterVerification] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [aptRes, meterRes] = await Promise.all([
        apiClient.get('/api/apartments'),
        apiClient.get('/api/meters')
      ]);
      if (aptRes.data.success) setApartments(aptRes.data.apartments);
      if (meterRes.data.success) setMeters(meterRes.data.meters);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditApartment = (apt: Apartment) => {
    setEditingAptId(apt.id);
    setEditAptComment(apt.comment);
    setEditAptBillingDay(String(apt.billingDay));
  };

  const saveApartment = async () => {
    if (!editingAptId) return;
    try {
      const res = await apiClient.put(`/api/apartments/${editingAptId}`, {
        comment: editAptComment,
        billingDay: Number(editAptBillingDay) || 20
      });
      if (res.data.success) {
        setSuccess('Квартира обновлена');
        setEditingAptId(null);
        setTimeout(() => setSuccess(''), 2000);
        await loadData();
      }
    } catch (err) {
      setError('Ошибка сохранения');
      setTimeout(() => setError(''), 2000);
    }
  };

  // 🆕 Логика редактирования счетчика
  const startEditMeter = (meter: Meter) => {
    setEditingMeterId(meter.id);
    setEditMeterType(meter.type);
    setEditMeterComment(meter.comment);
    setEditMeterSerial(meter.serialNumber);
    setEditMeterTariff(meter.tariffType);
    setEditMeterVerification(meter.nextVerificationDate ? meter.nextVerificationDate.split('T')[0] : '');
  };

  const saveMeter = async () => {
    if (!editingMeterId) return;
    if (!editMeterComment.trim()) { setError('Укажите комментарий'); return; }
    if (!editMeterSerial.trim()) { setError('Укажите серийный номер'); return; }

    try {
      const res = await apiClient.put(`/api/meters/${editingMeterId}`, {
        type: editMeterType,
        comment: editMeterComment.trim(),
        serialNumber: editMeterSerial.trim(),
        tariffType: editMeterType === 'ELECTRICITY' ? editMeterTariff : 'SINGLE',
        nextVerificationDate: editMeterVerification || undefined
      });
      if (res.data.success) {
        setSuccess('Счетчик обновлен');
        setEditingMeterId(null);
        setTimeout(() => setSuccess(''), 2000);
        await loadData();
      }
    } catch (err) {
      setError('Ошибка сохранения');
      setTimeout(() => setError(''), 2000);
    }
  };

  const deleteMeter = async (meterId: number) => {
    if (!confirm('Архивировать счетчик? Данные сохранятся в истории.')) return;
    try {
      const res = await apiClient.post(`/api/meters/${meterId}/delete`);
      if (res.data.success) {
        setSuccess('Счетчик архивирован');
        setTimeout(() => setSuccess(''), 2000);
        await loadData();
      }
    } catch (err) {
      setError('Ошибка удаления');
      setTimeout(() => setError(''), 2000);
    }
  };

  if (loading) return <div className="text-center text-slate-400 py-10">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="text-slate-400 hover:text-white text-sm">← Назад</button>
        <h2 className="text-lg font-bold text-white">Настройки</h2>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">{success}</div>}

      {/* Квартиры */}
      <section>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Квартиры</h3>
        {apartments.length === 0 ? (
          <div className="text-slate-500 text-sm py-4 text-center">Квартиры не добавлены</div>
        ) : (
          <div className="space-y-2">
            {apartments.map(apt => (
              <div key={apt.id} className="glass rounded-xl p-4 border border-white/5">
                {editingAptId === apt.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editAptComment} onChange={(e) => setEditAptComment(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan" placeholder="Название" />
                    <div className="flex gap-2">
                      <input type="number" min="1" max="28" value={editAptBillingDay} onChange={(e) => setEditAptBillingDay(e.target.value)} className="flex-1 bg-dark-900 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan" placeholder="День подачи" />
                      <button onClick={saveApartment} className="px-3 py-2 bg-neon-purple text-white rounded text-sm">✓</button>
                      <button onClick={() => setEditingAptId(null)} className="px-3 py-2 bg-white/10 text-slate-300 rounded text-sm">✕</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{apt.comment}</div>
                      <div className="text-xs text-slate-500">Подача до {apt.billingDay}-го числа</div>
                    </div>
                    <button onClick={() => startEditApartment(apt)} className="text-slate-400 hover:text-white text-sm">✏️</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Счетчики */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Счетчики</h3>
          <button onClick={onAddMeter} className="text-xs text-neon-cyan hover:underline">+ Добавить</button>
        </div>
        {meters.length === 0 ? (
          <div className="text-slate-500 text-sm py-4 text-center">Счетчики не добавлены</div>
        ) : (
          <div className="space-y-2">
            {meters.map(meter => (
              <div key={meter.id} className="glass rounded-xl p-4 border border-white/5">
                {editingMeterId === meter.id ? (
                  // 🆕 Форма редактирования счетчика
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Тип ресурса</label>
                      <select value={editMeterType} onChange={(e) => setEditMeterType(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan">
                        {RESOURCE_TYPES.map(rt => <option key={rt.value} value={rt.value} className="bg-dark-900">{rt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Комментарий</label>
                      <input type="text" value={editMeterComment} onChange={(e) => setEditMeterComment(e.target.value.slice(0, 100))} className="w-full bg-dark-900 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Серийный номер</label>
                      <input type="text" value={editMeterSerial} onChange={(e) => setEditMeterSerial(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan" />
                    </div>
                    {editMeterType === 'ELECTRICITY' && (
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Тип тарифа</label>
                        <select value={editMeterTariff} onChange={(e) => setEditMeterTariff(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan">
                          {TARIFF_TYPES.map(tt => <option key={tt.value} value={tt.value} className="bg-dark-900">{tt.label}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Дата поверки</label>
                      <input type="date" value={editMeterVerification} onChange={(e) => setEditMeterVerification(e.target.value)} className="w-full bg-dark-900 border border-white/10 rounded px-3 py-2 text-white text-sm outline-none focus:border-neon-cyan" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={saveMeter} className="flex-1 py-2 bg-neon-purple text-white rounded text-sm font-medium">Сохранить</button>
                      <button onClick={() => setEditingMeterId(null)} className="flex-1 py-2 bg-white/10 text-slate-300 rounded text-sm">Отмена</button>
                    </div>
                  </div>
                ) : (
                  // Режим просмотра
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{RESOURCE_TYPES.find(r => r.value === meter.type)?.icon || '📏'}</span>
                        <div>
                          <div className="font-medium text-white text-sm">{meter.comment}</div>
                          <div className="text-xs text-slate-500">
                            {RESOURCE_NAMES[meter.type]}{meter.tariffType !== 'SINGLE' ? ` · ${meter.tariffType}` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => startEditMeter(meter)} className="text-slate-400 hover:text-neon-cyan text-sm" title="Редактировать">✏️</button>
                        <button onClick={() => deleteMeter(meter.id)} className="text-red-400/60 hover:text-red-400 text-sm" title="Архивировать">🗑</button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">№ {meter.serialNumber} · старт: {meter.initialReading}</div>
                    {meter.nextVerificationDate && (
                      <div className="text-xs text-slate-500 mt-1">Поверка: {new Date(meter.nextVerificationDate).toLocaleDateString('ru-RU')}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}