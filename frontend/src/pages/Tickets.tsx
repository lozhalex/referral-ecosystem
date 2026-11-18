import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../api/client';
import ShareModal from '../components/ShareModal';

interface Ticket {
  id: number;
  qrCode: string;
  status: string;
  scannedAt: string;
  event: {
    id: number;
    title: string;
    eventDate: string;
    location: string;
  };
}

export default function Tickets() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const userPhone = (() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.phone || '';
    } catch {
      return '';
    }
  })();

  // Определяем активную вкладку по текущему пути
  const isEventsPage = location.pathname === '/events';

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await apiClient.get('/api/tickets/my');
      if (response.data.success) {
        setTickets(response.data.tickets);
      }
    } catch (err: any) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; bg: string; text: string }> = {
      ACTIVE: { label: 'Активен', bg: 'bg-green-500/20', text: 'text-green-300' },
      USED: { label: 'Использован', bg: 'bg-gray-500/20', text: 'text-gray-400' },
      EXPIRED: { label: 'Истёк', bg: 'bg-red-500/20', text: 'text-red-300' },
    };
    const c = config[status] || config.ACTIVE;
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/events')}
              className={`px-3 py-1.5 text-sm rounded-lg transition border ${
                isEventsPage
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'text-gray-400 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              🎟️ Мероприятия
            </button>
            <button
              onClick={() => navigate('/tickets')}
              className={`px-3 py-1.5 text-sm rounded-lg transition border ${
                !isEventsPage
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'text-gray-400 hover:text-white border-white/10 hover:bg-white/5'
              }`}
            >
              🎫 Мои билеты
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="text-xs text-gray-300 hover:text-white transition px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5"
            >
              Пригласить друга
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="text-xs text-gray-300 hover:text-white transition px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5"
            >
              Профиль
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">У вас пока нет билетов</p>
            <button
              onClick={() => navigate('/events')}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition"
            >
              Получить билет
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-slate-900 border border-white/10 rounded-xl p-6 cursor-pointer hover:bg-slate-800/50 transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-bold text-gray-100">{ticket.event.title}</h2>
                  {getStatusBadge(ticket.status)}
                </div>
                <div className="space-y-1 text-sm text-gray-400 mb-4">
                  {ticket.event.location && <p>📍 {ticket.event.location}</p>}
                  <p>📅 {formatDate(ticket.event.eventDate)}</p>
                  {ticket.scannedAt && (
                    <p>✅ Использован: {formatDate(ticket.scannedAt)}</p>
                  )}
                </div>
                <p className="text-xs text-cyan-400">Нажмите, чтобы показать QR-код →</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-100 mb-2">
              {selectedTicket.event.title}
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              {formatDate(selectedTicket.event.eventDate)}
            </p>
            <div className="bg-white p-4 rounded-lg mb-4 inline-block">
              <QRCodeSVG
                value={selectedTicket.qrCode}
                size={200}
                level="H"
              />
            </div>
            <p className="text-xs text-gray-500 mb-4 break-all font-mono">
              {selectedTicket.qrCode}
            </p>
            {selectedTicket.status === 'ACTIVE' ? (
              <p className="text-sm text-green-400 font-medium mb-4">
                ✅ Билет активен. Покажите QR на входе.
              </p>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                Билет уже использован
              </p>
            )}
            <button
              onClick={() => setSelectedTicket(null)}
              className="w-full py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition border border-white/10"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareModal
          moduleId="tickets"
          userPhone={userPhone}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}