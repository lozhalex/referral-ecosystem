import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';

const ROOT_PHONE_DIGITS = '79503278027';

const formatPhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7')) digits = '7' + digits;
  digits = digits.slice(0, 11);
  const rest = digits.slice(1);
  let out = '+7';
  if (rest.length > 0) out += ' (' + rest.slice(0, 3);
  if (rest.length >= 3) out += ')';
  if (rest.length > 3) out += ' ' + rest.slice(3, 6);
  if (rest.length > 6) out += '-' + rest.slice(6, 8);
  if (rest.length > 8) out += '-' + rest.slice(8, 10);
  return out;
};

const digitsOf = (value: string): string => {
  let d = value.replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (d && !d.startsWith('7')) d = '7' + d;
  return d.slice(0, 11);
};

const Register: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 🆕 Читаем ref из URL ИЛИ из localStorage (глобальный перехват из App.tsx)
  const refFromUrl = digitsOf(searchParams.get('ref') || '');
  const refFromStorage = digitsOf(localStorage.getItem('referral_phone') || '');
  const refValue = refFromUrl || refFromStorage;

  // Блокируем поле ТОЛЬКО если ref пришёл из URL (прямая ссылка)
  const isRefLocked = refFromUrl.length === 11;

  const [phone, setPhone] = useState('');
  const [referredBy, setReferredBy] = useState(
    refValue.length === 11 ? formatPhone(refValue) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReferrerModal, setShowReferrerModal] = useState(false);
  const referrerInputRef = useRef<HTMLInputElement>(null);

  // Синхронизация: если ref пришёл из localStorage (не из URL), но поле пустое — подставляем
  useEffect(() => {
    if (!isRefLocked && refValue.length === 11 && !referredBy) {
      setReferredBy(formatPhone(refValue));
    }
  }, [refValue, isRefLocked, referredBy]);

  const submitRegistration = async (referrerDigits: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.post('/api/auth/register', {
        phone: '+' + digitsOf(phone),
        referred_by_phone: '+' + referrerDigits,
      });
      if (response.data.success) {
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        // 🆕 Очищаем реферальный след после успешной регистрации
        localStorage.removeItem('referral_phone');
        alert('✅ Регистрация успешна!\nВаш временный пароль: 1234');
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin');
          navigate(redirectPath);
        } else {
          navigate('/profile');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (digitsOf(phone).length !== 11) {
      setError('Введите корректный номер телефона');
      return;
    }
    const refDigits = digitsOf(referredBy);
    if (refDigits.length !== 11) {
      setShowReferrerModal(true);
      return;
    }
    await submitRegistration(refDigits);
  };

  const handleModalOk = () => {
    setShowReferrerModal(false);
    setTimeout(() => referrerInputRef.current?.focus(), 50);
  };

  const handleModalDontKnow = async () => {
    setShowReferrerModal(false);
    setReferredBy(formatPhone(ROOT_PHONE_DIGITS));
    await submitRegistration(ROOT_PHONE_DIGITS);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Декоративные фоновые пятна */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-purple/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-cyan/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>
      <div className="glass w-full max-w-md p-8 border border-white/10 shadow-2xl relative z-10">
        <h1 className="text-3xl font-bold text-center text-white mb-2 font-display tracking-tight">
          Создать аккаунт
        </h1>
        <p className="text-sm text-center text-slate-400 mb-8">
          Присоединяйтесь к экосистеме Бумеранг
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Ваш номер телефона
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+7 (___) ___-__-__"
              className="w-full px-4 py-3 bg-dark-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-neon-purple focus:border-neon-purple outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Номер телефона пригласителя
            </label>
            <input
              ref={referrerInputRef}
              type="tel"
              inputMode="tel"
              value={referredBy}
              onChange={(e) => {
                if (!isRefLocked) setReferredBy(formatPhone(e.target.value));
              }}
              readOnly={isRefLocked}
              placeholder="+7 (___) ___-__-__"
              className={`w-full px-4 py-3 border rounded-xl outline-none transition ${
                isRefLocked
                  ? 'bg-dark-800/50 border-white/5 text-slate-400 cursor-not-allowed'
                  : 'bg-dark-900/50 border-white/10 text-white focus:ring-1 focus:ring-neon-purple focus:border-neon-purple'
              }`}
            />
            {isRefLocked && (
              <p className="mt-2 text-xs text-neon-green flex items-center gap-1">
                <span>🔒</span> Автозаполнено по реферальной ссылке
              </p>
            )}
            {!isRefLocked && refFromStorage.length === 11 && (
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <span>💾</span> Подставлено из ранее открытой ссылки
              </p>
            )}
          </div>
          {error && (
            <div className="bg-red-500/10 text-red-400 text-sm p-4 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl text-white font-bold transition btn-neon disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Регистрация...
              </>
            ) : (
              'Зарегистрироваться'
            )}
          </button>
        </form>
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-neon-cyan font-medium hover:text-neon-purple transition">
              Войти
            </Link>
          </p>
        </div>
        {/* Модальное окно */}
        {showReferrerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-900/80 backdrop-blur-sm px-4">
            <div className="glass w-full max-w-sm p-6 border border-white/10 shadow-2xl text-center">
              <p className="text-white font-medium mb-6 font-display text-lg">
                Необходимо ввести номер телефона пригласителя
              </p>
              <button
                type="button"
                onClick={handleModalDontKnow}
                className="w-full py-3 mb-3 rounded-xl text-white font-semibold btn-neon transition"
              >
                Я не знаю номер пригласителя
              </button>
              <button
                type="button"
                onClick={handleModalOk}
                className="w-full py-3 rounded-xl font-semibold text-slate-300 bg-white/5 hover:bg-white/10 transition border border-white/10"
              >
                Вернуться и ввести
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;