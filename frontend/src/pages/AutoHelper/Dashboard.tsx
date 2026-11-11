import React, { useState, useEffect } from 'react';
import { getDashboard, getCars, getMileageCheckStatus, submitMileageCheck } from '../../api/auto';
import { getPredictableCategories } from './categories';

interface DashboardProps {
  selectedCarId: number | null;
  onCarChange: (carId: number | null) => void;
  onTabChange: (tab: 'dashboard' | 'journal' | 'cars' | 'settings') => void;
}

interface Car {
  id: number;
  marka: string;
  model: string;
  year: string;
  gosnomer: string;
  mileage: number;
}

interface ServiceTile {
  cat: string;
  name: string;
  lastDate: string;
  lastMileage: number;
  currentMileage: number;
  interval: number;
  isTimeBased: boolean;
  remaining: number;
  percentUsed: number;
  avgPerMonth: number;
  color: 'green' | 'yellow' | 'red';
}

const Dashboard: React.FC<DashboardProps> = ({ selectedCarId, onCarChange, onTabChange }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [tiles, setTiles] = useState<ServiceTile[]>([]);
  const [otherTiles, setOtherTiles] = useState<ServiceTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uncheckedCars, setUncheckedCars] = useState<Car[]>([]);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [mileageInput, setMileageInput] = useState('');
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCarId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [carsData, dashboardData, mileageStatus] = await Promise.all([
        getCars(),
        getDashboard(selectedCarId || undefined),
        getMileageCheckStatus()
      ]);

      setCars(carsData.cars || []);
      setUncheckedCars(mileageStatus.uncheckedCars || []);
      
      if (!selectedCarId && carsData.cars?.length > 0) {
        onCarChange(carsData.cars[0].id);
      }

      if (dashboardData.cars && dashboardData.records && dashboardData.intervals) {
        const currentCar = dashboardData.cars.find((c: Car) => c.id === selectedCarId);
        if (currentCar) {
          const calculatedTiles = calculateSmartForecast(
            dashboardData.records,
            dashboardData.intervals,
            currentCar.mileage
          );
          
          const { topTiles, otherTiles: others } = selectTopTiles(calculatedTiles);
          setTiles(topTiles);
          setOtherTiles(others);
        } else {
          setTiles([]);
          setOtherTiles([]);
        }
      }
    } catch (err: any) {
      setError('Ошибка загрузки данных');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSmartForecast = (
    records: any[],
    intervals: Record<string, number>,
    currentMileage: number
  ): ServiceTile[] => {
    const byCategory: Record<string, any> = {};
    
    for (const rec of records) {
      if (!byCategory[rec.category] || rec.date > byCategory[rec.category].date) {
        byCategory[rec.category] = rec;
      }
    }

    const tiles: ServiceTile[] = [];
    const today = new Date();
    const predictableCats = getPredictableCategories();

    for (const catConfig of predictableCats) {
      const lastRec = byCategory[catConfig.key];
      if (!lastRec) continue;

      const interval = Number(intervals[catConfig.key]) || catConfig.defaultInterval;
      if (interval <= 0) continue;

      const lastMileage = Number(lastRec.mileage) || 0;
      const kmPassed = Math.max(0, currentMileage - lastMileage);
      
      let remaining: number;
      let percentUsed: number;
      let avgPerMonth: number = 0;

      if (catConfig.isTimeBased) {
        const lastDateObj = new Date(lastRec.date + 'T00:00:00');
        const monthsDiff = Math.max(1, (today.getFullYear() - lastDateObj.getFullYear()) * 12 + (today.getMonth() - lastDateObj.getMonth()));
        remaining = interval - monthsDiff;
        percentUsed = Math.round((monthsDiff / interval) * 100);
      } else {
        const daysDiff = Math.max(1, Math.floor((today.getTime() - new Date(lastRec.date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)));
        const avgPerDay = kmPassed / daysDiff;
        avgPerMonth = Math.round(avgPerDay * 30);
        remaining = interval - kmPassed;
        percentUsed = Math.round((kmPassed / interval) * 100);
      }

      let color: 'green' | 'yellow' | 'red';
      if (catConfig.isTimeBased) {
        if (remaining <= 0) color = 'red';
        else if (remaining <= 1) color = 'yellow';
        else color = 'green';
      } else {
        if (remaining < 0) color = 'red';
        else if (remaining <= 1000) color = 'red';
        else if (remaining <= 3000) color = 'yellow';
        else color = 'green';
      }

      tiles.push({
        cat: catConfig.key,
        name: catConfig.name,
        lastDate: lastRec.date,
        lastMileage,
        currentMileage,
        interval,
        isTimeBased: catConfig.isTimeBased,
        remaining,
        percentUsed,
        avgPerMonth,
        color
      });
    }

    tiles.sort((a, b) => {
      if (a.remaining < 0 && b.remaining >= 0) return -1;
      if (b.remaining < 0 && a.remaining >= 0) return 1;
      return b.percentUsed - a.percentUsed;
    });

    return tiles;
  };

  const selectTopTiles = (allTiles: ServiceTile[]) => {
    const urgent = allTiles.filter(t => 
      (t.isTimeBased ? t.remaining <= 1 : t.remaining < 3000) || t.percentUsed > 80
    );
    
    urgent.sort((a, b) => b.percentUsed - a.percentUsed);
    const topUrgent = urgent.slice(0, 8);
    
    if (topUrgent.length < 6) {
      const remaining = allTiles.filter(t => !topUrgent.includes(t));
      remaining.sort((a, b) => b.percentUsed - a.percentUsed);
      const needToAdd = 6 - topUrgent.length;
      topUrgent.push(...remaining.slice(0, needToAdd));
    }
    
    const others = allTiles.filter(t => !topUrgent.includes(t));
    
    return { topTiles: topUrgent, otherTiles: others };
  };

  const getTileColorClass = (color: string): string => {
    if (color === 'red') return 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
    if (color === 'yellow') return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
    return 'border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
  };

  const handleMileageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId || !mileageInput) return;
    
    try {
      await submitMileageCheck(selectedCarId, Number(mileageInput));
      setShowMileageModal(false);
      setMileageInput('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка сохранения пробега');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="text-cyan-400 animate-pulse">Загрузка данных...</div></div>;
  }

  if (error) {
    return <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-center">{error}</div>;
  }

  if (cars.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-8">
        <div className="text-6xl mb-4">🚗</div>
        <h2 className="text-xl font-bold text-gray-100 mb-2">Добавьте ваш автомобиль</h2>
        <p className="text-gray-400 mb-6">Чтобы начать вести журнал и получать умные прогнозы, добавьте первое авто.</p>
        <button
          onClick={() => onTabChange('cars')}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all font-medium"
        >
          Перейти к добавлению авто
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {uncheckedCars.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
          <p className="text-sm text-yellow-400 font-medium">
            ⚠️ Не введен пробег за {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}:
          </p>
          <p className="text-xs text-yellow-500/80 mt-1">
            {uncheckedCars.map(c => `${c.marka} ${c.model}`).join(', ')}
          </p>
        </div>
      )}

      <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Выберите автомобиль</label>
        <select
          value={selectedCarId || ''}
          onChange={(e) => onCarChange(Number(e.target.value))}
          className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
        >
          {cars.map(car => (
            <option key={car.id} value={car.id} className="bg-slate-800">
              {car.marka} {car.model} {car.gosnomer} ({car.mileage} км)
            </option>
          ))}
        </select>
      </div>

      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-300">📍 Ввести пробег</h3>
            <p className="text-xs text-purple-400/80 mt-1">
              {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowMileageModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
          >
            Ввести
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-100 mb-3 flex items-center gap-2">
          🧠 Умный прогноз ТО
          <span className="text-xs font-normal text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">на основе вашего пробега</span>
        </h2>
        
        {tiles.length === 0 ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(34,197,94,0.1)]">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-100 font-medium mb-1">Все системы в норме!</p>
            <p className="text-sm text-gray-400 mb-4">
              Пока нет категорий, приближающихся к сроку обслуживания.
            </p>
            <button
              onClick={() => onTabChange('journal')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
            >
              Добавить запись в журнал
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {tiles.map(tile => (
                <div
                  key={tile.cat}
                  onClick={() => onTabChange('journal')}
                  className={`border rounded-xl p-3 cursor-pointer hover:scale-[1.02] transition-all duration-300 ${getTileColorClass(tile.color)}`}
                >
                  <div className="font-semibold text-sm">{tile.name}</div>
                  <div className="text-xs mt-1 opacity-80">
                    {tile.isTimeBased ? `Осталось: ${tile.remaining} мес.` : `Осталось: ${tile.remaining} км`}
                  </div>
                </div>
              ))}
            </div>

            {otherTiles.length > 0 && (
              <button
                onClick={() => setShowOthers(!showOthers)}
                className="w-full mt-3 py-2 text-sm text-cyan-400 hover:bg-white/5 rounded-lg transition-all border border-transparent hover:border-white/10"
              >
                {showOthers ? '▲ Скрыть' : '▼'} Другие категории ({otherTiles.length})
              </button>
            )}

            {showOthers && otherTiles.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {otherTiles.map(tile => (
                  <div
                    key={tile.cat}
                    onClick={() => onTabChange('journal')}
                    className={`border rounded-xl p-3 cursor-pointer hover:scale-[1.02] transition-all duration-300 ${getTileColorClass(tile.color)}`}
                  >
                    <div className="font-semibold text-sm">{tile.name}</div>
                    <div className="text-xs mt-1 opacity-80">
                      {tile.isTimeBased ? `Осталось: ${tile.remaining} мес.` : `Осталось: ${tile.remaining} км`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showMileageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-gray-100">Введите пробег</h3>
              <button onClick={() => setShowMileageModal(false)} className="text-gray-400 hover:text-white text-xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleMileageSubmit} className="p-4 space-y-4">
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
    </div>
  );
};

export default Dashboard;