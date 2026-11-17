import { useState } from 'react';
import { apiClient } from '../api/client';

export default function ExportImport() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string>('');

  // Получаем роль пользователя при монтировании
  useState(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || '');
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  });

  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const handleExport = async (type: 'users' | 'cars' | 'events') => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiClient.get(`/api/admin/export/${type}`);
      if (response.data.success) {
        const data = JSON.stringify(response.data, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `export_${type}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setSuccess(`✅ Экспорт ${type} завершён!`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка экспорта');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (type: 'users' | 'cars' | 'events', file: File) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const response = await apiClient.post(`/api/admin/import/${type}`, jsonData);
      if (response.data.success) {
        setSuccess(`✅ ${response.data.message}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка импорта');
    } finally {
      setLoading(false);
    }
  };

  const ExportButton = ({ type, label }: { type: 'users' | 'cars' | 'events'; label: string }) => (
    <button
      onClick={() => handleExport(type)}
      disabled={loading}
      className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/25 transition disabled:opacity-50"
    >
      {loading ? 'Загрузка...' : `📥 Экспорт ${label}`}
    </button>
  );

  const ImportButton = ({ type, label }: { type: 'users' | 'cars' | 'events'; label: string }) => (
    <div className="relative">
      <input
        type="file"
        accept=".json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            if (window.confirm(`⚠️ ВНИМАНИЕ! Импорт ${label} перезапишет существующие данные. Продолжить?`)) {
              handleImport(type, file);
            }
          }
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={!isSuperAdmin || loading}
      />
      <button
        disabled={!isSuperAdmin || loading}
        className={`w-full py-3 rounded-lg font-medium transition ${
          isSuperAdmin
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-500/25'
            : 'bg-slate-800 text-gray-500 cursor-not-allowed border border-white/10'
        }`}
      >
        {loading ? 'Загрузка...' : `📤 Импорт ${label}`}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-100 mb-4">👥 Пользователи</h2>
        <p className="text-sm text-gray-400 mb-4">
          Экспорт: балансы, транзакции, роли, реферальные связи
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExportButton type="users" label="пользователей" />
          <ImportButton type="users" label="пользователей" />
        </div>
        {!isSuperAdmin && (
          <p className="text-xs text-amber-400 mt-2">
            ⚠️ Импорт доступен только SUPER_ADMIN
          </p>
        )}
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-100 mb-4">🚗 Автомобили</h2>
        <p className="text-sm text-gray-400 mb-4">
          Экспорт: данные авто + журнал обслуживания
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExportButton type="cars" label="автомобилей" />
          <ImportButton type="cars" label="автомобилей" />
        </div>
        {!isSuperAdmin && (
          <p className="text-xs text-amber-400 mt-2">
            ⚠️ Импорт доступен только SUPER_ADMIN
          </p>
        )}
      </div>

      <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-100 mb-4">🎟️ Мероприятия</h2>
        <p className="text-sm text-gray-400 mb-4">
          Экспорт: мероприятия + билеты + контролёры
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExportButton type="events" label="мероприятий" />
          <ImportButton type="events" label="мероприятий" />
        </div>
        {!isSuperAdmin && (
          <p className="text-xs text-amber-400 mt-2">
            ⚠️ Импорт доступен только SUPER_ADMIN
          </p>
        )}
      </div>
    </div>
  );
}