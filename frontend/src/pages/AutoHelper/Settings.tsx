import React, { useState, useEffect } from 'react';
import { getIntervals, saveIntervals } from '../../api/auto';
import { CATEGORIES, DEFAULT_INTERVALS } from './categories';

const Settings: React.FC = () => {
  const [intervals, setIntervals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadIntervals();
  }, []);

  const loadIntervals = async () => {
    try {
      setLoading(true);
      const res = await getIntervals();
      setIntervals(res.intervals || DEFAULT_INTERVALS);
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
      setIntervals(DEFAULT_INTERVALS);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveIntervals(intervals);
      alert('Интервалы успешно сохранены!');
    } catch (err) {
      alert('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setIntervals(prev => ({
      ...prev,
      [key]: Number(value) || 0
    }));
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Настройки интервалов</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
        Укажите средний пробег (в км), через который вы обычно выполняете эти работы. Эти данные используются для расчета прогноза на главной странице.
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 divide-y divide-gray-100">
        {CATEGORIES.map(cat => (
          <div key={cat.key} className="flex items-center justify-between p-4">
            <span className="text-gray-700 font-medium">{cat.name}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                value={intervals[cat.key] || 0}
                onChange={(e) => handleChange(cat.key, e.target.value)}
              />
              <span className="text-sm text-gray-500 w-6">км</span>
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={() => setIntervals(DEFAULT_INTERVALS)}
        className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition"
      >
        Сбросить к значениям по умолчанию
      </button>
    </div>
  );
};

export default Settings;