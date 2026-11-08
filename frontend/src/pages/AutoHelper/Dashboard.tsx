import React, { useState, useEffect } from 'react';
import { getDashboard, getCars, getMileageCheckStatus, submitMileageCheck } from '../../api/auto';
import { getCategoryName, getPredictableCategories, CATEGORIES } from './categories';

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
  remaining: number; // км или месяцев
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
          
          // Гибридная логика отбора плиток
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

  // 🧠 УМНЫЙ РАСЧЕТ ПРОГНОЗА
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
      if (!lastRec) continue; // Нет записей — пропускаем

      const interval = Number(intervals[catConfig.key]) || catConfig.defaultInterval;
      if (interval <= 0) continue;

      const lastMileage = Number(lastRec.mileage) || 0;
      const kmPassed = Math.max(0, currentMileage - lastMileage);
      
      let remaining: number;
      let percentUsed: number;
      let avgPerMonth: number = 0;

      if (catConfig.isTimeBased) {
        // Для категорий по времени
        const lastDateObj = new Date(lastRec.date + 'T00:00:00');
        const monthsDiff = Math.max(1, (today.getFullYear() - lastDateObj.getFullYear()) * 12 + (today.getMonth() - lastDateObj.getMonth()));
        const monthsPassed = monthsDiff;
        remaining = interval - monthsPassed;
        percentUsed = Math.round((monthsPassed / interval) * 100);
      } else {
        // Для категорий по пробегу
        const daysDiff = Math.max(1, Math.floor((today.getTime() - new Date(lastRec.date + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)));
        const avgPerDay = kmPassed / daysDiff;
        avgPerMonth = Math.round(avgPerDay * 30);
        remaining = interval - kmPassed;
        percentUsed = Math.round((kmPassed / interval) * 100);
      }

      // Определяем цвет
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

    // Сортировка по срочности
    tiles.sort((a, b) => {
      if (a.remaining < 0 && b.remaining >= 0) return -1;
      if (b.remaining < 0 && a.remaining >= 0) return 1;
      return b.percentUsed - a.percentUsed;
    });

    return tiles;
  };

  // Гибридная логика отбора плиток
  const selectTopTiles = (allTiles: ServiceTile[]) => {
    // Шаг 1: Отбираем срочные (remaining < 3000 ИЛИ percentUsed > 80%)
    const urgent = allTiles.filter(t => 
      (t.isTimeBased ? t.remaining <= 1 : t.remaining < 3000) || t.percentUsed > 80
    );
    
    urgent.sort((a, b) => b.percentUsed - a.percentUsed);
    const topUrgent = urgent.slice(0, 8);
    
    // Шаг 2: Если срочных меньше 6, дополняем
    if (topUrgent.length < 6) {
      const remaining = allTiles.filter(t => !topUrgent.includes(t));
      remaining.sort((a, b) => b.percentUsed - a.percentUsed);
      const needToAdd = 6 - topUrgent.length;
      topUrgent.push(...remaining.slice(0, needToAdd));
    }
    
    // Шаг 3: Остальные — под кнопку
    const others = allTiles.filter(t => !topUrgent.includes(t));
    
    return { topTiles: topUrgent, otherTiles: others };
  };

  const getTileColorClass = (color: string): string => {
    if (color === 'red') return 'border-red-500 bg-red-50';
    if (color === 'yellow') return 'border-yellow-400 bg-yellow-50';
    return 'border-green-400 bg-green-50';
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
    return <div className="flex items-center justify-center py-20"><div className="text-gray-500">Загрузка...</div></div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-center">{error}</div>;
  }

  if (cars.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="text-6xl mb-4">🚗</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Добавьте ваш автомобиль</h2>
        <p className="text-gray-600 mb-4">Чтобы начать вести журнал и получать умные прогнозы, добавьте первое авто.</p>
        <button
          onClick={() => onTabChange('cars')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Перейти к добавлению авто
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Баннер о не введенном пробеге */}
      {uncheckedCars.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ Не введен пробег за {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}:
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            {uncheckedCars.map(c => `${c.marka} ${c.model}`).join(', ')}
          </p>
        </div>
      )}

      {/* Селектор автомобиля */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Выберите автомобиль</label>
        <select
          value={selectedCarId || ''}
          onChange={(e) => onCarChange(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          {cars.map(car => (
            <option key={car.id} value={car.id}>
              {car.marka} {car.model} {car.gosnomer} ({car.mileage} км)
            </option>
          ))}
        </select>
      </div>

      {/* Карточка ввода пробега */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-800">📍 Ввести пробег</h3>
            <p className="text-xs text-blue-600 mt-1">
              {new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowMileageModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            Ввести
          </button>
        </div>
      </div>

      {/* Умные плитки прогноза */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          🧠 Умный прогноз ТО
          <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">на основе вашего пробега</span>
        </h2>
        
        {tiles.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-800 font-medium mb-1">Все системы в норме!</p>
            <p className="text-sm text-gray-600 mb-4">
              Пока нет категорий, приближающихся к сроку обслуживания.
            </p>
            <button
              onClick={() => onTabChange('journal')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
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
                  className={`border-2 rounded-xl p-3 cursor-pointer hover:shadow-md transition ${getTileColorClass(tile.color)}`}
                >
                  <div className="font-semibold text-sm text-gray-800">{tile.name}</div>
                </div>
              ))}
            </div>

            {/* Кнопка "Другие категории" */}
            {otherTiles.length > 0 && (
              <button
                onClick={() => setShowOthers(!showOthers)}
                className="w-full mt-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                {showOthers ? '▲ Скрыть' : '▼'} Другие категории ({otherTiles.length})
              </button>
            )}

            {/* Раскрывающийся блок "Другие категории" */}
            {showOthers && otherTiles.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {otherTiles.map(tile => (
                  <div
                    key={tile.cat}
                    onClick={() => onTabChange('journal')}
                    className={`border-2 rounded-xl p-3 cursor-pointer hover:shadow-md transition ${getTileColorClass(tile.color)}`}
                  >
                    <div className="font-semibold text-sm text-gray-800">{tile.name}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Модальное окно ввода пробега */}
      {showMileageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Введите пробег</h3>
              <button onClick={() => setShowMileageModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleMileageSubmit} className="p-4 space-y-3">
              <p className="text-sm text-gray-600">
                Текущий пробег: <strong>{cars.find(c => c.id === selectedCarId)?.mileage} км</strong>
              </p>
              <input
                type="number"
                required
                value={mileageInput}
                onChange={(e) => setMileageInput(e.target.value)}
                placeholder="Введите текущий пробег"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
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