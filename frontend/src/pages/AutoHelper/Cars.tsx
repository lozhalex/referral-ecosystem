import React, { useState, useEffect } from 'react';
import { getCars, createCar, updateCar, deleteCar } from '../../api/auto';

interface CarsProps {
  onCarChange: (carId: number | null) => void;
}

interface Car {
  id: number;
  marka: string;
  model: string;
  year: string;
  gosnomer: string;
  vin: string;
  mileage: number;
}

const Cars: React.FC<CarsProps> = ({ onCarChange }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);

  const [formData, setFormData] = useState({
    marka: '', model: '', year: '', gosnomer: '', vin: '', mileage: ''
  });

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      setLoading(true);
      const res = await getCars();
      setCars(res.cars || []);
    } catch (err) {
      console.error('Ошибка загрузки авто:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (car?: Car) => {
    if (car) {
      setEditingCar(car);
      setFormData({
        marka: car.marka, model: car.model, year: car.year,
        gosnomer: car.gosnomer, vin: car.vin, mileage: String(car.mileage)
      });
    } else {
      setEditingCar(null);
      setFormData({ marka: '', model: '', year: '', gosnomer: '', vin: '', mileage: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCar) {
        await updateCar(editingCar.id, { ...formData, mileage: Number(formData.mileage) });
      } else {
        const res = await createCar({ ...formData, mileage: Number(formData.mileage) });
        onCarChange(res.car.id);
      }
      setIsModalOpen(false);
      loadCars();
    } catch (err) {
      alert('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот автомобиль? Это действие потребует запроса на восстановление через поддержку.')) {
      try {
        await deleteCar(id);
        onCarChange(null);
        loadCars();
      } catch (err) {
        alert('Ошибка удаления');
      }
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500";

  if (loading) return <div className="text-center py-10 text-cyan-400 animate-pulse">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-100">Мои автомобили</h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
        >
          + Добавить авто
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center text-gray-400">
          У вас пока нет добавленных автомобилей.
        </div>
      ) : (
        <div className="space-y-3">
          {cars.map(car => (
            <div key={car.id} className="bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-lg hover:border-purple-500/30 transition-all duration-300">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-100 text-lg">{car.marka} {car.model}</h3>
                  <p className="text-sm text-gray-400">{car.year} • {car.gosnomer || 'Без номера'}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-cyan-400">{car.mileage} км</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => handleOpenModal(car)}
                  className="flex-1 py-2 text-sm text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-all"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => handleDelete(car.id)}
                  className="flex-1 py-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="font-bold text-gray-100">{editingCar ? 'Редактировать авто' : 'Новый автомобиль'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Марка (напр. Toyota)" className={inputClass} value={formData.marka} onChange={e => setFormData({...formData, marka: e.target.value})} />
                <input required placeholder="Модель (напр. Camry)" className={inputClass} value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Год выпуска" className={inputClass} value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
                <input placeholder="Госномер" className={inputClass} value={formData.gosnomer} onChange={e => setFormData({...formData, gosnomer: e.target.value})} />
              </div>
              <input placeholder="VIN (необязательно)" className={inputClass} value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} />
              <input required type="number" placeholder="Текущий пробег (км)" className={inputClass} value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} />
              
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all mt-2">
                Сохранить
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cars;