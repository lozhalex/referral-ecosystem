import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { markRcbRegistered, requestRcbPayment, updateRcbLink } from '../api/rcb';
import { hasRole, isPartner } from '../utils/roles';
import { CATEGORIES, getCategoryName } from './AutoHelper/categories';
import { Html5Qrcode } from 'html5-qrcode';

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

  // === Состояния для панели сервисмена ===
  const [showServicePanel, setShowServicePanel] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [validatedCar, setValidatedCar] = useState<any>(null);
  const [validatedClient, setValidatedClient] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [currentQrId, setCurrentQrId] = useState<number | null>(null);
  const [currentToken, setCurrentToken] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSessionClosed, setIsSessionClosed] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [serviceMessage, setServiceMessage] = useState('');
  const [serviceFormData, setServiceFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'oil_engine',
    work: '',
    cost: '',
    comment: ''
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-scanner-container';

  useEffect(() => {
    loadProfile();
    // Очистка сканера при размонтировании
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear();
      }
    };
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

  // === Функции панели сервисмена ===

  const startScanner = async () => {
    setIsScanning(true);
    setServiceMessage('');
    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Успешное сканирование
          await scanner.stop();
          scanner.clear();
          scannerRef.current = null;
          setIsScanning(false);
          await validateToken(decodedText);
        },
        (errorMessage) => {
          // Игнорируем ошибки сканирования (это нормально)
        }
      );
    } catch (err) {
      console.error('Scanner start error:', err);
      setServiceMessage('❌ Не удалось запустить камеру. Используйте ручной ввод.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {}
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const validateToken = async (token: string) => {
    setServiceLoading(true);
    setServiceMessage('');
    try {
      const res = await apiClient.post('/api/auto/service-access/qr/validate', { token });
      if (res.data.success) {
        setValidatedCar(res.data.car);
        setValidatedClient(res.data.client);
        setRecentRecords(res.data.recentRecords || []);
        setCurrentQrId(res.data.qrId);
        setCurrentToken(token);
        setIsFormOpen(true);
        setIsSessionClosed(false);
        // Сброс формы
        setServiceFormData({
          date: new Date().toISOString().split('T')[0],
          category: 'oil_engine',
          work: '',
          cost: '',
          comment: ''
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ошибка валидации QR';
      setServiceMessage(`❌ ${msg}`);
    } finally {
      setServiceLoading(false);
    }
  };

  const handleManualValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await validateToken(manualToken.trim());
    setManualToken('');
  };

  const handleServiceSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentToken) return;
    setServiceLoading(true);
    setServiceMessage('');
    try {
      const res = await apiClient.post('/api/auto/service-access/qr/record', {
        token: currentToken,
        ...serviceFormData,
        cost: Number(serviceFormData.cost) || 0
      });
      if (res.data.success) {
        setServiceMessage('✅ Запись успешно внесена в журнал клиента');
        // Сброс формы для следующей записи
        setServiceFormData({
          date: new Date().toISOString().split('T')[0],
          category: 'oil_engine',
          work: '',
          cost: '',
          comment: ''
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Ошибка сохранения';
      if (err.response?.status === 410) {
        setServiceMessage('⏱️ QR-код истёк. Сессия завершена.');
        setIsSessionClosed(true);
        setIsFormOpen(false);
      } else {
        setServiceMessage(`❌ ${msg}`);
      }
    } finally {
      setServiceLoading(false);
    }
  };

  const handleEndSession = () => {
    setIsFormOpen(false);
    setIsSessionClosed(true);
    setValidatedCar(null);
    setValidatedClient(null);
    setRecentRecords([]);
    setCurrentToken('');
    setCurrentQrId(null);
    setServiceMessage('');
  };

  const handleToggleServicePanel = () => {
    if (showServicePanel) {
      // Закрываем панель — останавливаем сканер если работает
      stopScanner();
      setShowServicePanel(false);
    } else {
      setShowServicePanel(true);
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

  const isServiceMaster = user.role === 'service_master';

  return (
    <div className="min-h-screen p-4 pb-24 max-w-md mx-auto">
      {/* Шапка */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition">
          <span>←</span> На главную
        </button>
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

      {/* Системная роль */}
      {hasRole(user.role, ['admin', 'SUPER_ADMIN', 'cashier', 'controller', 'service_master']) && (
        <div className="glass p-4 mb-6 border border-neon-purple/20">
          <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Системная роль</p>
          <p className="text-lg font-semibold text-neon-purple font-display capitalize">{user.role}</p>
        </div>
      )}

      {/* 🆕 ПАНЕЛЬ СЕРВИСМЕНА (только для role === 'service_master') */}
      {isServiceMaster && (
        <div className="glass p-5 mb-6 border border-neon-cyan/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
          <button
            onClick={handleToggleServicePanel}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
              🔧 Панель сервисмена
            </h3>
            <span className="text-slate-400 text-xl">{showServicePanel ? '▼' : '▶'}</span>
          </button>

          {showServicePanel && (
            <div className="mt-4 space-y-4">
              {serviceMessage && (
                <div className={`p-3 text-sm rounded-xl border ${
                  serviceMessage.includes('✅') 
                    ? 'bg-neon-green/10 text-neon-green border-neon-green/20' 
                    : serviceMessage.includes('⏱️')
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {serviceMessage}
                </div>
              )}

              {/* Если форма не открыта и сессия не закрыта — показываем сканер */}
              {!isFormOpen && !isSessionClosed && (
                <>
                  <button
                    onClick={isScanning ? stopScanner : startScanner}
                    disabled={serviceLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50"
                  >
                    {isScanning ? '⏹ Остановить камеру' : '📷 Сканировать QR клиента'}
                  </button>

                  {isScanning && (
                    <div className="bg-black rounded-xl overflow-hidden border border-white/10">
                      <div id={scannerContainerId} className="w-full"></div>
                    </div>
                  )}

                  <div className="relative flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-xs text-slate-500">или</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                  </div>

                  <form onSubmit={handleManualValidate} className="flex gap-2">
                    <input
                      type="text"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Введите токен вручную"
                      className="flex-1 px-3 py-2.5 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all placeholder-gray-500 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!manualToken.trim() || serviceLoading}
                      className="px-4 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50 text-sm font-medium border border-white/10"
                    >
                      OK
                    </button>
                  </form>
                </>
              )}

              {/* Если сессия закрыта */}
              {isSessionClosed && !isFormOpen && (
                <div className="text-center py-4">
                  <p className="text-sm text-slate-400 mb-3">Сессия завершена</p>
                  <button
                    onClick={() => {
                      setIsSessionClosed(false);
                      setServiceMessage('');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg text-sm font-medium"
                  >
                    Сканировать новый QR
                  </button>
                </div>
              )}

              {/* Если форма открыта — показываем данные авто и форму */}
              {isFormOpen && validatedCar && (
                <div className="space-y-4">
                  {/* Карточка авто */}
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <p className="text-xs text-cyan-400 uppercase tracking-wider mb-1">Автомобиль клиента</p>
                    <p className="text-lg font-bold text-white">
                      {validatedCar.marka} {validatedCar.model}
                    </p>
                    <p className="text-sm text-slate-300">
                      {validatedCar.gosnomer || 'без номера'} • {validatedCar.mileage?.toLocaleString('ru-RU') || 0} км
                    </p>
                    {validatedClient && (
                      <p className="text-xs text-slate-400 mt-1">
                        Клиент: {validatedClient.phone}
                      </p>
                    )}
                  </div>

                  {/* Последние 3 записи */}
                  {recentRecords.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Последние записи журнала</p>
                      <div className="space-y-2">
                        {recentRecords.map((rec: any) => (
                          <div key={rec.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <span className="text-sm font-medium text-gray-200">
                                {getCategoryName(rec.category)}
                              </span>
                              <span className="text-xs text-cyan-400">{rec.cost} ₽</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {formatDate(rec.date)} • {rec.mileage} км
                            </p>
                            {rec.work && <p className="text-xs text-slate-300 mt-1">{rec.work}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Форма внесения ТО */}
                  <form onSubmit={handleServiceSave} className="space-y-3 bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Новая запись в журнал</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Дата</label>
                        <input
                          required
                          type="date"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-sm"
                          value={serviceFormData.date}
                          onChange={(e) => setServiceFormData({...serviceFormData, date: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Категория</label>
                        <select
                          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-sm"
                          value={serviceFormData.category}
                          onChange={(e) => setServiceFormData({...serviceFormData, category: e.target.value})}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.key} value={c.key} className="bg-slate-800">{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Выполненные работы</label>
                      <textarea
                        required
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-sm"
                        value={serviceFormData.work}
                        onChange={(e) => setServiceFormData({...serviceFormData, work: e.target.value})}
                        placeholder="Например: Замена масла и фильтра"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Стоимость (₽)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-sm"
                          value={serviceFormData.cost}
                          onChange={(e) => setServiceFormData({...serviceFormData, cost: e.target.value})}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Комментарий</label>
                        <input
                          className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none transition-all text-sm"
                          value={serviceFormData.comment}
                          onChange={(e) => setServiceFormData({...serviceFormData, comment: e.target.value})}
                          placeholder="Необязательно"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={serviceLoading}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50"
                    >
                      {serviceLoading ? 'Сохранение...' : '💾 Сохранить запись'}
                    </button>
                  </form>

                  {/* Кнопка завершения сессии */}
                  <button
                    onClick={handleEndSession}
                    className="w-full py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/30 transition-all text-sm"
                  >
                    Завершить сессию
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ТРЕКЕР РЦБ */}
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
            <div className="flex items-center gap-3">
              <span className="text-neon-green text-xl">✅</span>
              <span className="text-sm text-slate-300">Регистрация в RefPro — <span className="font-semibold text-white">Выполнено</span></span>
            </div>
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