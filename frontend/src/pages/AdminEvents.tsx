import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  cashbackAmount: number;
  referrerBonus: number;
  isActive: boolean;
  ticketsCount: number;
  controllersCount: number;
  controllers: {
    id: number;
    user: { id: number; phone: string; role: string };
  }[];
}

interface User {
  id: number;
  phone: string;
  role: string;
}

export default function AdminEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    eventDate: '',
    cashbackAmount: 50,
    referrerBonus: 100
  });

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [eventsRes, usersRes] = await Promise.all([
        apiClient.get('/api/events'),
        apiClient.get('/api/admin/users')
      ]);

      if (eventsRes.data.success) setEvents(eventsRes.data.events);
      if (usersRes.data.success) setUsers(usersRes.data.users);
    } catch (err: any) {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.post('/api/events', newEvent);
      if (response.data.success) {
        setSuccess('✅ Мероприятие успешно создано!');
        setShowCreateForm(false);
        setNewEvent({ title: '', description: '', location: '', eventDate: '', cashbackAmount: 50, referrerBonus: 100 });
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при создании мероприятия');
    }
  };

  const handleAssignController = async () => {
    if (!selectedEventId || !selectedUserId) {
      setError('Выберите мероприятие и пользователя');
      return;
    }
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.post(`/api/events/${selectedEventId}/controllers`, { userId: selectedUserId });
      if (response.data.success) {
        setSuccess('✅ Контролёр успешно назначен!');
        setSelectedEventId(null);
        setSelectedUserId(null);
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при назначении контролёра');
    }
  };

  const handleRemoveController = async (eventId: number, userId: number) => {
    if (!confirm('Убрать этого контролёра с мероприятия?')) return;
    
    try {
      const response = await apiClient.delete(`/api/events/${eventId}/controllers/${userId}`);
      if (response.data.success) {
        setSuccess('✅ Контролёр успешно удален!');
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при удалении контролёра');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-500">Загрузка...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/admin')} className="text-sm text-gray-600 hover:text-blue-600">← В админ-панель</button>
          <h1 className="text-xl font-bold text-gray-900">🎟️ Управление мероприятиями</h1>
          <div className="w-32"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">✕</button>
          </div>
        )}

        <div className="mb-6">
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
            {showCreateForm ? '✕ Отменить' : '+ Создать мероприятие'}
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Новое мероприятие</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Место проведения</label>
                <input type="text" value={newEvent.location} onChange={(e) => setNewEvent({...newEvent, location: e.target.value})} placeholder="Москва, м. Арбатская" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата и время *</label>
                <input type="datetime-local" value={newEvent.eventDate} onChange={(e) => setNewEvent({...newEvent, eventDate: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Кэшбек участнику (₽)</label>
                  <input type="number" value={newEvent.cashbackAmount} onChange={(e) => setNewEvent({...newEvent, cashbackAmount: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Бонус рефереру (₽)</label>
                  <input type="number" value={newEvent.referrerBonus} onChange={(e) => setNewEvent({...newEvent, referrerBonus: Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" min="0" />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition">Создать мероприятие</button>
            </form>
          </div>
        )}

        <h2 className="text-lg font-bold text-gray-900 mb-4">Активные мероприятия ({events.length})</h2>
        
        {events.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center"><p className="text-gray-500">Пока нет созданных мероприятий</p></div>
        ) : (
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Активно</span>
                </div>

                {event.description && <p className="text-gray-600 mb-3">{event.description}</p>}

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  {event.location && <div><span className="text-gray-500">📍 Место:</span><span className="ml-2 text-gray-900">{event.location}</span></div>}
                  <div><span className="text-gray-500">📅 Дата:</span><span className="ml-2 text-gray-900">{formatDate(event.eventDate)}</span></div>
                  <div><span className="text-gray-500">💰 Кэшбек:</span><span className="ml-2 font-semibold text-green-700">{event.cashbackAmount} ₽</span></div>
                  <div><span className="text-gray-500">🎁 Бонус рефереру:</span><span className="ml-2 font-semibold text-blue-700">{event.referrerBonus} ₽</span></div>
                  <div><span className="text-gray-500">👥 Билетов выдано:</span><span className="ml-2 text-gray-900">{event.ticketsCount}</span></div>
                </div>

                {/* 🆕 Список назначенных контролеров */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">👮 Назначенные контролёры ({event.controllers.length}):</p>
                  {event.controllers.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Пока никто не назначен</p>
                  ) : (
                    <div className="space-y-2">
                      {event.controllers.map(ctrl => (
                        <div key={ctrl.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{ctrl.user.phone}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ctrl.user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                              {ctrl.user.role === 'admin' ? 'Админ' : 'Контролёр'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveController(event.id, ctrl.user.id)}
                            className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition"
                          >
                            ❌ Убрать
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedEventId(event.id)}
                  className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
                >
                  + Назначить контролёра
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно назначения контролёра (без изменений) */}
      {selectedEventId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedEventId(null); setSelectedUserId(null); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Назначить контролёра</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Выберите пользователя:</label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {users.map(user => (
                  <div key={user.id} onClick={() => setSelectedUserId(user.id)} className={`p-3 border rounded-lg cursor-pointer transition ${selectedUserId === user.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{user.phone}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'controller' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role === 'admin' ? 'Админ' : user.role === 'controller' ? 'Контролёр' : 'Пользователь'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAssignController} disabled={!selectedUserId} className={`flex-1 py-2 rounded-lg font-medium transition ${selectedUserId ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Назначить</button>
              <button onClick={() => { setSelectedEventId(null); setSelectedUserId(null); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}