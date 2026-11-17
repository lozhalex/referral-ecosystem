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
  isFree: boolean;
  maxTickets: number | null;
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

interface TicketInfo {
  id: number;
  phone: string;
  status: string;
  scannedAt: string | null;
  createdAt: string;
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
    cashbackAmount: 0,
    referrerBonus: 0,
    posterUrl: '',
    isFree: false,
    maxTickets: ''
  });

  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // 🆕 Состояния для вкладки "Билеты"
  const [showTicketsModal, setShowTicketsModal] = useState(false);
  const [ticketsEvent, setTicketsEvent] = useState<Event | null>(null);
  const [ticketsList, setTicketsList] = useState<TicketInfo[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

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
    setFormData({
      title: '',
      description: '',
      location: '',
      eventDate: '',
      cashbackAmount: 0,
      referrerBonus: 0,
      posterUrl: '',
      isFree: false,
      maxTickets: ''
    });
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
      posterUrl: event.posterUrl || '',
      isFree: event.isFree,
      maxTickets: event.maxTickets !== null && event.maxTickets !== undefined ? String(event.maxTickets) : ''
    });
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const submitData = {
        ...formData,
        cashbackAmount: Number(formData.cashbackAmount),
        referrerBonus: Number(formData.referrerBonus),
        maxTickets: formData.maxTickets === '' ? null : Number(formData.maxTickets)
      };
      if (editingEvent) {
        const response = await apiClient.put(`/api/events/${editingEvent.id}`, submitData);
        if (response.data.success) {
          setSuccess('✅ Мероприятие успешно обновлено!');
          setShowForm(false);
          loadData();
        }
      } else {
        const response = await apiClient.post('/api/events', submitData);
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

  // 🆕 Открыть модалку билетов
  const openTicketsModal = async (event: Event) => {
    setTicketsEvent(event);
    setShowTicketsModal(true);
    setTicketsLoading(true);
    try {
      const response = await apiClient.get(`/api/events/${event.id}/tickets`);
      if (response.data.success) {
        setTicketsList(response.data.tickets);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки билетов');
    } finally {
      setTicketsLoading(false);
    }
  };

  // 🆕 Удалить билет (админ)
  const handleDeleteTicket = async (ticketId: number) => {
    if (!ticketsEvent) return;
    if (!confirm('Удалить этот билет? Место будет освобождено.')) return;
    try {
      const response = await apiClient.delete(`/api/events/${ticketsEvent.id}/tickets/${ticketId}`);
      if (response.data.success) {
        setSuccess('✅ Билет удален, место освобождено');
        openTicketsModal(ticketsEvent); // перезагрузить список
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка удаления билета');
    }
  };

  // 🆕 Экспорт CSV
  const handleExportCSV = () => {
    if (!ticketsEvent) return;
    window.open(`/api/events/${ticketsEvent.id}/tickets/export`, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCompleted = (dateString: string) => new Date(dateString) < new Date();

  const filteredEvents = events
    .filter(e => activeTab === 'active' ? !isCompleted(e.eventDate) : isCompleted(e.eventDate))
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  // 🆕 Обработчик переключения "Бесплатное" — автообнуление полей
  const handleIsFreeChange = (checked: boolean) => {
    setFormData({
      ...formData,
      isFree: checked,
      cashbackAmount: checked ? 0 : formData.cashbackAmount,
      referrerBonus: checked ? 0 : formData.referrerBonus
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-gray-400">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900/60 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/admin')} className="text-sm text-gray-400 hover:text-white transition">
            ← В админ-панель
          </button>
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
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${
                activeTab === 'active'
                  ? 'bg-slate-800 text-cyan-400 border-t border-l border-r border-white/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
              }`}
            >
              🔥 Активные ({events.filter(e => !isCompleted(e.eventDate)).length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${
                activeTab === 'completed'
                  ? 'bg-slate-800 text-cyan-400 border-t border-l border-r border-white/10'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
              }`}
            >
              📦 Завершённые ({events.filter(e => isCompleted(e.eventDate)).length})
            </button>
          </div>
          <button
            onClick={openCreateForm}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition"
          >
            + Создать мероприятие
          </button>
        </div>

        {showForm && (
          <div className="bg-slate-900 border border-white/10 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-100 mb-4">
              {editingEvent ? 'Редактирование мероприятия' : 'Новое мероприятие'}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Название *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Дата и время *</label>
                  <input
                    type="datetime-local"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Место проведения</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Кэшбек (₽)</label>
                  <input
                    type="number"
                    value={formData.cashbackAmount}
                    onChange={(e) => setFormData({ ...formData, cashbackAmount: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Бонус рефереру (₽)</label>
                  <input
                    type="number"
                    value={formData.referrerBonus}
                    onChange={(e) => setFormData({ ...formData, referrerBonus: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    min="0"
                  />
                </div>
              </div>

              {/* 🆕 Блок "Бесплатное" + "Макс. мест" */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/30 border border-white/5 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={formData.isFree}
                    onChange={(e) => handleIsFreeChange(e.target.checked)}
                    className="w-5 h-5 accent-purple-600"
                  />
                  <label htmlFor="isFree" className="text-sm font-medium text-gray-300 cursor-pointer">
                    🆓 Бесплатное мероприятие
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Макс. количество мест (0 или пусто = безлимит)
                  </label>
                  <input
                    type="number"
                    value={formData.maxTickets}
                    onChange={(e) => setFormData({ ...formData, maxTickets: e.target.value })}
                    placeholder="Безлимит"
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">URL афиши (необязательно)</label>
                <input
                  type="url"
                  value={formData.posterUrl}
                  onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                  placeholder="https://example.com/poster.jpg"
                  className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 outline-none"
                />
                {formData.posterUrl && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Предпросмотр:</p>
                    <img
                      src={formData.posterUrl}
                      alt="Preview"
                      className="h-32 w-auto rounded-lg border border-white/10 object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition border border-white/10"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition"
                >
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
            {filteredEvents.map(event => {
              // 🆕 SOLD OUT: места закончились
              const isSoldOut = event.maxTickets !== null && event.maxTickets !== undefined && event.maxTickets <= 0;
              const remaining = event.maxTickets !== null && event.maxTickets !== undefined
                ? event.maxTickets
                : null;
              return (
                <div
                  key={event.id}
                  className="bg-slate-900 border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all group flex flex-col relative"
                >
                  {isSoldOut && (
                    <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-red-500/80 text-white text-xs font-bold rounded-lg border border-red-400/50">
                      SOLD OUT
                    </div>
                  )}
                  <div className="aspect-[2/3] w-full relative bg-slate-800">
                    {event.posterUrl ? (
                      <img
                        src={event.posterUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-cyan-600 ${
                        event.posterUrl ? 'hidden' : ''
                      }`}
                    >
                      <span className="text-white font-bold text-center px-2 text-sm">{event.title}</span>
                    </div>
                    <button
                      onClick={() => openEditForm(event)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-black/70"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-100 text-sm mb-1 line-clamp-2">{event.title}</h3>
                    <p className="text-xs text-gray-400 mb-1">📍 {event.location || 'Не указано'}</p>
                    <p className="text-xs text-cyan-400 mb-2">📅 {formatDate(event.eventDate)}</p>
                    {/* 🆕 Инфо о местах */}
                    {remaining !== null && (
                      <p className={`text-xs mb-2 font-medium ${isSoldOut ? 'text-red-400' : 'text-green-400'}`}>
                        {isSoldOut ? '❌ Мест нет' : `🎫 Осталось: ${remaining}`}
                      </p>
                    )}
                    {event.isFree && (
                      <p className="text-xs text-green-400 mb-2">🆓 Бесплатно</p>
                    )}
                    <div className="mt-auto pt-2 border-t border-white/5 space-y-1.5">
                      <button
                        onClick={() => setSelectedEventId(event.id)}
                        className="w-full py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition border border-purple-500/30"
                      >
                        👮 Контролёры ({event.controllersCount})
                      </button>
                      {/* 🆕 Кнопка "Билеты" */}
                      <button
                        onClick={() => openTicketsModal(event)}
                        className="w-full py-1.5 text-xs bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition border border-cyan-500/30"
                      >
                        🎫 Билеты ({event.ticketsCount})
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модалка управления контролёрами */}
      {selectedEventId !== null && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedEventId(null);
            setSelectedUserId(null);
          }}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-100 mb-4">Управление контролёрами</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">Назначенные контролёры:</label>
              <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                {events.find(e => e.id === selectedEventId)?.controllers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Пока никто не назначен</p>
                ) : (
                  events
                    .find(e => e.id === selectedEventId)
                    ?.controllers.map(ctrl => (
                      <div
                        key={ctrl.id}
                        className="flex items-center justify-between bg-slate-800/50 border border-white/10 rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-300">{ctrl.user.phone}</span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              ctrl.user.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-300'
                                : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {ctrl.user.role === 'admin' ? 'Админ' : 'Контролёр'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveController(selectedEventId, ctrl.user.id)}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition"
                        >
                          ❌ Убрать
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
            <div className="border-t border-white/10 pt-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">Добавить нового:</label>
              <div className="max-h-40 overflow-y-auto space-y-2 mb-4">
                {users.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      selectedUserId === user.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-300">{user.phone}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-300'
                            : user.role === 'controller'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {user.role === 'admin' ? 'Админ' : user.role === 'controller' ? 'Контролёр' : 'Пользователь'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAssignController}
                  disabled={!selectedUserId}
                  className={`flex-1 py-2 rounded-lg font-medium transition ${
                    selectedUserId
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:shadow-lg'
                      : 'bg-slate-800 text-gray-500 cursor-not-allowed border border-white/10'
                  }`}
                >
                  Назначить
                </button>
                <button
                  onClick={() => {
                    setSelectedEventId(null);
                    setSelectedUserId(null);
                  }}
                  className="flex-1 py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition border border-white/10"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Модалка "Билеты мероприятия" */}
      {showTicketsModal && ticketsEvent && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowTicketsModal(false)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-100">🎫 Билеты: {ticketsEvent.title}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {ticketsEvent.maxTickets !== null && ticketsEvent.maxTickets !== undefined
                    ? `Мест: ${ticketsEvent.maxTickets} / Всего билетов: ${ticketsList.length}`
                    : `Безлимит. Всего билетов: ${ticketsList.length}`}
                </p>
              </div>
              <button
                onClick={() => setShowTicketsModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {ticketsLoading ? (
              <p className="text-gray-400 text-center py-8">Загрузка...</p>
            ) : ticketsList.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Пока никто не получил билет</p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {ticketsList.map(ticket => (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between bg-slate-800/50 border border-white/10 rounded-lg p-3"
                    >
                      <div className="flex-1">
                        <p className="font-mono text-sm text-gray-200">{ticket.phone}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Получен: {new Date(ticket.createdAt).toLocaleString('ru-RU')}
                          {ticket.scannedAt && ` • Использован: ${new Date(ticket.scannedAt).toLocaleString('ru-RU')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            ticket.status === 'ACTIVE'
                              ? 'bg-green-500/20 text-green-300'
                              : ticket.status === 'USED'
                              ? 'bg-gray-500/20 text-gray-400'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {ticket.status === 'ACTIVE' ? 'Активен' : ticket.status === 'USED' ? 'Использован' : ticket.status}
                        </span>
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition"
                          title="Удалить билет (место освободится)"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleExportCSV}
                  className="w-full py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-green-500/25 transition flex items-center justify-center gap-2"
                >
                  📥 Скачать список участников (CSV)
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}