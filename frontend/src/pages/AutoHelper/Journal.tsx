import React, { useState, useEffect } from 'react';
import { getJournal, createRecord, getCars, generateServiceQR, revokeServiceQR } from '../../api/auto';
import { CATEGORIES, getCategoryName } from './categories';
import { QRCodeSVG } from 'qrcode.react';

interface JournalProps {
  selectedCarId: number | null;
  onCarChange: (carId: number | null) => void;
}

interface Record {
  id: number;
  date: string;
  mileage: number;
  category: string;
  work: string;
  cost: number;
  comment: string;
  source?: string;
}

const Journal: React.FC<JournalProps> = ({ selectedCarId, onCarChange }) => {
  const [cars, setCars] = useState<any[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Состояния для QR-модалки
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrCarInfo, setQrCarInfo] = useState<any>(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    category: 'to',
    work: '',
    cost: '',
    comment: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedCarId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [carsRes, journalRes] = await Promise.all([
        getCars(),
        selectedCarId ? getJournal(selectedCarId) : { records: [] }
      ]);
      setCars(carsRes.cars || []);
      setRecords(journalRes.records || []);
      if (!selectedCarId && carsRes.cars?.length > 0) {
        onCarChange(carsRes.cars[0].id);
      }
    } catch (err) {
      console.error('Ошибка загрузки журнала:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    const car = cars.find(c => c.id === selectedCarId);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      mileage: String(car?.mileage || ''),
      category: 'to',
      work: '',
      cost: '',
      comment: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCarId) return alert('Выберите автомобиль');
    try {
      await createRecord({
        carId: selectedCarId,
        ...formData,
        mileage: Number(formData.mileage),
        cost: Number(formData.cost) || 0
      });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      alert('Ошибка сохранения записи');
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedCarId) return;
    setQrGenerating(true);
    try {
      const res = await generateServiceQR(selectedCarId);
      if (res.success) {
        setQrToken(res.token);
        setQrCarInfo(res.carInfo);
        setShowQRModal(true);
      }
    } catch (err) {
      alert('Ошибка генерации QR-кода');
    } finally {
      setQrGenerating(false);
    }
  };

  const handleRevokeQR = async () => {
    if (!qrToken) return;
    try {
      await revokeServiceQR(qrToken);
      setShowQRModal(false);
      setQrToken('');
      setQrCarInfo(null);
    } catch (err) {
      alert('Ошибка отмены доступа');
    }
  };

  const inputClass = "w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500";

  if (loading) return <div className="text-center py-10 text-cyan-400 animate-pulse">Загрузка...</div>;

  if (cars.length === 0) {
    return (
      <div className="text-center py-10 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-6">
        <p className="text-gray-400 mb-4">Сначала добавьте автомобиль во вкладке "Авто"</p>
        <button onClick={() => onCarChange(null)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
          Перейти к авто
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-100">Журнал обслуживания</h2>
        <button
          onClick={handleOpenModal}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
        >
          + Добавить запись
        </button>
      </div>

      {/* 🆕 Кнопка генерации QR для сервисмена */}
      <button
        onClick={handleGenerateQR}
        disabled={qrGenerating}
        className="w-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-xl p-4 text-left hover:shadow-lg hover:shadow-purple-500/10 transition-all disabled:opacity-50"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-purple-300 flex items-center gap-2">
              🔑 Показать QR для сервисмена
            </h3>
            <p className="text-xs text-purple-400/80 mt-1">
              Действителен 1 час. Сервисмен сможет внести данные о ТО.
            </p>
          </div>
          <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg text-sm font-medium">
            {qrGenerating ? 'Генерация...' : 'Показать'}
          </span>
        </div>
      </button>

      {records.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">📓</div>
          <p className="text-gray-100 font-medium mb-2">Записей пока нет</p>
          <p className="text-sm text-gray-400 mb-4">
            💡 <strong>Совет:</strong> Вы можете добавлять записи задним числом. Просто укажите прошлую дату и пробег, чтобы перенести историю обслуживания из вашего блокнота.
          </p>
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm font-medium"
          >
            Добавить первую запись
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(rec => (
            <div key={rec.id} className="bg-slate-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-all duration-300">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-gray-100">{getCategoryName(rec.category)}</span>
                <span className="font-semibold text-cyan-400">{rec.cost} ₽</span>
              </div>
              <div className="text-sm text-gray-400 mb-1">
                {new Date(rec.date).toLocaleDateString('ru-RU')} • {rec.mileage} км
              </div>
              {rec.work && <div className="text-sm text-gray-300">{rec.work}</div>}
              {rec.comment && <div className="text-xs text-gray-500 mt-1 italic">"{rec.comment}"</div>}
              
              {/* 🆕 Пометка о том, что запись внесена мастером */}
              {rec.source === 'service_master' && (
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                    🔧 Внесено мастером
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модалка добавления записи */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="font-bold text-gray-100">Новая запись</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-xl transition-colors">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Дата обслуживания</label>
                  <input required type="date" className={inputClass} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Пробег (км)</label>
                  <input required type="number" className={inputClass} value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} placeholder="Напр. 195000" />
                  <p className="text-[10px] text-gray-500 mt-1">Укажите пробег из блокнота на эту дату</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Категория</label>
                <select className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  {CATEGORIES.map(c => <option key={c.key} value={c.key} className="bg-slate-800">{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Выполненные работы</label>
                <textarea required rows={2} className={inputClass} value={formData.work} onChange={e => setFormData({...formData, work: e.target.value})} placeholder="Например: Замена масла и фильтра" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Стоимость (₽)</label>
                <input type="number" className={inputClass} value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Комментарий (необязательно)</label>
                <input className={inputClass} value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})} placeholder="Например: Масло Shell 5W-30" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all mt-2">
                Сохранить запись
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🆕 Модалка с QR-кодом для сервисмена */}
      {showQRModal && qrToken && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <h3 className="text-lg font-bold text-gray-100 mb-2">QR-код для сервисмена</h3>
            {qrCarInfo && (
              <p className="text-sm text-gray-400 mb-4">
                {qrCarInfo.marka} {qrCarInfo.model} {qrCarInfo.gosnomer}
              </p>
            )}
            
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              <QRCodeSVG value={qrToken} size={200} level="H" />
            </div>
            
            <p className="text-xs text-yellow-400 mb-6">
              ⏱️ Действителен 1 час. Не закрывайте это окно до завершения работ.
            </p>
            
            <button
              onClick={handleRevokeQR}
              className="w-full py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/30 transition-all"
            >
              Отменить доступ
            </button>
            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition mt-2"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Journal;