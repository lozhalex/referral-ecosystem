import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import ShareModal from '../components/ShareModal';

interface Event {
  id: number;
  title: string;
  description: string;
  location: string;
  eventDate: string;
  cashbackAmount: number;
  referrerBonus: number;
  posterUrl: string | null;
  isFree: boolean;
  maxTickets: number | null;
  ticketsCount: number;
}

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gettingTicket, setGettingTicket] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const userPhone = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.phone || '';
    } catch {
      return '';
    }
  })();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await apiClient.get('/api/events');
      if (response.data.success) {
        const now = new Date();
        const upcoming = response.data.events
          .filter((e: Event) => new Date(e.eventDate) >= now)
          .sort((a: Event, b: Event) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
          .slice(0, 8);
        setEvents(upcoming);
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
        setSelectedEvent(null);
        navigate('/tickets');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при получении билета');
    } finally {
      setGettingTicket(null);
    }
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-2">
          <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white transition">
            ← На главную
          </button>
          <h1 className="text-xl font-bold text-gray-100">🎟️ Мероприятия</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="text-sm text-gray-300 hover:text-white transition px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
            >
              Пригласить друга
            </button>
            <button onClick={() => navigate('/tickets')} className="text-sm text-cyan-400 hover:text-cyan-300 transition">
              Мои билеты
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300">✕</button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">Пока нет доступных мероприятий</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition"
            >
              На главную
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {events.map(event => {
              // 🔧 ИСПРАВЛЕНО: maxTickets = 0 означает безлимит, SOLD OUT только когда ticketsCount >= maxTickets
              const isSoldOut = event.maxTickets !== null && event.maxTickets !== undefined && event.maxTickets > 0 && event.ticketsCount >= event.maxTickets;
              const remaining = event.maxTickets !== null && event.maxTickets !== undefined && event.maxTickets > 0
                ? event.maxTickets - event.ticketsCount
                : null;
              return (
                <div
                  key={event.id}
                  onClick={() => !isSoldOut && setSelectedEvent(event)}
                  className={`bg-slate-900 border border-white/10 rounded-xl overflow-hidden transition-all group flex flex-col relative ${
                    isSoldOut ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-cyan-500/30'
                  }`}
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
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-100 text-sm mb-1 line-clamp-2">{event.title}</h3>
                    <p className="text-xs text-gray-400 mb-1">📍 {event.location || 'Не указано'}</p>
                    <p className="text-xs text-cyan-400 mb-2">📅 {formatDate(event.eventDate)}</p>
                    {remaining !== null && (
                      <p className={`text-xs font-medium ${isSoldOut ? 'text-red-400' : 'text-green-400'}`}>
                        {isSoldOut ? '❌ Мест нет' : `🎫 Осталось: ${remaining}`}
                      </p>
                    )}
                    {event.isFree && (
                      <p className="text-xs text-green-400">🆓 Бесплатно</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full relative bg-slate-800 max-h-[60vh] flex items-center justify-center">
              {selectedEvent.posterUrl ? (
                <img
                  src={selectedEvent.posterUrl}
                  alt={selectedEvent.title}
                  className="w-full max-h-[60vh] object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div
                className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-cyan-600 ${
                  selectedEvent.posterUrl ? 'hidden' : ''
                }`}
              >
                <span className="text-white font-bold text-center px-4">{selectedEvent.title}</span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <h2 className="text-2xl font-bold text-gray-100">{selectedEvent.title}</h2>

              <div className="space-y-2 text-sm">
                {selectedEvent.location && <p className="text-gray-300">📍 {selectedEvent.location}</p>}
                <p className="text-gray-300">📅 {formatDate(selectedEvent.eventDate)}</p>
              </div>

              {/* 🔧 ИСПРАВЛЕНО: показываем счётчик только если maxTickets > 0 */}
              {selectedEvent.maxTickets !== null && selectedEvent.maxTickets !== undefined && selectedEvent.maxTickets > 0 && (
                <div className={`p-3 rounded-lg border ${
                  selectedEvent.ticketsCount >= selectedEvent.maxTickets
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-cyan-500/10 border-cyan-500/30'
                }`}>
                  <p className={`text-sm font-medium ${
                    selectedEvent.ticketsCount >= selectedEvent.maxTickets ? 'text-red-400' : 'text-cyan-400'
                  }`}>
                    {selectedEvent.ticketsCount >= selectedEvent.maxTickets
                      ? '❌ Места закончились'
                      : `🎫 Осталось мест: ${selectedEvent.maxTickets - selectedEvent.ticketsCount}`}
                  </p>
                </div>
              )}

              {selectedEvent.isFree && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm font-medium text-green-400">🆓 Бесплатное мероприятие</p>
                </div>
              )}

              {selectedEvent.description && (
                <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">💰 Кэшбек участнику:</span>
                  <span className="font-bold text-green-400">{selectedEvent.cashbackAmount} ₽</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">🎁 Бонус рефереру:</span>
                  <span className="font-bold text-cyan-400">{selectedEvent.referrerBonus} ₽</span>
                </div>
              </div>

              {/* 🔧 ИСПРАВЛЕНО: блокировка кнопки только если maxTickets > 0 и места закончились */}
              {selectedEvent.maxTickets !== null && selectedEvent.maxTickets !== undefined && selectedEvent.maxTickets > 0 && selectedEvent.ticketsCount >= selectedEvent.maxTickets ? (
                <button
                  disabled
                  className="w-full py-3 bg-slate-700 text-gray-500 rounded-lg font-semibold cursor-not-allowed border border-white/10"
                >
                  ❌ Места закончились
                </button>
              ) : (
                <button
                  onClick={() => handleGetTicket(selectedEvent.id)}
                  disabled={gettingTicket === selectedEvent.id}
                  className={`w-full py-3 rounded-lg font-semibold transition ${
                    gettingTicket === selectedEvent.id
                      ? 'bg-slate-700 text-gray-500 cursor-not-allowed border border-white/10'
                      : 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
                  }`}
                >
                  {gettingTicket === selectedEvent.id ? 'Получение...' : 'Получить билет'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareModal
          moduleId="events"
          userPhone={userPhone}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}