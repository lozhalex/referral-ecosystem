import React, { useState, useEffect } from 'react';
import { getJournal, createRecord, getCars } from '../../api/auto';
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
  const [records, setRecords] = useState<Record[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      setFormData({
        date: new Date().toISOString().split('T')[0],
        mileage: '',
        category: 'to',
        work: '',
        cost: '',
        comment: ''
      });
      loadData();
    } catch (err) {
      alert('Ошибка сохранения записи');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Загрузка...</div>;

  if (cars.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600 mb-4">Сначала добавьте автомобиль во вкладке "Авто"</p>
        <button onClick={() => onCarChange(null)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Перейти к авто</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Журнал обслуживания</h2>
        <button
          onClick={() => {
            const car = cars.find(c => c.id === selectedCarId);
            setFormData(prev => ({ ...prev, mileage: String(car?.mileage || '') }));
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          + Добавить запись
        </button>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center text-gray-500 shadow-sm">
          Записей пока нет. Добавьте первое обслуживание.
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => (
            <div key={rec.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-gray-800">{getCategoryName(rec.category)}</span>
                <span className="font-semibold text-blue-600">{rec.cost} ₽</span>
              </div>
              <div className="text-sm text-gray-500 mb-1">
                {new Date(rec.date).toLocaleDateString('ru-RU')} • {rec.mileage} км
              </div>
              {rec.work && <div className="text-sm text-gray-700">{rec.work}</div>}
              {rec.comment && <div className="text-xs text-gray-400 mt-1 italic">"{rec.comment}"</div>}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно добавления записи */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Новая запись</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Дата</label>
                  <input required type="date" className="input-field w-full" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Пробег (км)</label>
                  <input required type="number" className="input-field w-full" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-500">Категория</label>
                <select className="input-field w-full" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500">Выполненные работы</label>
                <textarea required rows={2} className="input-field w-full" value={formData.work} onChange={e => setFormData({...formData, work: e.target.value})} placeholder="Например: Замена масла и фильтра" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">Стоимость (₽)</label>
                  <input type="number" className="input-field w-full" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500">Комментарий (необязательно)</label>
                <input className="input-field w-full" value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})} placeholder="Например: Масло Shell 5W-30" />
              </div>
              
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition mt-2">
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