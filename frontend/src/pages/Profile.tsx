import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { markRcbRegistered, requestRcbPayment, updateRcbLink } from '../api/rcb';

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

  const getReferralLink = () => {
    if (!user) return '';
    return `${window.location.origin}/?ref=${user.phone}`;
  };

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
    if (!window.confirm('Вы подтверждаете, что оплатили тариф СМАРТ (1990 ₽) в РЦБ? Администратор проверит этот факт вручную.')) return;
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
        alert('Ссылка успешно сохранена!');
        await loadProfile();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка сохранения');
    } finally {
      setSavingLink(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  };

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-500">Загрузка...</p></div>;
  if (error) return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center"><p className="text-red-600 mb-4">{error}</p><button onClick={() => navigate('/')} className="w-full py-2 bg-blue-600 text-white rounded-lg">На главную</button></div></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md relative">
        <button onClick={() => navigate('/')} className="mb-4 flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition font-medium">← На главную</button>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">{user.phone.slice(-2)}</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Мой профиль</h1>
              <p className="text-xs text-gray-500">В системе с {formatDate(user.registeredAt || user.createdAt)}</p>
            </div>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{user.role === 'admin' || user.role === 'SUPER_ADMIN' ? 'Администратор' : user.role === 'partner' ? 'Партнер' : 'Пользователь'}</span>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-xs text-gray-500 mb-1">Ваш номер телефона</p>
          <p className="text-lg font-semibold text-gray-800">{user.phone}</p>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-600 mb-1">Ваш баланс</p>
          <p className="text-3xl font-bold text-green-700">{user.wallet?.balance || 0} ₽</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-600 mb-1">Всего приглашено</p>
          <p className="text-3xl font-bold text-blue-700">{user.referralCount || 0}</p>
        </div>

        {/* 🌉 АДАПТИВНЫЙ ТРЕКЕР ПАРТНЕРСТВА РЦБ */}
        <div className={`rounded-lg p-4 mb-4 border ${user.isRcbPaid ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
          <h3 className="text-sm font-bold text-purple-800 mb-3 flex items-center gap-2">
            {user.isRcbPaid ? '🏆 Ваш статус: Партнер СМАРТ' : '🚀 Путь партнера РЦБ'}
          </h3>
          
          {rcbMessage && (
            <div className="mb-3 p-2 bg-green-100 text-green-800 text-xs rounded border border-green-200">{rcbMessage}</div>
          )}

          {/* ВАРИАНТ А: Пользователь уже СМАРТ */}
          {user.isRcbPaid ? (
            <div className="space-y-3">
              <p className="text-sm text-green-700">
                Поздравляем! Вы активировали статус партнера. Теперь вы можете приглашать участников и получать бонусы.
              </p>
              <form onSubmit={handleSaveRcbLink} className="mt-2">
                <label className="text-xs text-gray-600 block mb-1">Ваша реферальная ссылка РЦБ:</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={rcbLinkInput}
                    onChange={(e) => setRcbLinkInput(e.target.value)}
                    placeholder="https://rcpay.ru/r/..."
                    className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 outline-none bg-white"
                  />
                  <button
                    type="submit"
                    disabled={savingLink}
                    className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {savingLink ? '...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ВАРИАНТ Б: Пользователь еще не СМАРТ (показываем шаги) */
            <div className="space-y-4">
              {/* Шаг 1 */}
              <div className="flex items-center gap-3">
                <span className="text-green-500 text-lg">✅</span>
                <span className="text-sm text-gray-700">Регистрация в RefPro — <span className="font-semibold text-green-700">Выполнено</span></span>
              </div>

              {/* Шаг 2 */}
              <div className="flex items-start gap-3">
                {user.isRcbRegisteredFree ? (
                  <span className="text-green-500 text-lg mt-0.5">✅</span>
                ) : (
                  <span className="text-yellow-500 text-lg mt-0.5">⏳</span>
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-1">Регистрация в РЦБ (бесплатно)</p>
                  {!user.isRcbRegisteredFree ? (
                    <button
                      onClick={handleMarkRegistered}
                      disabled={rcbActionLoading}
                      className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 transition disabled:opacity-50"
                    >
                      {rcbActionLoading ? 'Обработка...' : 'Перейти к регистрации в РЦБ ↗'}
                    </button>
                  ) : (
                    <span className="text-xs text-green-600 font-medium">Аккаунт в РЦБ создан</span>
                  )}
                </div>
              </div>

              {/* Шаг 3 */}
              <div className="flex items-start gap-3">
                {user.rcbPaymentRequested ? (
                  <span className="text-blue-500 text-lg mt-0.5 animate-pulse">⏳</span>
                ) : (
                  <span className="text-gray-400 text-lg mt-0.5">🔒</span>
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-1">Активация тарифа СМАРТ (1990 ₽)</p>
                  
                  {!user.rcbPaymentRequested && user.isRcbRegisteredFree && (
                    <>
                      <p className="text-xs text-gray-600 mb-2">
                        Для получения статуса партнера и вашей личной реферальной ссылки, пожалуйста, внесите оплату тарифа СМАРТ в приложении РЦБ.
                      </p>
                      <button
                        onClick={handleRequestPayment}
                        disabled={rcbActionLoading}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {rcbActionLoading ? 'Обработка...' : 'Я оплатил тариф СМАРТ, проверить'}
                      </button>
                    </>
                  )}
                  
                  {user.rcbPaymentRequested && (
                    <p className="text-xs text-blue-600 font-medium bg-blue-50 p-2 rounded border border-blue-100">
                      📨 Заявка на проверку оплаты отправлена администратору. Мы свяжемся с вами в ближайшее время.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Мои проекты</h2>
          <div className="space-y-2">
            <div onClick={() => navigate('/auto')} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition">
              <div className="flex items-center gap-2"><span className="text-xl">🚗</span><span className="text-sm font-medium text-gray-800">Помощник автомобилиста</span></div>
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✅ Доступен</span>
            </div>
            <div onClick={() => navigate('/events')} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition">
              <div className="flex items-center gap-2"><span className="text-xl">🎟️</span><span className="text-sm font-medium text-gray-800">Билеты на мероприятия</span></div>
              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">✅ Доступен</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={() => setShowInviteModal(true)} className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition flex items-center justify-center gap-2"><span>🔗</span> Пригласить друга</button>
          <button onClick={() => navigate('/change-password')} className="w-full py-2.5 px-4 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition">Сменить пароль</button>
          {(user.role === 'admin' || user.role === 'SUPER_ADMIN' || user.role === 'partner') && (
            <button onClick={() => navigate('/admin')} className="w-full py-2.5 px-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"><span>🔧</span> Админ-панель</button>
          )}
          <button onClick={() => setShowLogoutModal(true)} className="w-full py-2.5 px-4 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition">Выйти из аккаунта</button>
        </div>

        {copied && <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50">✅ Ссылка скопирована!</div>}
        
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Пригласить друга</h3>
              <p className="text-sm text-gray-600 mb-4">Отправьте эту ссылку другу.</p>
              <div className="bg-gray-100 rounded-lg p-3 mb-4 break-all text-sm text-gray-700 font-mono">{getReferralLink()}</div>
              <div className="space-y-2">
                <button onClick={handleCopyLink} className={`w-full py-2 px-4 rounded-lg font-medium transition ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{copied ? '✅ Скопировано!' : '📋 Скопировать ссылку'}</button>
                <button onClick={() => { setShowInviteModal(false); setCopied(false); }} className="w-full py-2 px-4 text-gray-500 text-sm hover:text-gray-700 transition">Закрыть</button>
              </div>
            </div>
          </div>
        )}

        {showLogoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Вы уверены?</h3>
              <p className="text-sm text-gray-600 mb-4">Вы хотите выйти из аккаунта?</p>
              <div className="flex flex-col gap-2">
                <button onClick={handleLogout} className="w-full py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition">Да, выйти</button>
                <button onClick={() => setShowLogoutModal(false)} className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;