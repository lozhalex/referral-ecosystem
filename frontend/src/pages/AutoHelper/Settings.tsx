import React, { useState, useEffect } from 'react';
import { getIntervals, saveIntervals, getSettings, saveSettings } from '../../api/auto';
import { getPredictableCategories } from './categories';
import { useToast } from '../../hooks/useToast';

const Settings: React.FC = () => {
  const { success, error: showError } = useToast();
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

      const defaultIntervals: Record<string, number> = {};
      getPredictableCategories().forEach(c => {
        defaultIntervals[c.key] = c.defaultInterval;
      });

      setIntervals(intervalsRes.intervals || defaultIntervals);
      setSettings(settingsRes.settings || { mileageReminderTime: '09:00' });
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
      const defaultIntervals: Record<string, number> = {};
      getPredictableCategories().forEach(c => {
        defaultIntervals[c.key] = c.defaultInterval;
      });
      setIntervals(defaultIntervals);
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
      success('Настройки успешно сохранены!');
    } catch (err) {
      showError('Ошибка сохранения');
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
    const defaultIntervals: Record<string, number> = {};
    getPredictableCategories().forEach(c => {
      defaultIntervals[c.key] = c.defaultInterval;
    });
    setIntervals(defaultIntervals);
    success('Интервалы сброшены к значениям по умолчанию');
  };

  const getUnit = (categoryKey: string): string => {
    const category = getPredictableCategories().find(c => c.key === categoryKey);
    return category?.isTimeBased ? 'мес.' : 'км';
  };

  const inputClass = "w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500";

  if (loading) return <div className="text-center py-10 text-cyan-400 animate-pulse">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-4">
        <h3 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
          ⏰ Время напоминания о пробеге
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.mileageReminderTime}
            onChange={(e) => setSettings({ ...settings, mileageReminderTime: e.target.value })}
            className={inputClass}
          />
          <span className="text-sm text-gray-400">
            Ежемесячное напоминание (1-го числа)
          </span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-100 flex items-center gap-2">
            ⚙️ Интервалы обслуживания
          </h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/25 transition-all text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-sm text-cyan-300 mb-4 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
          Укажите интервалы для каждого вида обслуживания. Для категорий по времени (тормозная жидкость, антифриз) интервал указывается в месяцах.
        </div>
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl divide-y divide-white/10">
          {getPredictableCategories().map(cat => (
            <div key={cat.key} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
              <span className="text-gray-300 font-medium">{cat.name}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-24 px-3 py-1.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg text-right focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
                  value={intervals[cat.key] || 0}
                  onChange={(e) => handleChange(cat.key, e.target.value)}
                />
                <span className="text-sm text-gray-400 w-12 text-right">
                  {getUnit(cat.key)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleReset}
          className="w-full mt-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
        >
          Сбросить к значениям по умолчанию
        </button>
      </div>
    </div>
  );
};

export default Settings;