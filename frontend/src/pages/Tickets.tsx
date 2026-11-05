import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../api/client';

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

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
      ACTIVE: { label: 'Активен', bg: 'bg-green-100', text: 'text-green-800' },
      USED: { label: 'Использован', bg: 'bg-gray-100', text: 'text-gray-600' },
      EXPIRED: { label: 'Истёк', bg: 'bg-red-100', text: 'text-red-800' },
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-blue-600"
          >
            ← На главную
          </button>
          <h1 className="text-xl font-bold text-gray-900">🎫 Мои билеты</h1>
          <button
            onClick={() => navigate('/events')}
            className="text-sm text-blue-600 hover:underline"
          >
            Мероприятия
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">У вас пока нет билетов</p>
            <button
              onClick={() => navigate('/events')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
                className="bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-bold text-gray-900">{ticket.event.title}</h2>
                  {getStatusBadge(ticket.status)}
                </div>

                <div className="space-y-1 text-sm text-gray-500 mb-4">
                  {ticket.event.location && <p>📍 {ticket.event.location}</p>}
                  <p>📅 {formatDate(ticket.event.eventDate)}</p>
                  {ticket.scannedAt && (
                    <p>✅ Использован: {formatDate(ticket.scannedAt)}</p>
                  )}
                </div>

                <p className="text-xs text-blue-600">Нажмите, чтобы показать QR-код →</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно с QR-кодом */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {selectedTicket.event.title}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {formatDate(selectedTicket.event.eventDate)}
            </p>

            <div className="bg-white p-4 rounded-lg mb-4 inline-block">
              <QRCodeSVG
                value={selectedTicket.qrCode}
                size={200}
                level="H"
              />
            </div>

            <p className="text-xs text-gray-400 mb-4 break-all">
              {selectedTicket.qrCode}
            </p>

            {selectedTicket.status === 'ACTIVE' ? (
              <p className="text-sm text-green-600 font-medium mb-4">
                ✅ Билет активен. Покажите QR на входе.
              </p>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                Билет уже использован
              </p>
            )}

            <button
              onClick={() => setSelectedTicket(null)}
              className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}