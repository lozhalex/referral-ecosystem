import React, { useState, useEffect } from 'react';
import { getAdminCars, getAdminRecords, updateAdminRecord, deleteAdminRecord } from '../api/adminAuto';
import { CATEGORIES } from './AutoHelper/categories';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';

export default function AdminAutoHelper() {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<'cars' | 'records'>('cars');
  const [cars, setCars] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ date: '', mileage: '', category: '', work: '', cost: '', comment: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'cars') {
        const res = await getAdminCars();
        setCars(res.cars || []);
      } else {
        const res = await getAdminRecords();
        setRecords(res.records || []);
      }
    } catch (err) {
      showError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (record: any) => {
    setEditingRecord(record);
    setEditForm({
      date: record.date,
      mileage: String(record.mileage),
      category: record.category,
      work: record.work,
      cost: String(record.cost),
      comment: record.comment || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await updateAdminRecord(editingRecord.id, editForm);
      success('Запись успешно обновлена');
      setEditingRecord(null);
      loadData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись? Это действие будет записано в аудит.')) return;
    try {
      await deleteAdminRecord(id);
      success('Запись удалена');
      loadData();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Ошибка удаления');
    }
  };

  const filteredRecords = records.filter(r =>
    r.user?.phone?.includes(searchQuery) ||
    r.car?.gosnomer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Загрузка данных админ-панели...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
          >
            <span>←</span>
            <span>В админ-панель</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-100">Администрирование: Помощник автомобилиста</h1>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 border border-white/10">
          <button
            onClick={() => setActiveTab('cars')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'cars' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Автомобили
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'records' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Журнал ТО
          </button>
        </div>
      </div>

      {activeTab === 'cars' && (
        <div className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-slate-800 text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Владелец (Телефон)</th>
                <th className="px-6 py-3">Автомобиль</th>
                <th className="px-6 py-3">Госномер</th>
                <th className="px-6 py-3">Пробег</th>
                <th className="px-6 py-3">Дата добавления</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cars.map(car => (
                <tr key={car.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-mono text-cyan-400">{car.user?.phone}</td>
                  <td className="px-6 py-4">{car.marka} {car.model} ({car.year})</td>
                  <td className="px-6 py-4 font-bold text-white">{car.gosnomer || 'Нет'}</td>
                  <td className="px-6 py-4">{car.mileage.toLocaleString('ru-RU')} км</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(car.createdAt).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
              {cars.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Автомобили не найдены</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Поиск по телефону владельца или госномеру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-white/10 text-gray-100 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500"
            />
          </div>
          <div className="bg-slate-900 border border-white/10 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
              <thead className="bg-slate-800 text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Владелец</th>
                  <th className="px-4 py-3">Авто</th>
                  <th className="px-4 py-3">Категория</th>
                  <th className="px-4 py-3">Пробег</th>
                  <th className="px-4 py-3">Работы</th>
                  <th className="px-4 py-3">Стоимость</th>
                  <th className="px-4 py-3">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 whitespace-nowrap">{record.date}</td>
                    <td className="px-4 py-3 font-mono text-cyan-400">{record.user?.phone}</td>
                    <td className="px-4 py-3">{record.car?.marka} {record.car?.gosnomer}</td>
                    <td className="px-4 py-3">{CATEGORIES.find(c => c.key === record.category)?.name || record.category}</td>
                    <td className="px-4 py-3">{record.mileage.toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={record.work}>{record.work}</td>
                    <td className="px-4 py-3">{record.cost} ₽</td>
                    <td className="px-4 py-3 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleEditClick(record)}
                        className="text-xs bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded hover:bg-yellow-500/30 transition"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/30 transition"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-gray-500">Записи не найдены</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="font-bold text-gray-100">Редактирование записи #{editingRecord.id}</h3>
              <button onClick={() => setEditingRecord(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Дата</label>
                  <input required type="date" className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Пробег (км)</label>
                  <input required type="number" className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" value={editForm.mileage} onChange={e => setEditForm({...editForm, mileage: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Категория</label>
                <select className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key} className="bg-slate-800">{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Выполненные работы</label>
                <textarea required rows={3} className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" value={editForm.work} onChange={e => setEditForm({...editForm, work: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Стоимость (₽)</label>
                  <input type="number" className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" value={editForm.cost} onChange={e => setEditForm({...editForm, cost: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Комментарий</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" value={editForm.comment} onChange={e => setEditForm({...editForm, comment: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">Сохранить изменения</button>
                <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 py-2.5 bg-white/5 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition border border-white/10">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}