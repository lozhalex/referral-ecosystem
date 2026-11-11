import React, { useState, useEffect } from 'react';
import { getJournalRecords, createJournalRecord, deleteJournalRecord, getCars } from '../../api/auto';
import { getPredictableCategories } from './categories';

interface JournalProps {
  selectedCarId: number | null;
  onCarChange: (carId: number | null) => void;
}

interface Car {
  id: number;
  marka: string;
  model: string;
  gosnomer: string;
}

interface Record {
  id: number;
  date: string;
  mileage: number;
  category: string;
  description: string;
  cost: number;
  carId: number;
}

const Journal: React.FC<JournalProps> = ({ selectedCarId, onCarChange }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    category: 'oil',
    description: '',
    cost: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedCarId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [carsData, recordsData] = await Promise.all([
        getCars(),
        getJournalRecords(selectedCarId || undefined)
      ]);
      setCars(carsData.cars || []);
      setRecords(recordsData.records || []);
      
      if (!selectedCarId && carsData.cars?.length > 0) {
        onCarChange(carsData.cars[0].id);
      }
    } catch (err) {
      console.error('Ошибка загрузки журнала:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId) return;
    
    try {
      await createJournalRecord({
        ...formData,
        carId: selectedCarId,
        mileage: Number(formData.mileage),
        cost: Number(formData.cost) || 0
      });
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        mileage: '',
        category: 'oil',
        description: '',
        cost: ''
      });
      loadData();
    } catch (err) {
      alert('Ошибка сохранения записи');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Удалить эту запись?')) {
      try {
        await deleteJournalRecord(id);
        loadData();
      } catch (err) {
        alert('Ошибка удаления');
      }
    }
  };

  const categories = getPredictableCategories();
  const inputClass = "w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500";

  if (loading) return <div className="text-center py-10 text-cyan-400 animate-pulse">Загрузка...</div>;

  if (cars.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <p className="text-gray-400 mb-4">Сначала добавьте автомобиль в разделе "Авто".</p>
        <button onClick={() => onCarChange(null)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
          Перейти к авто
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <select
          value={selectedCarId || ''}
          onChange={(e) => onCarChange(Number(e.target.value))}
          className="px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
        >
          {cars.map(car => (
            <option key={car.id} value={car.id} className="bg-slate-800">
              {car.marka} {car.model} {car.gosnomer}
            </option>
          ))}
        </select>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
        >
          + Запись
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">📓</div>
          <p className="text-gray-100 font-medium mb-2">Записей пока нет</p>
          <p className="text-sm text-gray-400 mb-4">
            💡 <strong>Совет:</strong> Вы можете добавлять записи задним числом. Просто укажите прошлую дату и пробег, чтобы перенести историю обслуживания из вашего блокнота.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
          >
            Добавить первую запись
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => {
            const catName = categories.find(c => c.key === rec.category)?.name || rec.category;
            return (
              <div key={rec.id} className="bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-100">{catName}</div>
                    <div className="text-sm text-gray-400">{rec.date} • {rec.mileage} км</div>
                    {rec.description && <div className="text-sm text-gray-300 mt-1">{rec.description}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-cyan-400">{rec.cost > 0 ? `${rec.cost} ₽` : '—'}</div>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="text-xs text-red-400 hover:text-red-300 mt-2 transition-colors"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
                  <label className="text-xs text-gray-400 mb-1 block">Дата</label>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Пробег (км)</label>
                  <input
                    type="number"
                    required
                    className={inputClass}
                    value={formData.mileage}
                    onChange={e => setFormData({...formData, mileage: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Категория</label>
                <select
                  className={inputClass}
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {categories.map(c => (
                    <option key={c.key} value={c.key} className="bg-slate-800">{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Описание работ</label>
                <input
                  className={inputClass}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Например: Замена масла и фильтра"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Стоимость (₽)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={formData.cost}
                  onChange={e => setFormData({...formData, cost: e.target.value})}
                  placeholder="0"
                />
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