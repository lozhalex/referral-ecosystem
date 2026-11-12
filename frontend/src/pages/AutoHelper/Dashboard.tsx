import React, { useState, useEffect } from 'react';
import { getDashboard, getCars, submitMileageCheck, getMileageChecks, createRecord, markNotificationsRead } from '../../api/auto';
import { getCategoryName, getPredictableCategories } from './categories';

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
  isFwd?: boolean;
}

interface ServiceTile {
  cat: string;
  name: string;
  color: 'red' | 'yellow' | 'green' | 'gray';
  message?: string;
  forecastDate?: Date;
  interval: number;
  isTimeBased: boolean;
  lastMileage?: number;
  lastDate?: string;
}

const DEFAULT_AVG_PER_MONTH = 1500;

const Dashboard: React.FC<DashboardProps> = ({ selectedCarId, onCarChange, onTabChange }) => {
  const [showMileageErrorModal, setShowMileageErrorModal] = useState(false);
  const [lastRecordedMileage, setLastRecordedMileage] = useState(0);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMileageEntered, setIsMileageEntered] = useState(false);
  const [showMileageModal, setShowMileageModal] = useState(false);
  const [mileageInput, setMileageInput] = useState('');
  const [tiles, setTiles] = useState<ServiceTile[]>([]);
  const [avgPerMonth, setAvgPerMonth] = useState(DEFAULT_AVG_PER_MONTH);
  const [isDefaultTempo, setIsDefaultTempo] = useState(true);
  const [showOthers, setShowOthers] = useState(false);
  const [osagoStatus, setOsagoStatus] = useState<'ok' | 'warning' | 'expired' | 'none'>('none');
  const [showOsagoModal, setShowOsagoModal] = useState(false);
  const [osagoDateInput, setOsagoDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [showGrayModal, setShowGrayModal] = useState(false);
  const [selectedGrayCategory, setSelectedGrayCategory] = useState<string>('');
  const [grayFormData, setGrayFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    cost: '',
    work: '',
    comment: ''
  });

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
        return;
      }

      if (selectedCarId && dashboardData.cars && dashboardData.records && dashboardData.intervals) {
        const currentCar = dashboardData.cars.find((c: Car) => c.id === selectedCarId);
        if (currentCar) {
          const mileageData = await getMileageChecks(selectedCarId);
          const checks = mileageData.checks || [];
          
          const currentYearMonth = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
          const entered = checks.some((c: any) => c.yearMonth === currentYearMonth);
          setIsMileageEntered(entered);
          
          const calculatedAvg = calculateAvgPerMonth(checks);
          setAvgPerMonth(calculatedAvg.avg);
          setIsDefaultTempo(calculatedAvg.isDefault);
          
          checkOsagoStatus(dashboardData.records);
          
          const calculatedTiles = buildTiles(
            dashboardData.records,
            dashboardData.intervals,
            currentCar,
            calculatedAvg.avg,
            currentCar.isFwd || false
          );
          setTiles(calculatedTiles);
        }
      }
    } catch (err: any) {
      setError('Ошибка загрузки данных');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAvgPerMonth = (checks: any[]) => {
    if (checks.length < 2) {
      return { avg: DEFAULT_AVG_PER_MONTH, isDefault: true };
    }
    
    const sorted = [...checks].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    
    const firstYear = parseInt(first.yearMonth.substring(0, 4));
    const firstMonth = parseInt(first.yearMonth.substring(4, 6));
    const lastYear = parseInt(last.yearMonth.substring(0, 4));
    const lastMonth = parseInt(last.yearMonth.substring(4, 6));
    
    const monthsDiff = (lastYear - firstYear) * 12 + (lastMonth - firstMonth);
    
    if (monthsDiff <= 0) {
      return { avg: DEFAULT_AVG_PER_MONTH, isDefault: true };
    }
    
    const kmDiff = last.km - first.km;
    const avg = kmDiff / monthsDiff;
    
    return { avg: Math.round(avg), isDefault: false };
  };

  const getForecastDates = (avgPerMonth: number) => {
    const today = new Date();
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    const daysUntilCurrentEnd = Math.ceil((currentMonthEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilNextEnd = Math.ceil((nextMonthEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    const avgPerDay = avgPerMonth / 30;
    
    return {
      currentMonthEnd,
      nextMonthEnd,
      daysUntilCurrentEnd,
      daysUntilNextEnd,
      avgPerDay
    };
  };

  const buildTiles = (
    records: any[],
    intervals: Record<string, number>,
    currentCar: Car,
    avgPerMonth: number,
    isFwd: boolean
  ): ServiceTile[] => {
    const { currentMonthEnd, nextMonthEnd, avgPerDay } = getForecastDates(avgPerMonth);
    const currentMileage = currentCar.mileage;
    
    const byCategory: Record<string, any> = {};
    for (const rec of records) {
      if (!byCategory[rec.category] || rec.date > byCategory[rec.category].date) {
        byCategory[rec.category] = rec;
      }
    }
    
    const predictableCats = getPredictableCategories(isFwd, currentMileage);
    const tiles: ServiceTile[] = [];
    
    for (const catConfig of predictableCats) {
      const lastRec = byCategory[catConfig.key];
      const interval = Number(intervals[catConfig.key]) || catConfig.defaultInterval;
      
      if (catConfig.isTimeBased) {
        if (!lastRec) {
          tiles.push({
            cat: catConfig.key,
            name: catConfig.name,
            color: 'gray',
            interval,
            isTimeBased: true,
            forecastDate: undefined
          });
          continue;
        }
        
        const lastDate = new Date(lastRec.date + 'T00:00:00');
        const nextDueDate = new Date(lastDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + interval);
        
        let color: 'red' | 'yellow' | 'green';
        let message: string | undefined;
        
        if (nextDueDate <= currentMonthEnd) {
          color = 'red';
          message = 'В этом месяце требуется ТО';
        } else if (nextDueDate <= nextMonthEnd) {
          color = 'yellow';
          message = 'В следующем месяце может потребоваться ТО';
        } else {
          continue;
        }
        
        tiles.push({
          cat: catConfig.key,
          name: catConfig.name,
          color,
          message,
          interval,
          isTimeBased: true,
          lastDate: lastRec.date,
          forecastDate: nextDueDate
        });
      } else {
        if (!lastRec) {
          const forecastDate = new Date();
          forecastDate.setDate(forecastDate.getDate() + Math.ceil(interval / avgPerDay));
          
          tiles.push({
            cat: catConfig.key,
            name: catConfig.name,
            color: 'gray',
            interval,
            isTimeBased: false,
            forecastDate
          });
          continue;
        }
        
        const lastMileage = Number(lastRec.mileage) || 0;
        const threshold = lastMileage + interval;
        
        const forecastCurrentEnd = currentMileage + (avgPerDay * getForecastDates(avgPerMonth).daysUntilCurrentEnd);
        const forecastNextEnd = currentMileage + (avgPerDay * getForecastDates(avgPerMonth).daysUntilNextEnd);
        
        let color: 'red' | 'yellow' | 'green';
        let message: string | undefined;
        
        if (forecastCurrentEnd >= threshold) {
          color = 'red';
          message = 'В этом месяце требуется ТО';
        } else if (forecastNextEnd >= threshold) {
          color = 'yellow';
          message = 'В следующем месяце может потребоваться ТО';
        } else {
          color = 'green';
        }
        
        const kmUntilThreshold = threshold - currentMileage;
        const daysUntilThreshold = kmUntilThreshold / avgPerDay;
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + daysUntilThreshold);
        
        tiles.push({
          cat: catConfig.key,
          name: catConfig.name,
          color,
          message,
          interval,
          isTimeBased: false,
          lastMileage,
          lastDate: lastRec.date,
          forecastDate
        });
      }
    }
    
    tiles.sort((a, b) => {
      if (!a.forecastDate && !b.forecastDate) return 0;
      if (!a.forecastDate) return 1;
      if (!b.forecastDate) return -1;
      return a.forecastDate.getTime() - b.forecastDate.getTime();
    });
    
    return tiles;
  };

  const checkOsagoStatus = (records: any[]) => {
    const osagoRecords = records.filter((r: any) => r.category === 'osago');
    if (osagoRecords.length === 0) {
      setOsagoStatus('none');
      return;
    }

    const latestOsago = osagoRecords.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

    const lastDate = new Date(latestOsago.date);
    const expDate = new Date(lastDate);
    expDate.setFullYear(expDate.getFullYear() + 1);
    
    const now = new Date();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    
    if (expDate <= currentMonthEnd) {
      setOsagoStatus('expired');
    } else if (expDate <= nextMonthEnd) {
      setOsagoStatus('warning');
    } else {
      setOsagoStatus('ok');
    }
  };

  const handleMileageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId || !mileageInput) return;
    
    try {
      await submitMileageCheck(selectedCarId, Number(mileageInput));
      setShowMileageModal(false);
      setMileageInput('');
      await markNotificationsRead(['mileage']);
      loadData();
    } catch (err: any) {
      if (err.response?.data?.code === 'MILEAGE_DECREASED') {
        setLastRecordedMileage(err.response.data.lastMileage);
        setShowMileageErrorModal(true);
      } else {
        alert(err.response?.data?.message || 'Ошибка сохранения пробега');
      }
    }
  };

  const handleOsagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId || !osagoDateInput) return;
    
    const currentCar = cars.find(c => c.id === selectedCarId);
    
    try {
      await createRecord({
        carId: selectedCarId,
        category: 'osago',
        date: osagoDateInput,
        mileage: currentCar?.mileage || 0,
        work: 'Продление полиса ОСАГО',
        cost: 0,
        comment: ''
      });
      setShowOsagoModal(false);
      await markNotificationsRead(['osago']);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка сохранения даты ОСАГО');
    }
  };

  const handleGrayTileClick = (catKey: string) => {
    setSelectedGrayCategory(catKey);
    const car = cars.find(c => c.id === selectedCarId);
    setGrayFormData({
      date: new Date().toISOString().split('T')[0],
      mileage: String(car?.mileage || ''),
      cost: '',
      work: '',
      comment: ''
    });
    setShowGrayModal(true);
  };

  const handleGraySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId || !selectedGrayCategory) return;
    
    try {
      await createRecord({
        carId: selectedCarId,
        category: selectedGrayCategory,
        ...grayFormData,
        mileage: Number(grayFormData.mileage),
        cost: Number(grayFormData.cost) || 0
      });
      
      setShowGrayModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const getTileColorClass = (color: string): string => {
    switch (color) {
      case 'red': return 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
      case 'yellow': return 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]';
      case 'green': return 'border-green-500/50 bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]';
      case 'gray': return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
      default: return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
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

  if (!isMileageEntered) {
    const currentMonthName = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    
    return (
      <div className="space-y-4">
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

        <div className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-2xl p-6 text-center">
          <div className="text-5xl mb-3">📍</div>
          <h3 className="text-lg font-bold text-gray-100 mb-2">Введите пробег за {currentMonthName}</h3>
          <p className="text-sm text-gray-400 mb-4">
            Для получения точного прогноза необходимо ежемесячно вводить актуальный пробег
          </p>
          <button
            onClick={() => setShowMileageModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all font-medium"
          >
            Ввести пробег
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {osagoStatus === 'expired' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2.5 flex items-center justify-between shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse">
            <span className="text-sm text-red-400 font-medium flex items-center gap-2">
              🚨 Срок действия ОСАГО истек!
            </span>
            <button 
              onClick={() => setShowOsagoModal(true)} 
              className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1 rounded-full transition font-medium"
            >
              Обновить
            </button>
          </div>
        )}
        
        {osagoStatus === 'warning' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-2.5 flex items-center justify-between shadow-[0_0_15px_rgba(234,179,8,0.15)]">
            <span className="text-sm text-yellow-400 font-medium flex items-center gap-2">
              ⚠️ ОСАГО истекает в течение месяца
            </span>
            <button 
              onClick={() => setShowOsagoModal(true)} 
              className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 px-3 py-1 rounded-full transition font-medium"
            >
              Обновить
            </button>
          </div>
        )}
      </div>

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
        
        {isDefaultTempo && (
          <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
            ⚠️ Используется дефолтный темп (1500 км/мес). Введите пробег за несколько месяцев для точного прогноза
          </p>
        )}
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
          <span className="text-xs font-normal text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            средний темп: {avgPerMonth} км/мес
          </span>
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
              {tiles.slice(0, 6).map(tile => (
                <div
                  key={tile.cat}
                  onClick={() => tile.color === 'gray' ? handleGrayTileClick(tile.cat) : onTabChange('journal')}
                  className={`border rounded-xl p-3 cursor-pointer hover:scale-[1.02] transition-all duration-300 ${getTileColorClass(tile.color)}`}
                >
                  <div className="font-semibold text-sm">{tile.name}</div>
                  {tile.message && <div className="text-xs mt-1 opacity-90">{tile.message}</div>}
                  {tile.color === 'gray' && <div className="text-xs mt-1 opacity-70">Внесите данные</div>}
                </div>
              ))}
            </div>

            {tiles.length > 6 && (
              <button
                onClick={() => setShowOthers(!showOthers)}
                className="w-full mt-3 py-2 text-sm text-cyan-400 hover:bg-white/5 rounded-lg transition-all border border-transparent hover:border-white/10"
              >
                {showOthers ? '▲ Скрыть' : '▼'} Другие категории ({tiles.length - 6})
              </button>
            )}

            {showOthers && tiles.length > 6 && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {tiles.slice(6).map(tile => (
                  <div
                    key={tile.cat}
                    onClick={() => tile.color === 'gray' ? handleGrayTileClick(tile.cat) : onTabChange('journal')}
                    className={`border rounded-xl p-3 cursor-pointer hover:scale-[1.02] transition-all duration-300 ${getTileColorClass(tile.color)}`}
                  >
                    <div className="font-semibold text-sm">{tile.name}</div>
                    {tile.message && <div className="text-xs mt-1 opacity-90">{tile.message}</div>}
                    {tile.color === 'gray' && <div className="text-xs mt-1 opacity-70">Внесите данные</div>}
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

      {showOsagoModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-gray-100">Обновить дату ОСАГО</h3>
              <button onClick={() => setShowOsagoModal(false)} className="text-gray-400 hover:text-white text-xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleOsagoSubmit} className="p-4 space-y-4">
              <p className="text-sm text-gray-400">
                Укажите дату начала действия <strong className="text-cyan-400">нового полиса</strong>.
              </p>
              <input
                type="date"
                required
                value={osagoDateInput}
                onChange={(e) => setOsagoDateInput(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
              >
                Сохранить дату
              </button>
            </form>
          </div>
        </div>
      )}

      {showGrayModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="font-bold text-gray-100">
                {getCategoryName(selectedGrayCategory)} — первое ТО
              </h3>
              <button onClick={() => setShowGrayModal(false)} className="text-gray-400 hover:text-white text-xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleGraySubmit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Дата обслуживания</label>
                  <input required type="date" className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all" value={grayFormData.date} onChange={e => setGrayFormData({...grayFormData, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Пробег (км)</label>
                  <input required type="number" className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all" value={grayFormData.mileage} onChange={e => setGrayFormData({...grayFormData, mileage: e.target.value})} placeholder="Напр. 195000" />
                </div>
              </div>
              
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Выполненные работы</label>
                <textarea required rows={2} className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all" value={grayFormData.work} onChange={e => setGrayFormData({...grayFormData, work: e.target.value})} placeholder="Например: Замена масла и фильтра" />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Стоимость (₽)</label>
                <input type="number" className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all" value={grayFormData.cost} onChange={e => setGrayFormData({...grayFormData, cost: e.target.value})} placeholder="0" />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Комментарий (необязательно)</label>
                <input className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all" value={grayFormData.comment} onChange={e => setGrayFormData({...grayFormData, comment: e.target.value})} placeholder="Например: Масло Shell 5W-30" />
              </div>

              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all mt-2">
                Сохранить запись
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🆕 НОВОЕ: Модалка ошибки уменьшения пробега */}
      {showMileageErrorModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-gray-100 mb-2">Пробег уменьшился</h3>
            <p className="text-sm text-gray-400 mb-6">
              Последний зафиксированный пробег: <span className="text-cyan-400 font-bold">{lastRecordedMileage} км</span>.<br/>
              Новый пробег не может быть меньше предыдущего. Это ошибка?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setShowMileageErrorModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
              >
                Ввести верные данные
              </button>
              <button
                onClick={() => {
                  alert('Функция "Заявка в ТП" находится в разработке и будет доступна в ближайших обновлениях.');
                  setShowMileageErrorModal(false);
                }}
                className="w-full py-2.5 bg-white/5 text-gray-300 rounded-lg font-medium hover:bg-white/10 transition border border-white/10"
              >
                Заявка в ТП на корректировку
              </button>
              <button
                onClick={() => setShowMileageErrorModal(false)}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;