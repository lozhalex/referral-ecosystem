import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/login', {
        phone,
        password,
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        // 🎯 ЛОГИКА РЕДИРЕКТА ПОСЛЕ ВХОДА
        const redirectPath = localStorage.getItem('redirectAfterLogin');
        if (redirectPath) {
          localStorage.removeItem('redirectAfterLogin'); // Очищаем после использования
          navigate(redirectPath);
        } else {
          navigate('/profile'); // Стандартный переход, если редирект не был запрошен
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Произошла ошибка при входе';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {/* Декоративные фоновые пятна для глубины */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-purple/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-cyan/10 rounded-full mix-blend-screen filter blur-3xl pointer-events-none"></div>

      <div className="glass w-full max-w-md p-8 border border-white/10 shadow-2xl relative z-10">
        <h1 className="text-3xl font-bold text-center text-white mb-2 font-display tracking-tight">
          С возвращением!
        </h1>
        <p className="text-center text-slate-400 mb-8 text-sm">
          Войдите в экосистему Бумеранг
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Номер телефона
            </label>
            <input
              type="tel"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (9XX) XXX-XX-XX"
              className="w-full px-4 py-3 bg-dark-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-neon-purple focus:border-neon-purple outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Пароль
            </label>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              className="w-full px-4 py-3 bg-dark-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-neon-purple focus:border-neon-purple outline-none transition"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 text-sm p-4 rounded-xl border border-red-500/20 space-y-3">
              <p>{error}</p>
              <div className="flex gap-2">
                <Link 
                  to="/register" 
                  className="flex-1 text-center py-2 px-3 bg-white/10 text-white rounded-lg hover:bg-white/20 text-xs font-medium transition border border-white/10"
                >
                  Регистрация
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setPassword('');
                  }}
                  className="flex-1 py-2 px-3 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 text-xs font-medium transition border border-red-500/20"
                >
                  Очистить и повторить
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 px-4 rounded-xl text-white font-bold transition btn-neon disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Вход...
              </>
            ) : (
              'Войти в систему'
            )}
          </button>
        </form>

        {/* 🔒 БЛОК ВОССТАНОВЛЕНИЯ ПАРОЛЯ */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔒</span>
            <h3 className="text-sm font-semibold text-slate-200 font-display">Забыли пароль?</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Пароль будет выслан в ручном режиме администратором. 
            Пожалуйста, напишите нам <strong className="text-slate-200">с того номера</strong>, на который зарегистрирован акка®,nt.
          </p>
          
          <div className="grid grid-cols-3 gap-2">
            <a 
              href="https://t.me/your_admin_telegram" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 py-2.5 px-1 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition text-xs font-medium border border-blue-500/20"
            >
              <span>✈️</span> Telegram
            </a>
            <a 
              href="https://wa.me/79000000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 py-2.5 px-1 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition text-xs font-medium border border-green-500/20"
            >
              <span>💬</span> WhatsApp
            </a>
            <a 
              href="https://max.me/your_admin_max" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1 py-2.5 px-1 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition text-xs font-medium border border-purple-500/20"
            >
              <span>📱</span> Max
            </a>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-neon-cyan font-medium hover:text-neon-purple transition">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;