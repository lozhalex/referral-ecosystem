import React, { useRef, useState } from 'react';
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

  const refFromUrl = digitsOf(searchParams.get('ref') || '');
  const isRefLocked = refFromUrl.length === 11;

  const [phone, setPhone] = useState('');
  const [referredBy, setReferredBy] = useState(
    isRefLocked ? formatPhone(refFromUrl) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReferrerModal, setShowReferrerModal] = useState(false);

  const referrerInputRef = useRef<HTMLInputElement>(null);

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

        alert('✅ Регистрация успешна!\nВаш временный пароль: 1234');

        // 🎯 ЛОГИКА РЕДИРЕКТА ПОСЛЕ РЕГИСТРАЦИИ
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin');
          navigate(redirectPath);
        } else {
          navigate('/profile'); // Стандартный переход в профиль после регистрации
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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Создать аккаунт
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Присоединяйтесь к экосистеме
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ваш номер телефона
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+7 (___) ___-__-__"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              className={`w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                isRefLocked ? 'bg-gray-100 border-gray-300 text-gray-600' : 'border-gray-300'
              }`}
            />
            {isRefLocked && (
              <p className="mt-1 text-xs text-green-600">
                🔒 Автозаполнено по реферальной ссылке
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-lg text-white font-semibold transition ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Войти
            </Link>
          </p>
        </div>

        {showReferrerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6">
              <p className="text-center text-gray-800 font-medium mb-5">
                Необходимо ввести номер телефона пригласителя
              </p>

              <button
                type="button"
                onClick={handleModalDontKnow}
                className="w-full py-2.5 px-4 mb-2 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition"
              >
                Я не знаю номер пригласителя
              </button>

              <button
                type="button"
                onClick={handleModalOk}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;