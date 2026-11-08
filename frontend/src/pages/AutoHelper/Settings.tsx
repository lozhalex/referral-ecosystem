import React, { useState, useEffect } from 'react';
import { getIntervals, saveIntervals, getSettings, saveSettings } from '../../api/auto';
import { CATEGORIES, DEFAULT_INTERVALS } from './categories';

const Settings: React.FC = () => {
  const [intervals, setIntervals] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState({ mileageReminderTime: '09:00' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [intervalsRes, settingsRes] = await Promise.all([
        getIntervals(),
        getSettings()
      ]);
      setIntervals(intervalsRes.intervals || DEFAULT_INTERVALS);
      setSettings(settingsRes.settings || { mileageReminderTime: '09:00' });
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
      await Promise.all([
        saveIntervals(intervals),
        saveSettings(settings.mileageReminderTime)
      ]);
      alert('Настройки успешно сохранены!');
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

  const handleReset = () => {
    if (window.confirm('Вы уверены, что хотите сбросить все интервалы к значениям по умолчанию?')) {
      setIntervals(DEFAULT_INTERVALS);
    }
  };

  // Получаем единицу измерения для категории
  const getUnit = (categoryKey: string): string => {
    const category = CATEGORIES.find(c => c.key === categoryKey);
    return category?.isTimeBased ? 'мес.' : 'км';
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-6">
      {/* Время напоминания о пробеге */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3">⏰ Время напоминания о пробеге</h3>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.mileageReminderTime}
            onChange={(e) => setSettings({ ...settings, mileageReminderTime: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <span className="text-sm text-gray-600">
            Ежемесячное напоминание (1-го числа)
          </span>
        </div>
      </div>

      {/* Интервалы обслуживания */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Интервалы обслуживания</h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
          Укажите интервалы для каждого вида обслуживания. Для категорий по времени (тормозная жидкость, антифриз) интервал указывается в месяцах.
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
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
                <span className="text-sm text-gray-500 w-12">
                  {getUnit(cat.key)}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={handleReset}
          className="w-full mt-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
        >
          Сбросить к значениям по умолчанию
        </button>
      </div>
    </div>
  );
};

export default Settings;