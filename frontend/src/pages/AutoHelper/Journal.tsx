import React, { useState, useEffect } from 'react';
import { getJournal, createRecord, getCars, submitMileageCheck } from '../../api/auto';
import { CATEGORIES, getCategoryName } from './categories';

interface JournalProps {
  selectedCarId: number | null;
  onCarChange: (carId: number | null) => void;
}

interface Record {
  id: number;
  date: string;
  mileage: number;
  category: string;
  work: string;
  cost: number;
  comment: string;
}

const Journal: React.FC<JournalProps> = ({ selectedCarId, onCarChange }) => {
  const [cars, setCars] = useState<any[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [mileageInput, setMileageInput] = useState('');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    category: 'to',
    work: '',
    cost: '',
    comment: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedCarId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [carsRes, journalRes] = await Promise.all([
        getCars(),
        selectedCarId ? getJournal(selectedCarId) : { records: [] }
      ]);
      setCars(carsRes.cars || []);
      setRecords(journalRes.records || []);
      if (!selectedCarId && carsRes.cars?.length > 0) {
        onCarChange(carsRes.cars[0].id);
      }
    } catch (err) {
      console.error('Ошибка загрузки журнала:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    const car = cars.find(c => c.id === selectedCarId);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      mileage: String(car?.mileage || ''),
      category: 'to',
      work: '',
      cost: '',
      comment: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenMileageModal = () => {
    const car = cars.find(c => c.id === selectedCarId);
    setMileageInput(String(car?.mileage || ''));
    setShowMileageModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId) return alert('Выберите автомобиль');
    try {
      await createRecord({
        carId: selectedCarId,
        ...formData,
        mileage: Number(formData.mileage),
        cost: Number(formData.cost) || 0
      });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('Ошибка сохранения записи');
    }
  };

  const handleMileageSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId || !mileageInput) return;
    try {
      // Обновляем mileageCheck и карточку авто
      await submitMileageCheck(selectedCarId, Number(mileageInput));
      
      // Создаём запись в журнале
      await createRecord({
        carId: selectedCarId,
        category: 'mileage',
        date: new Date().toISOString().split('T')[0],
        mileage: Number(mileageInput),
        work: `Ввод пробега: ${Number(mileageInput).toLocaleString('ru-RU')} км`,
        cost: 0,
        comment: ''
      });
      
      setShowMileageModal(false);
      setMileageInput('');
      loadData();
    } catch (err: any) {
      if (err.response?.data?.code === 'MILEAGE_DECREASED') {
        alert(`Пробег уменьшился. Последний зафиксированный: ${err.response.data.lastMileage} км`);
      } else {
        alert(err.response?.data?.message || 'Ошибка сохранения пробега');
      }
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500";

  if (loading) return <div className="text-center py-10 text-cyan-400 animate-pulse">Загрузка...</div>;

  if (cars.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <p className="text-gray-400 mb-4">Сначала добавьте автомобиль во вкладке "Авто"</p>
        <button onClick={() => onCarChange(null)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
          Перейти к авто
        </button>
      </div>
    );
  }

  const lastMileageRecord = records.find(rec => rec.category === 'mileage');
  const otherRecords = records.filter(rec => rec.category !== 'mileage');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-100">Журнал обслуживания</h2>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
        >
          + Добавить запись
        </button>
      </div>

      {/* 🆕 Кнопка быстрого ввода пробега */}
      <button
        onClick={handleOpenMileageModal}
        className="w-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-xl p-4 text-left hover:shadow-lg hover:shadow-purple-500/10 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-300 flex items-center gap-2">
              📍 Ввести пробег
            </h3>
            <p className="text-xs text-purple-400/80 mt-1">
              {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg text-sm font-medium">
            Ввести
          </span>
        </div>
      </button>

      {records.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">📓</div>
          <p className="text-gray-100 font-medium mb-2">Записей пока нет</p>
          <p className="text-sm text-gray-400 mb-4">
            💡 <strong>Совет:</strong> Вы можете добавлять записи задним числом. Просто укажите прошлую дату и пробег, чтобы перенести историю обслуживания из вашего блокнота.
          </p>
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
          >
            Добавить первую запись
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lastMileageRecord && (
            <>
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mt-2">
                📍 Последний ввод пробега
              </h3>
              <div className="bg-cyan-500/10 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <div className="font-bold text-gray-100">Ввод пробега</div>
                      <div className="text-sm text-gray-400">
                        {new Date(lastMileageRecord.date).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-cyan-400">
                      {lastMileageRecord.mileage.toLocaleString('ru-RU')} км
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {otherRecords.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mt-4">
                🔧 Обслуживание
              </h3>
              {otherRecords.map(rec => (
                <div key={rec.id} className="bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-all duration-300">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-100">{getCategoryName(rec.category)}</span>
                    <span className="font-semibold text-cyan-400">{rec.cost} ₽</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-1">
                    {new Date(rec.date).toLocaleDateString('ru-RU')} • {rec.mileage} км
                  </div>
                  {rec.work && <div className="text-sm text-gray-300">{rec.work}</div>}
                  {rec.comment && <div className="text-xs text-gray-500 mt-1 italic">"{rec.comment}"</div>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Модалка ввода пробега */}
      {showMileageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-gray-100">Введите пробег</h3>
              <button onClick={() => setShowMileageModal(false)} className="text-gray-400 hover:text-white text-xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleMileageSave} className="p-4 space-y-4">
              <p className="text-sm text-gray-400">
                Текущий пробег: <strong className="text-cyan-400">{cars.find(c => c.id === selectedCarId)?.mileage} км</strong>
              </p>
              <input
                type="number"
                required
                value={mileageInput}
                onChange={(e) => setMileageInput(e.target.value)}
                placeholder="Введите текущий пробег"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
              >
                Сохранить
              </button>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="font-bold text-gray-100">Новая запись</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Дата обслуживания</label>
                  <input required type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Пробег (км)</label>
                  <input required type="number" className={inputClass} value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} placeholder="Напр. 195000" />
                  <p className="text-[10px] text-gray-500 mt-1">Укажите пробег из блокнота на эту дату</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Категория</label>
                <select className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key} className="bg-slate-800">{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Выполненные работы</label>
                <textarea required rows={2} className={inputClass} value={formData.work} onChange={e => setFormData({...formData, work: e.target.value})} placeholder="Например: Замена масла и фильтра" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Стоимость (₽)</label>
                <input type="number" className={inputClass} value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Комментарий (необязательно)</label>
                <input className={inputClass} value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})} placeholder="Например: Масло Shell 5W-30" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all mt-2">
                Сохранить запись
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;