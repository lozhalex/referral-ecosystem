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
  posterUrl: string | null;
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
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    eventDate: '',
    cashbackAmount: 50,
    referrerBonus: 100,
    posterUrl: ''
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

  const openCreateForm = () => {
    setEditingEvent(null);
    setFormData({ title: '', description: '', location: '', eventDate: '', cashbackAmount: 50, referrerBonus: 100, posterUrl: '' });
    setShowForm(true);
  };

  const openEditForm = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      eventDate: new Date(event.eventDate).toISOString().slice(0, 16),
      cashbackAmount: event.cashbackAmount,
      referrerBonus: event.referrerBonus,
      posterUrl: event.posterUrl || ''
    });
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingEvent) {
        const response = await apiClient.put(`/api/events/${editingEvent.id}`, formData);
        if (response.data.success) {
          setSuccess('✅ Мероприятие успешно обновлено!');
          setShowForm(false);
          loadData();
        }
      } else {
        const response = await apiClient.post('/api/events', formData);
        if (response.data.success) {
          setSuccess('✅ Мероприятие успешно создано!');
          setShowForm(false);
          loadData();
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleAssignController = async () => {
    if (!selectedEventId || !selectedUserId) {
      setError('Выберите мероприятие и пользователя');
      return;
    }
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
    return new Date(dateString).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isCompleted = (dateString: string) => new Date(dateString) < new Date();

  const filteredEvents = events
    .filter(e => activeTab === 'active' ? !isCompleted(e.eventDate) : isCompleted(e.eventDate))
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><p className="text-gray-400">Загрузка...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900/60 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/admin')} className="text-sm text-gray-400 hover:text-white transition">← В админ-панель</button>
          <h1 className="text-xl font-bold text-gray-100">🎟️ Управление мероприятиями</h1>
          <div className="w-32"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-6 flex justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-300">✕</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex border-b border-white/10">
            <button onClick={() => setActiveTab('active')} className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${activeTab === 'active' ? 'bg-slate-800 text-cyan-400 border-t border-l border-r border-white/10' : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'}`}>
              🔥 Активные ({events.filter(e => !isCompleted(e.eventDate)).length})
            </button>
            <button onClick={() => setActiveTab('completed')} className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${activeTab === 'completed' ? 'bg-slate-800 text-cyan-400 border-t border-l border-r border-white/10' : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'}`}>
              📦 Завершённые ({events.filter(e => isCompleted(e.eventDate)).length})
            </button>
          </div>
          <button onClick={openCreateForm} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition">
            + Создать мероприятие
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-100 mb-4">{editingEvent ? 'Редактирование мероприятия' : 'Новое мероприятие'}</h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Название *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Дата и время *</label>
                  <input type="datetime-local" value={formData.eventDate} onChange={(e) => setFormData({...formData, eventDate: e.target.value})} className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Описание</label>
                <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Место проведения</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Кэшбек (₽)</label>
                  <input type="number" value={formData.cashbackAmount} onChange={(e) => setFormData({...formData, cashbackAmount: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Бонус рефереру (₽)</label>
                  <input type="number" value={formData.referrerBonus} onChange={(e) => setFormData({...formData, referrerBonus: Number(e.target.value)})} className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" min="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">URL афиши (необязательно)</label>
                <input type="url" value={formData.posterUrl} onChange={(e) => setFormData({...formData, posterUrl: e.target.value})} placeholder="https://example.com/poster.jpg" className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none" />
                {formData.posterUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Предпросмотр:</p>
                    <img src={formData.posterUrl} alt="Preview" className="h-32 w-auto rounded-lg border border-white/10 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition border border-white/10">Отмена</button>
                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition">
                  {editingEvent ? 'Сохранить изменения' : 'Создать мероприятие'}
                </button>
              </div>
            </form>
          </div>
        )}

        {filteredEvents.length === 0 ? (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-8 text-center">
            <p className="text-gray-400">В этой категории пока нет мероприятий</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filteredEvents.map(event => (
              <div key={event.id} className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all group flex flex-col">
                <div className="aspect-[2/3] w-full relative bg-slate-800">
                  {event.posterUrl ? (
                    <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                  ) : null}
                  <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-cyan-600 ${event.posterUrl ? 'hidden' : ''}`}>
                    <span className="text-white font-bold text-center px-2 text-sm">{event.title}</span>
                  </div>
                  <button onClick={() => openEditForm(event)} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-black/70" title="Редактировать">
                    ✏️
                  </button>
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-100 text-sm mb-1 line-clamp-2">{event.title}</h3>
                  <p className="text-xs text-gray-400 mb-1">📍 {event.location || 'Не указано'}</p>
                  <p className="text-xs text-cyan-400 mb-3">📅 {formatDate(event.eventDate)}</p>
                  <div className="mt-auto pt-2 border-t border-white/5">
                    <button onClick={() => setSelectedEventId(event.id)} className="w-full py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition border border-purple-500/30">
                      👮 Контролёры ({event.controllersCount})
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEventId !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setSelectedEventId(null); setSelectedUserId(null); }}>
          <div className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-100 mb-4">Назначить контролёра</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">Выберите пользователя:</label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {users.map(user => (
                  <div key={user.id} onClick={() => setSelectedUserId(user.id)} className={`p-3 border rounded-lg cursor-pointer transition ${selectedUserId === user.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-300">{user.phone}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-300' : user.role === 'controller' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-500/20 text-gray-400'}`}>
                        {user.role === 'admin' ? 'Админ' : user.role === 'controller' ? 'Контролёр' : 'Пользователь'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAssignController} disabled={!selectedUserId} className={`flex-1 py-2 rounded-lg font-medium transition ${selectedUserId ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:shadow-lg' : 'bg-slate-800 text-gray-500 cursor-not-allowed border border-white/10'}`}>Назначить</button>
              <button onClick={() => { setSelectedEventId(null); setSelectedUserId(null); }} className="flex-1 py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition border border-white/10">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}