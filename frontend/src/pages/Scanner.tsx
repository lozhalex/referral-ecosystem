import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { apiClient } from '../api/client';

export default function Scanner() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    cashback?: { participant: number; referrer: number };
    eventTitle?: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [scanner]);

  const startScanning = async () => {
    setError('');
    setResult(null);
    setScanning(true);
    const html5QrCode = new Html5Qrcode("qr-reader");
    setScanner(html5QrCode);
    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await html5QrCode.stop();
          setScanning(false);
          await handleScan(decodedText);
        },
        () => {
          // Ошибка распознавания — игнорируем
        }
      );
    } catch (err: any) {
      console.error("Camera error:", err);
      setScanning(false);
      let errorMsg = 'Не удалось запустить камеру.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Доступ к камере запрещён. Проверьте настройки браузера.';
      } else if (err.name === 'NotSupportedError' || err.message?.includes('Only secure origins are allowed')) {
        errorMsg = '❌ Камера работает только на сайтах с HTTPS (или localhost). Текущий сайт использует HTTP.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Камера не найдена на этом устройстве.';
      } else {
        errorMsg += ` (${err.name || 'Unknown error'})`;
      }
      setError(errorMsg);
    }
  };

  const stopScanning = async () => {
    if (scanner) {
      await scanner.stop();
      setScanning(false);
    }
  };

  const handleScan = async (qrCode: string) => {
    try {
      const response = await apiClient.post('/api/scanner/scan', {
        qrCode
        // eventId больше не нужен — бэкенд сам определит мероприятие по QR
      });
      if (response.data.success) {
        setResult({
          success: true,
          message: response.data.message,
          cashback: response.data.cashback,
          eventTitle: response.data.event?.title
        });
      } else {
        setResult({
          success: false,
          message: response.data.message
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: err.response?.data?.message || 'Ошибка сканирования'
      });
    }
  };

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
          <h1 className="text-xl font-bold text-gray-100">📷 Сканер</h1>
          <div className="w-20"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-slate-900 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-100 mb-4 text-center">
            Сканирование QR-кода
          </h2>
          <p className="text-sm text-gray-400 text-center mb-4">
            Наведите камеру на QR-код билета. Мероприятие определится автоматически.
          </p>
          {!scanning ? (
            <button
              onClick={startScanning}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition"
            >
              📷 Запустить камеру
            </button>
          ) : (
            <div>
              <div id="qr-reader" className="mb-4"></div>
              <button
                onClick={stopScanning}
                className="w-full py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition border border-white/10"
              >
                Остановить камеру
              </button>
            </div>
          )}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {result && (
            <div className={`mt-4 p-4 rounded-lg ${
              result.success 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <p className={`font-semibold ${
                result.success ? 'text-green-400' : 'text-red-400'
              }`}>
                {result.message}
              </p>
              {result.eventTitle && (
                <p className="text-sm text-gray-400 mt-1">
                  🎟️ Мероприятие: {result.eventTitle}
                </p>
              )}
              {result.cashback && (
                <div className="mt-2 text-sm text-green-400">
                  <p>Кэшбек участнику: {result.cashback.participant} ₽</p>
                  <p>Бонус рефереру: {result.cashback.referrer} ₽</p>
                </div>
              )}
              <button
                onClick={() => {
                  setResult(null);
                  startScanning();
                }}
                className="mt-3 w-full py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition"
              >
                Сканировать следующий
              </button>
            </div>
          )}
        </div>
        <div className="mt-6 bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <h3 className="font-semibold text-cyan-300 mb-2">Инструкция:</h3>
          <ol className="text-sm text-cyan-400 space-y-1 list-decimal list-inside">
            <li>Нажмите "Запустить камеру"</li>
            <li>Наведите камеру на QR-код билета</li>
            <li>Мероприятие определится автоматически</li>
            <li>Дождитесь результата и проверьте бонусы</li>
          </ol>
        </div>
      </div>
    </div>
  );
}