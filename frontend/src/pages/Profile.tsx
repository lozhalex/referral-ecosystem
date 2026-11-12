import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { markRcbRegistered, requestRcbPayment, updateRcbLink } from '../api/rcb';
import { hasRole, isPartner } from '../utils/roles';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rcbActionLoading, setRcbActionLoading] = useState(false);
  const [rcbMessage, setRcbMessage] = useState('');
  const [rcbLinkInput, setRcbLinkInput] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => { 
    loadProfile(); 
  }, []);

  const loadProfile = async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
        setRcbLinkInput(response.data.user.rcbReferralLink || '');
      }
    } catch (err: any) {
      setError('Не удалось загрузить профиль');
      if (err.response?.status === 401) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getReferralLink = () => user ? `${window.location.origin}/?ref=${user.phone}` : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = getReferralLink();
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMarkRegistered = async () => {
    window.open('https://rcpay.ru', '_blank');
    setRcbActionLoading(true);
    try {
      const res = await markRcbRegistered();
      if (res.success) { 
        setRcbMessage(res.message); 
        await loadProfile(); 
        setTimeout(() => setRcbMessage(''), 3000); 
      }
    } catch (err: any) { 
      setRcbMessage(err.response?.data?.message || 'Ошибка'); 
    } finally { 
      setRcbActionLoading(false); 
    }
  };

  const handleRequestPayment = async () => {
    if (!window.confirm('Вы подтверждаете, что оплатили тариф СМАРТ (1990 ₽) в РЦБ?')) return;
    setRcbActionLoading(true);
    try {
      const res = await requestRcbPayment();
      if (res.success) { 
        setRcbMessage(res.message); 
        await loadProfile(); 
        setTimeout(() => setRcbMessage(''), 5000); 
      }
    } catch (err: any) { 
      setRcbMessage(err.response?.data?.message || 'Ошибка'); 
    } finally { 
      setRcbActionLoading(false); 
    }
  };

  const handleSaveRcbLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLink(true);
    try {
      const res = await updateRcbLink(rcbLinkInput.trim());
      if (res.success) { 
        alert('Ссылка сохранена!'); 
        await loadProfile(); 
      }
    } catch (err: any) { 
      alert(err.response?.data?.message || 'Ошибка'); 
    } finally { 
      setSavingLink(false); 
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 font-display text-xl">Загрузка...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass p-8 w-full max-w-md text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="btn-neon px-6 py-2">На главную</button>
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 pb-24 max-w-md mx-auto">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
          <span>←</span> На главную
        </button>
        
        {/* ✅ НОВОЕ: Четкое отображение бизнес-статуса (Платный/Бесплатный) */}
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
          isPartner(user) 
            ? 'text-neon-green border-neon-green/30 bg-neon-green/10' 
            : 'text-slate-400 border-white/10 bg-white/5'
        }`}>
          {isPartner(user) ? 'ПАРТНЕР СМАРТ' : 'БЕСПЛАТНЫЙ УЧАСТНИК'}
        </span>
      </div>

      {/* Аватар и Имя */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-white font-bold text-2xl font-display shadow-neon-purple">
          {user.phone.slice(-2)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Мой профиль</h1>
          <p className="text-sm text-slate-400">В системе с {formatDate(user.registeredAt || user.createdAt)}</p>
        </div>
      </div>

      {/* Телефон */}
      <div className="glass p-4 mb-4">
        <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Номер телефона</p>
        <p className="text-lg font-semibold text-white">{user.phone}</p>
      </div>

      {/* Баланс и Рефералы */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass p-4">
          <p className="text-xs text-slate-400 mb-1">Баланс</p>
          <p className="text-2xl font-bold text-neon-green font-display">{user.wallet?.balance || 0} ₽</p>
        </div>
        <div className="glass p-4">
          <p className="text-xs text-slate-400 mb-1">Приглашено</p>
          <p className="text-2xl font-bold text-neon-cyan font-display">{user.referralCount || 0}</p>
        </div>
      </div>

      {/* ✅ НОВОЕ: Отображение системной роли (только для администраторов и спец. ролей) */}
      {hasRole(user.role, ['admin', 'SUPER_ADMIN', 'cashier', 'controller']) && (
        <div className="glass p-4 mb-6 border border-neon-purple/20">
          <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Системная роль</p>
          <p className="text-lg font-semibold text-neon-purple font-display capitalize">{user.role}</p>
        </div>
      )}

      {/* 🌉 ТРЕКЕР РЦБ */}
      <div className={`glass p-5 mb-6 border ${isPartner(user) ? 'border-neon-green/30 shadow-neon-purple' : 'border-neon-purple/30'}`}>
        <h3 className="text-lg font-bold text-white mb-4 font-display flex items-center gap-2">
          {isPartner(user) ? (
            <span className="text-neon-green">🏆 Статус: Партнер СМАРТ</span>
          ) : (
            <span className="text-neon-gradient">🚀 Путь партнера</span>
          )}
        </h3>
        
        {rcbMessage && (
          <div className="mb-4 p-3 bg-neon-green/10 text-neon-green text-sm rounded-xl border border-neon-green/20">
            {rcbMessage}
          </div>
        )}

        {isPartner(user) ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Доступ ко всем модулям экосистемы открыт. Приглашайте участников и получайте бонусы.
            </p>
            <form onSubmit={handleSaveRcbLink} className="mt-4">
              <label className="text-xs text-slate-400 block mb-2 uppercase tracking-wider">Реферальная ссылка РЦБ</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={rcbLinkInput}
                  onChange={(e) => setRcbLinkInput(e.target.value)}
                  placeholder="https://rcpay.ru/r/..."
                  className="flex-1 text-sm px-4 py-3 bg-dark-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-1 focus:ring-neon-purple focus:border-neon-purple outline-none transition"
                />
                <button
                  type="submit"
                  disabled={savingLink}
                  className="text-sm bg-white/10 text-white px-5 py-3 rounded-xl hover:bg-white/20 transition disabled:opacity-50 whitespace-nowrap font-medium border border-white/10"
                >
                  {savingLink ? '...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Шаг 1 */}
            <div className="flex items-center gap-3">
              <span className="text-neon-green text-xl">✅</span>
              <span className="text-sm text-slate-300">Регистрация в RefPro — <span className="font-semibold text-white">Выполнено</span></span>
            </div>
            {/* Шаг 2 */}
            <div className="flex items-start gap-3">
              {user.isRcbRegisteredFree ? (
                <span className="text-neon-green text-xl mt-0.5">✅</span>
              ) : (
                <span className="text-slate-500 text-xl mt-0.5">⏳</span>
              )}
              <div className="flex-1">
                <p className="text-sm text-slate-300 mb-2">Регистрация в РЦБ (бесплатно)</p>
                {!user.isRcbRegisteredFree ? (
                  <button 
                    onClick={handleMarkRegistered} 
                    disabled={rcbActionLoading} 
                    className="text-xs bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition disabled:opacity-50 border border-white/10"
                  >
                    {rcbActionLoading ? 'Обработка...' : 'Перейти к регистрации ↗'}
                  </button>
                ) : (
                  <span className="text-xs text-neon-green font-medium">Аккаунт в РЦБ создан</span>
                )}
              </div>
            </div>
            {/* Шаг 3 */}
            <div className="flex items-start gap-3">
              {user.rcbPaymentRequested ? (
                <span className="text-neon-cyan text-xl mt-0.5 animate-pulse">⏳</span>
              ) : (
                <span className="text-slate-500 text-xl mt-0.5">🔒</span>
              )}
              <div className="flex-1">
                <p className="text-sm text-slate-300 mb-2">Активация тарифа СМАРТ (1990 ₽)</p>
                {!user.rcbPaymentRequested && user.isRcbRegisteredFree && (
                  <>
                    <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                      Для получения статуса партнера и личной реферальной ссылки, внесите оплату тарифа СМАРТ в приложении РЦБ.
                    </p>
                    <button 
                      onClick={handleRequestPayment} 
                      disabled={rcbActionLoading} 
                      className="btn-neon text-xs px-5 py-2.5"
                    >
                      {rcbActionLoading ? 'Обработка...' : 'Я оплатил тариф СМАРТ, проверить'}
                    </button>
                  </>
                )}
                {user.rcbPaymentRequested && (
                  <p className="text-xs text-neon-cyan bg-neon-cyan/10 p-3 rounded-xl border border-neon-cyan/20">
                    📨 Заявка на проверку оплаты отправлена администратору.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Проекты */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider px-1">Мои проекты</h2>
        <div className="space-y-3">
          <div onClick={() => navigate('/auto')} className="glass glass-hover p-4 flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <span className="text-sm font-medium text-white group-hover:text-neon-cyan transition">Помощник автомобилиста</span>
            </div>
            <span className="text-[10px] bg-neon-green/10 text-neon-green px-2.5 py-1 rounded-full border border-neon-green/20 font-bold">АКТИВЕН</span>
          </div>
          <div onClick={() => navigate('/events')} className="glass glass-hover p-4 flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎟️</span>
              <span className="text-sm font-medium text-white group-hover:text-neon-cyan transition">Билеты на мероприятия</span>
            </div>
            <span className="text-[10px] bg-neon-green/10 text-neon-green px-2.5 py-1 rounded-full border border-neon-green/20 font-bold">АКТИВЕН</span>
          </div>
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="space-y-3">
        <button onClick={() => setShowInviteModal(true)} className="w-full py-3.5 btn-neon flex items-center justify-center gap-2 text-sm">
          <span>🔗</span> Пригласить друга
        </button>
        
        <button onClick={() => navigate('/change-password')} className="w-full py-3 bg-white/5 text-slate-300 rounded-xl font-medium hover:bg-white/10 transition border border-white/5 text-sm">
          Сменить пароль
        </button>
        
        {/* ✅ НОВОЕ: Кнопка Админ-панели только для системных ролей (admin, SUPER_ADMIN и т.д.) */}
        {hasRole(user.role, ['admin', 'SUPER_ADMIN']) && (
          <button 
            onClick={() => navigate('/admin')} 
            className="w-full py-3 bg-neon-purple/10 text-neon-purple rounded-xl font-medium hover:bg-neon-purple/20 transition border border-neon-purple/20 text-sm"
          >
            🔧 Админ-панель
          </button>
        )}
        
        <button onClick={() => setShowLogoutModal(true)} className="w-full py-3 bg-red-500/10 text-red-400 rounded-xl font-medium hover:bg-red-500/20 transition border border-red-500/20 text-sm mt-6">
          Выйти из аккаунта
        </button>
      </div>

      {/* Уведомление о копировании */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-neon-green text-dark-900 px-5 py-2.5 rounded-xl shadow-neon-green text-sm font-bold z-50">
          ✅ Ссылка скопирована!
        </div>
      )}

      {/* Модалка приглашения */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass p-6 w-full max-w-sm border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 font-display">Пригласить друга</h3>
            <p className="text-sm text-slate-400 mb-4">Отправьте эту ссылку другу.</p>
            <div className="bg-dark-900 rounded-xl p-4 mb-4 break-all text-sm text-neon-cyan font-mono border border-white/5">
              {getReferralLink()}
            </div>
            <div className="space-y-2">
              <button 
                onClick={handleCopyLink} 
                className={`w-full py-3 rounded-xl font-bold transition ${copied ? 'bg-neon-green text-dark-900' : 'btn-neon'}`}
              >
                {copied ? '✅ Скопировано!' : '📋 Скопировать ссылку'}
              </button>
              <button 
                onClick={() => { setShowInviteModal(false); setCopied(false); }} 
                className="w-full py-3 text-slate-400 text-sm hover:text-white transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка выхода */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass p-6 w-full max-w-sm text-center border border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 font-display">Вы уверены?</h3>
            <p className="text-sm text-slate-400 mb-6">Вы хотите выйти из аккаунта?</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleLogout} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition">
                Да, выйти
              </button>
              <button onClick={() => setShowLogoutModal(false)} className="w-full py-3 bg-white/5 text-slate-300 rounded-xl font-medium hover:bg-white/10 transition border border-white/5">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;