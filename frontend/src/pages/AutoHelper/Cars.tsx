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
        onCarChange(res.car.id); // Сразу выбираем новое авто
      }
      setIsModalOpen(false);
      loadCars();
    } catch (err) {
      alert('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот автомобиль?')) {
      try {
        await deleteCar(id);
        onCarChange(null); // Сбрасываем выбор
        loadCars();
      } catch (err) {
        alert('Ошибка удаления');
      }
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Загрузка...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Мои автомобили</h2>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          + Добавить авто
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center text-gray-500 shadow-sm">
          У вас пока нет добавленных автомобилей.
        </div>
      ) : (
        <div className="space-y-3">
          {cars.map(car => (
            <div key={car.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800">{car.marka} {car.model}</h3>
                  <p className="text-sm text-gray-500">{car.year} • {car.gosnomer || 'Без номера'}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{car.mileage} км</div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleOpenModal(car)}
                  className="flex-1 py-1.5 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => handleDelete(car.id)}
                  className="flex-1 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно добавления/редактирования */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">{editingCar ? 'Редактировать авто' : 'Новый автомобиль'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="Марка (напр. Toyota)" className="input-field" value={formData.marka} onChange={e => setFormData({...formData, marka: e.target.value})} />
                <input required placeholder="Модель (напр. Camry)" className="input-field" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Год выпуска" className="input-field" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
                <input placeholder="Госномер" className="input-field" value={formData.gosnomer} onChange={e => setFormData({...formData, gosnomer: e.target.value})} />
              </div>
              <input placeholder="VIN (необязательно)" className="input-field w-full" value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} />
              <input required type="number" placeholder="Текущий пробег (км)" className="input-field w-full" value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} />
              
              <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition mt-2">
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