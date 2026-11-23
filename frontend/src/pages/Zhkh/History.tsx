import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

export default function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await apiClient.get('/api/meters/history');
      if (res.data.success) {
        setHistory(res.data.readings);
      }
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyForUK = () => {
    const text = history.map((h: any) => 
      `${h.meter.comment}: было ${h.prevT1}, стало ${h.t1}, расход ${h.t1 - h.prevT1}`
    ).join('\n');
    navigator.clipboard.writeText(text);
    alert('Скопировано в буфер обмена!');
    apiClient.post('/api/meters/report-exported').catch(() => {}); // Пинг ачивки
  };

  if (loading) return <div className="text-center text-slate-400 py-10">Загрузка...</div>;

  return (
    <div className="space-y-4 pb-20">
      <div className="sticky top-0 bg-dark-900/95 backdrop-blur-md z-10 py-2">
        <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none">
          <option value="all">Все ресурсы</option>
          <option value="HWS">Холодная вода</option>
          <option value="GWS">Горячая вода</option>
          <option value="ELECTRICITY">Электричество</option>
        </select>
      </div>

      {history.length === 0 ? (
        <div className="text-center text-slate-500 py-10">История пока пуста</div>
      ) : (
        history.map((item: any, idx: number) => (
          <div key={idx} className="glass rounded-xl p-4 border border-white/5">
            <div className="text-sm text-slate-400 mb-2">{item.periodKey}</div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-white">{item.meter.comment}</span>
              <span className="text-neon-cyan font-mono">
                {item.prevT1} → {item.t1} <span className="text-slate-500 text-sm">({(item.t1 - item.prevT1).toFixed(1)})</span>
              </span>
            </div>
          </div>
        ))
      )}

      <div className="sticky bottom-20 pt-4">
        <button 
          onClick={copyForUK}
          className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
        >
          📥 Скопировать данные для УК
        </button>
      </div>
    </div>
  );
}