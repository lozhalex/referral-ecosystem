import React, { useState, useEffect } from 'react';
import { getDashboard, getCars } from '../../api/auto';
import { getCategoryName } from './categories';

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
  nextMileage: number;
  remaining: number;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedCarId, onCarChange, onTabChange }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [tiles, setTiles] = useState<ServiceTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCarId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [carsData, dashboardData] = await Promise.all([
        getCars(),
        getDashboard(selectedCarId || undefined)
      ]);

      setCars(carsData.cars || []);
      
      if (!selectedCarId && carsData.cars?.length > 0) {
        onCarChange(carsData.cars[0].id);
      }

      if (dashboardData.cars && dashboardData.records && dashboardData.intervals) {
        const currentCar = dashboardData.cars.find((c: Car) => c.id === selectedCarId);
        if (currentCar) {
          const calculatedTiles = calculateServiceTiles(
            dashboardData.records,
            dashboardData.intervals,
            currentCar.mileage
          );
          setTiles(calculatedTiles);
        } else {
          setTiles([]);
        }
      }
    } catch (err: any) {
      setError('Ошибка загрузки данных');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateServiceTiles = (
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
    for (const [cat, lastRec] of Object.entries(byCategory)) {
      if (cat === 'other') continue;
      const interval = Number(intervals[cat]) || 0;
      if (interval <= 0) continue;

      const nextMileage = (Number(lastRec.mileage) || 0) + interval;
      const remaining = nextMileage - currentMileage;
      tiles.push({ cat, name: getCategoryName(cat), nextMileage, remaining });
    }

    tiles.sort((a, b) => {
      if (a.remaining < 0 && b.remaining >= 0) return -1;
      if (b.remaining < 0 && a.remaining >= 0) return 1;
      return a.remaining - b.remaining;
    });

    return tiles;
  };

  const getTileColor = (remaining: number): string => {
    if (remaining < 0) return 'border-red-500 bg-red-50';
    if (remaining <= 1000) return 'border-red-400 bg-orange-50';
    if (remaining <= 3000) return 'border-yellow-400 bg-yellow-50';
    return 'border-green-400 bg-green-50';
  };

  const getRemainText = (remaining: number): string => {
    if (remaining < 0) return `Просрочено на ${Math.abs(remaining)} км`;
    return `Осталось: ${remaining} км`;
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
        <p className="text-gray-600 mb-4">Чтобы начать вести журнал и получать прогнозы, добавьте первое авто.</p>
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

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Прогноз обслуживания</h2>
        {tiles.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-700 font-medium mb-1">Пока нет данных для прогноза</p>
            <p className="text-sm text-gray-500 mb-4">Добавьте первую запись об обслуживании (даже задним числом), чтобы система начала расчет.</p>
            <button
              onClick={() => onTabChange('journal')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Перейти в журнал и добавить запись
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {tiles.map(tile => (
              <div
                key={tile.cat}
                className={`border-2 rounded-lg p-3 cursor-pointer hover:shadow-md transition ${getTileColor(tile.remaining)}`}
                onClick={() => onTabChange('journal')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-2xl">🔧</div>
                  <div className="font-semibold text-sm text-gray-800">{tile.name}</div>
                </div>
                <div className="text-xs text-gray-600 mb-1">Следующее: {tile.nextMileage} км</div>
                <div className={`font-bold text-sm ${
                  tile.remaining < 0 ? 'text-red-600' :
                  tile.remaining <= 1000 ? 'text-red-500' :
                  tile.remaining <= 3000 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {getRemainText(tile.remaining)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCarId && cars.find(c => c.id === selectedCarId) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Текущий автомобиль</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <div><strong>Пробег:</strong> {cars.find(c => c.id === selectedCarId)?.mileage} км</div>
            <div><strong>Госномер:</strong> {cars.find(c => c.id === selectedCarId)?.gosnomer || 'Не указан'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;