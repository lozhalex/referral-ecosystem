import { useState } from 'react';
import { getShareTexts, getReferralLink } from '../data/shareTexts';
import { useToast } from '../hooks/useToast';

interface ShareModalProps {
  moduleId: string;
  userPhone: string;
  onClose: () => void;
}

export default function ShareModal({ moduleId, userPhone, onClose }: ShareModalProps) {
  const { success, error: showError } = useToast();
  const moduleTexts = getShareTexts(moduleId);
  const referralLink = getReferralLink(moduleId, userPhone);

  const [selectedTextId, setSelectedTextId] = useState(moduleTexts?.texts[0]?.id || '');
  const [customText, setCustomText] = useState('');

  if (!moduleTexts) {
    return null;
  }

  const selectedText = moduleTexts.texts.find(t => t.id === selectedTextId);
  const finalText = customText || selectedText?.text.replace('{link}', referralLink) || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalText);
      success('Текст и ссылка скопированы!');
    } catch (err) {
      showError('Не удалось скопировать');
    }
  };

  const handleShareTelegram = () => {
    const encodedText = encodeURIComponent(finalText);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodedText}`, '_blank');
  };

  const handleShareWhatsApp = () => {
    const encodedText = encodeURIComponent(finalText);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
          <h3 className="font-bold text-gray-100 text-lg">
            Поделиться: {moduleTexts.moduleName}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Выбор текста */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Выберите текст для рассылки:
            </label>
            <div className="space-y-2">
              {moduleTexts.texts.map(text => (
                <button
                  key={text.id}
                  onClick={() => {
                    setSelectedTextId(text.id);
                    setCustomText('');
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTextId === text.id
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-xs text-gray-400 mb-1">
                    {text.tone === 'rational' ? '📊 Рациональный' : text.tone === 'emotional' ? '💬 От друга' : '⚡ Короткий'}
                  </div>
                  <div className="text-sm line-clamp-2">{text.text.replace('{link}', '...')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Редактирование текста */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Текст для копирования (можно отредактировать):
            </label>
            <textarea
              value={finalText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500 text-sm resize-none"
              placeholder="Ваш текст с реферальной ссылкой..."
            />
          </div>

          {/* Кнопки действий */}
          <div className="space-y-3">
            <button
              onClick={handleCopy}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              📋 Скопировать текст и ссылку
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShareTelegram}
                className="py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-medium hover:bg-blue-500/30 transition-all"
              >
                ✈️ Telegram
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg font-medium hover:bg-green-500/30 transition-all"
              >
                💬 WhatsApp
              </button>
            </div>
          </div>

          {/* Превью ссылки */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Ваша реферальная ссылка:</div>
            <div className="text-sm text-cyan-400 font-mono break-all">{referralLink}</div>
          </div>
        </div>
      </div>
    </div>
  );
}