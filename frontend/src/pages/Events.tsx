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
  ticketsCount: number;
}

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gettingTicket, setGettingTicket] = useState<number | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await apiClient.get('/api/events');
      if (response.data.success) {
        setEvents(response.data.events);
      }
    } catch (err: any) {
      setError('Не удалось загрузить мероприятия');
    } finally {
      setLoading(false);
    }
  };

  const handleGetTicket = async (eventId: number) => {
    setGettingTicket(eventId);
    setError('');
    try {
      const response = await apiClient.post('/api/tickets', { eventId });
      if (response.data.success) {
        alert('✅ Билет успешно получен!');
        navigate('/tickets');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Ошибка при получении билета';
      setError(message);
    } finally {
      setGettingTicket(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← На главную
          </button>
          <h1 className="text-xl font-bold text-gray-100">🎟️ Мероприятия</h1>
          <button
            onClick={() => navigate('/tickets')}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition"
          >
            Мои билеты
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">Пока нет доступных мероприятий</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="bg-slate-900 border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-xl font-bold text-gray-100">{event.title}</h2>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                    Активно
                  </span>
                </div>
                {event.description && (
                  <p className="text-gray-400 mb-3">{event.description}</p>
                )}
                <div className="space-y-2 mb-4">
                  {event.location && (
                    <p className="text-sm text-gray-400">📍 {event.location}</p>
                  )}
                  <p className="text-sm text-gray-400">📅 {formatDate(event.eventDate)}</p>
                  <p className="text-sm text-gray-400">👥 Уже получили билет: {event.ticketsCount}</p>
                </div>
                <div className="bg-slate-800/50 border border-white/10 rounded-lg p-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">💰 Кэшбек участнику:</span>
                    <span className="font-bold text-green-400">{event.cashbackAmount} ₽</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">🎁 Бонус рефереру:</span>
                    <span className="font-bold text-cyan-400">{event.referrerBonus} ₽</span>
                  </div>
                </div>
                <button
                  onClick={() => handleGetTicket(event.id)}
                  disabled={gettingTicket === event.id}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold transition ${
                    gettingTicket === event.id
                      ? 'bg-slate-700 text-gray-500 cursor-not-allowed border border-white/10'
                      : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
                  }`}
                >
                  {gettingTicket === event.id ? 'Получение...' : 'Получить билет'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}