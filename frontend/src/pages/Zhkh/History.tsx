import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

const RESOURCE_NAMES: Record<string, string> = {
  HWS: 'Холодная вода',
  GWS: 'Горячая вода',
  DRINKING_WATER: 'Питьевая вода',
  ELECTRICITY: 'Электроэнергия',
  GAS: 'Газ',
  HEAT: 'Тепло',
};

export default function History() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [copied, setCopied] = useState(false);

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
    const filtered = filterType === 'all' 
      ? history 
      : history.filter(h => h.meter.type === filterType);

    // Группируем по периоду
    const byPeriod = filtered.reduce((acc: any, item: any) => {
      if (!acc[item.periodKey]) acc[item.periodKey] = [];
      acc[item.periodKey].push(item);
      return acc;
    }, {});

    const lines: string[] = [];
    
    Object.keys(byPeriod)
      .sort()
      .reverse()
      .forEach(period => {
        lines.push(`📅 Период: ${period}`);
        lines.push('─'.repeat(40));
        
        byPeriod[period].forEach((item: any) => {
          const meter = item.meter;
          const resourceName = RESOURCE_NAMES[meter.type] || meter.type;
          
          lines.push(`Тип: ${resourceName}`);
          lines.push(`Номер счетчика: ${meter.serialNumber}`);
          lines.push(`Комментарий: ${meter.comment}`);
          lines.push(`Текущие показания: ${item.t1}`);
          
          if (meter.tariffType === 'TWO_TARIFF' || meter.tariffType === 'THREE_TARIFF') {
            if (item.t2) lines.push(`  Тариф 2 (ночь): ${item.t2}`);
            if (item.t3) lines.push(`  Тариф 3 (полупик): ${item.t3}`);
          }
          
          lines.push(''); // пустая строка между счетчиками
        });
        
        lines.push(''); // пустая строка между периодами
      });

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    apiClient.post('/api/meters/report-exported').catch(() => {});
  };

  if (loading) return <div className="text-center text-slate-400 py-10">Загрузка...</div>;

  const filteredHistory = filterType === 'all' 
    ? history 
    : history.filter(h => h.meter.type === filterType);

  return (
    <div className="space-y-4 pb-20">
      <div className="sticky top-0 bg-dark-900/95 backdrop-blur-md z-10 py-2 space-y-2">
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
        >
          <option value="all">Все ресурсы</option>
          <option value="HWS">Холодная вода</option>
          <option value="GWS">Горячая вода</option>
          <option value="DRINKING_WATER">Питьевая вода</option>
          <option value="ELECTRICITY">Электричество</option>
          <option value="GAS">Газ</option>
          <option value="HEAT">Тепло</option>
        </select>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center text-slate-500 py-10">История пока пуста</div>
      ) : (
        filteredHistory.map((item: any, idx: number) => (
          <div key={idx} className="glass rounded-xl p-4 border border-white/5">
            <div className="text-sm text-slate-400 mb-2">{item.periodKey}</div>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium text-white">{item.meter.comment}</div>
                <div className="text-xs text-slate-500">{RESOURCE_NAMES[item.meter.type]} · №{item.meter.serialNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-neon-cyan font-mono text-lg">{item.t1}</div>
                <div className="text-xs text-slate-500">
                  было {item.prevT1} → расход {(item.t1 - item.prevT1).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="sticky bottom-20 pt-4">
        <button 
          onClick={copyForUK}
          className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
            copied 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
        >
          {copied ? '✅ Скопировано!' : '📥 Скопировать для УК'}
        </button>
      </div>
    </div>
  );
}