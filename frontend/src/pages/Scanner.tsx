import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { apiClient } from '../api/client';

export default function Scanner() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; cashback?: any } | null>(null);
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
    } catch (err) {
      setError('Не удалось запустить камеру. Проверьте разрешения.');
      setScanning(false);
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
        qrCode,
        eventId: 1
      });

      if (response.data.success) {
        setResult({
          success: true,
          message: response.data.message,
          cashback: response.data.cashback
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-blue-600"
          >
            ← На главную
          </button>
          <h1 className="text-xl font-bold text-gray-900">📷 Сканер</h1>
          <div className="w-20"></div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">
            Сканирование QR-кода
          </h2>

          {!scanning ? (
            <button
              onClick={startScanning}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              📷 Запустить камеру
            </button>
          ) : (
            <div>
              <div id="qr-reader" className="mb-4"></div>
              <button
                onClick={stopScanning}
                className="w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Остановить камеру
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {result && (
            <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.message}
              </p>
              {result.cashback && (
                <div className="mt-2 text-sm text-green-700">
                  <p>Кэшбек участнику: {result.cashback.participant} ₽</p>
                  <p>Бонус рефереру: {result.cashback.referrer} ₽</p>
                </div>
              )}
              <button
                onClick={() => {
                  setResult(null);
                  startScanning();
                }}
                className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Сканировать следующий
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Инструкция:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Нажмите "Запустить камеру"</li>
            <li>Наведите камеру на QR-код билета</li>
            <li>Дождитесь результата сканирования</li>
            <li>Проверьте начисленные бонусы</li>
          </ol>
        </div>
      </div>
    </div>
  );
}