import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { getAdminRcbRequests, approveAdminRcbRequest } from '../api/rcb';

interface User {
  id: number;
  phone: string;
  role: string;
  balance: number;
  referralCount: number;
  isPaidMember: boolean;
  createdAt: string;
}

interface UserDetail extends User {
  referredBy: { id: number; phone: string } | null;
  referrals: { id: number; phone: string; createdAt: string }[];
  transactions: { id: string; amount: number; type: string; description: string; createdAt: string }[];
}

interface AuditLog {
  id: number;
  adminPhone: string;
  targetPhone: string;
  action: string;
  oldData: any;
  newData: any;
  createdAt: string;
}

interface RcbRequest {
  id: number;
  phone: string;
  rcbId: string | null;
  rcbReferralLink: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'rcb'>('users');
  
  const [users, setUsers] = useState<User[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ amount: '', type: 'MANUAL_ADJUSTMENT', description: '' });
  const [adjustLoading, setAdjustLoading] = useState(false);

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveForm, setMoveForm] = useState({ newReferredId: '' });
  const [moveLoading, setMoveLoading] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleForm, setRoleForm] = useState({ role: 'user' });
  const [roleLoading, setRoleLoading] = useState(false);

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [alerts, setAlerts] = useState<{ largeAdjustments: any[]; frequentChanges: any[] } | null>(null);

  const [rcbRequests, setRcbRequests] = useState<RcbRequest[]>([]);
  const [rcbLoading, setRcbLoading] = useState(false);
  const [rcbApprovingId, setRcbApprovingId] = useState<number | null>(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'logs') loadLogs();
    else if (activeTab === 'rcb') loadRcbRequests();
    loadAlerts();
  }, [token, navigate, activeTab]);

  const loadUsers = async (phone?: string) => {
    setLoading(true); setError('');
    try {
      const response = await apiClient.get('/api/admin/users', { params: phone ? { phone } : undefined });
      setUsers(response.data.users);
    } catch (err: any) { setError(err.response?.data?.message || 'Ошибка загрузки пользователей'); }
    finally { setLoading(false); }
  };

  const loadLogs = async () => {
    setLogsLoading(true); setError('');
    try {
      const response = await apiClient.get('/api/admin/tree/logs');
      setLogs(response.data.logs);
    } catch (err: any) { setError(err.response?.data?.message || 'Ошибка загрузки логов'); }
    finally { setLogsLoading(false); }
  };

  const loadRcbRequests = async () => {
    setRcbLoading(true); setError('');
    try {
      const response = await getAdminRcbRequests();
      setRcbRequests(response.requests || []);
    } catch (err: any) { setError(err.response?.data?.message || 'Ошибка загрузки заявок РЦБ'); }
    finally { setRcbLoading(false); }
  };

  const handleApproveRcb = async (userId: number, userPhone: string) => {
    if (!window.confirm(`Подтвердить оплату 1990 ₽ для ${userPhone} и присвоить статус Партнера?`)) return;
    setRcbApprovingId(userId);
    try {
      const res = await approveAdminRcbRequest(userId);
      if (res.success) {
        alert(res.message);
        loadRcbRequests();
        loadLogs();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при одобрении');
    } finally {
      setRcbApprovingId(null);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await apiClient.get('/api/admin/alerts/balance');
      if (response.data.success) setAlerts(response.data.alerts);
    } catch (err) { console.error('Failed to load alerts', err); }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); loadUsers(searchPhone); };

  const loadUserDetail = async (userId: number) => {
    try {
      const response = await apiClient.get(`/api/admin/users/${userId}`);
      setSelectedUser(response.data.user);
    } catch (err: any) { setError(err.response?.data?.message || 'Ошибка загрузки деталей'); }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const numAmount = Number(adjustForm.amount);
    if (numAmount === 0) return alert('Сумма не может быть равна 0');
    if (adjustForm.description.trim().length < 10) return alert('Описание должно содержать минимум 10 символов');

    setAdjustLoading(true);
    try {
      await apiClient.post(`/api/admin/users/${selectedUser.id}/wallet/adjust`, { 
        amount: numAmount, type: adjustForm.type, description: adjustForm.description.trim() 
      });
      alert('Баланс успешно обновлен!');
      setShowAdjustModal(false);
      setAdjustForm({ amount: '', type: 'MANUAL_ADJUSTMENT', description: '' });
      await loadUserDetail(selectedUser.id);
      loadAlerts();
    } catch (err: any) { alert(err.response?.data?.message || 'Ошибка при изменении баланса'); }
    finally { setAdjustLoading(false); }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const newRefId = moveForm.newReferredId === '' ? null : Number(moveForm.newReferredId);
    setMoveLoading(true);
    try {
      await apiClient.post('/api/admin/tree/move', { targetUserId: selectedUser.id, newReferredById: newRefId });
      alert('Реферер успешно изменен!');
      setShowMoveModal(false); setMoveForm({ newReferredId: '' });
      await loadUserDetail(selectedUser.id);
    } catch (err: any) { alert(err.response?.data?.message || 'Ошибка при изменении реферера'); }
    finally { setMoveLoading(false); }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setRoleLoading(true);
    try {
      await apiClient.put(`/api/admin/users/${selectedUser.id}/role`, { role: roleForm.role });
      alert(`Роль успешно изменена на ${roleForm.role}!`);
      setShowRoleModal(false);
      await loadUserDetail(selectedUser.id);
      loadUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Ошибка при смене роли'); }
    finally { setRoleLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Вы уверены, что хотите сбросить пароль для ${selectedUser.phone}?`)) return;
    setResetLoading(true);
    try {
      const response = await apiClient.post(`/api/admin/users/${selectedUser.id}/reset-password`, {});
      setGeneratedPassword(response.data.newPassword);
      setShowResetModal(true);
    } catch (err: any) { alert(err.response?.data?.message || 'Ошибка при сбросе пароля'); }
    finally { setResetLoading(false); }
  };

  const handleToggleMembership = async () => {
    if (!selectedUser) return;
    const isCurrentlyPaid = selectedUser.isPaidMember;
    const confirmMessage = isCurrentlyPaid 
      ? `⚠️ ВНИМАНИЕ! Вы точно хотите изменить статус пользователя ${selectedUser.phone} на БЕСПЛАТНЫЙ?`
      : `Переключить пользователя ${selectedUser.phone} в статус ПЛАТНЫЙ участник?`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await apiClient.post(`/api/admin/membership/${selectedUser.id}/toggle`, {});
      if (response.data.success) {
        alert(response.data.message);
        await loadUserDetail(selectedUser.id);
        loadUsers();
        loadLogs();
      }
    } catch (err: any) { alert(err.response?.data?.message || 'Ошибка при смене статуса участия'); }
  };

  const handleExportLogs = async () => {
    try {
      const response = await apiClient.get('/api/admin/tree/logs/export', { responseType: 'blob' });
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorJson = JSON.parse(text);
        alert(errorJson.message || 'Ошибка сервера при экспорте');
        return;
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tree_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
    } catch (err: any) { console.error('Export error:', err); alert('Ошибка при экспорте логов'); }
  };

  const handleExportTree = async () => {
    try {
      const response = await apiClient.get('/api/admin/tree/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tree_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); window.URL.revokeObjectURL(url); }, 100);
    } catch (err) { alert('Ошибка при экспорте дерева'); }
  };

  const handleImportTree = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('ВНИМАНИЕ! Это действие перезапишет текущую структуру дерева рефералов данными из файла. Продолжить?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImportLoading(true);
    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const response = await apiClient.post('/api/admin/tree/import', jsonData);
      alert(response.data.message || 'Дерево успешно восстановлено!');
      setShowImportModal(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadLogs();
    } catch (err: any) { alert(err.response?.data?.message || 'Ошибка при импорте дерева'); if (fileInputRef.current) fileInputRef.current.value = ''; }
    finally { setImportLoading(false); }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ru-RU');
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('ru-RU');

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {alerts && (alerts.largeAdjustments.length > 0 || alerts.frequentChanges.length > 0) && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-red-800 mb-2">⚠️ Обнаружены подозрительные операции с балансом</h3>
                </div>
              </div>
              <button onClick={() => setAlerts(null)} className="ml-4 px-3 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded hover:bg-red-300 transition">Разобрался ✓</button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Админ-панель</h1>
          <p className="mt-2 text-gray-600">Центр управления экосистемой</p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => navigate('/admin/events')} className="flex items-center justify-center gap-3 p-5 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition font-bold text-lg"><span className="text-3xl">🎟️</span>Управление мероприятиями</button>
            <button onClick={() => navigate('/profile')} className="flex items-center justify-center gap-3 p-5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 hover:border-gray-300 transition font-bold text-lg"><span className="text-3xl">👤</span>Вернуться в профиль</button>
          </div>
        </div>

        <div className="flex border-b border-gray-200 mb-6">
          <button onClick={() => setActiveTab('users')} className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${activeTab === 'users' ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>👥 Пользователи</button>
          <button onClick={() => setActiveTab('logs')} className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${activeTab === 'logs' ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>🌳 Дерево и Журнал</button>
          <button onClick={() => setActiveTab('rcb')} className={`px-6 py-3 font-medium text-sm rounded-t-lg transition ${activeTab === 'rcb' ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>🌉 Заявки РЦБ</button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

        {activeTab === 'users' && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <form onSubmit={handleSearch} className="flex gap-4">
                <input type="text" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} placeholder="Поиск по телефону" className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Найти</button>
                <button type="button" onClick={() => { setSearchPhone(''); loadUsers(); }} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Сбросить</button>
              </form>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">💳 Статус</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Баланс</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Рефералы</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Загрузка...</td></tr> : users.length === 0 ? <tr><td colSpan={8} className="px-6 py-4 text-center text-gray-500">Не найдено</td></tr> : users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'partner' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{user.role}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.isPaidMember ? <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">✅ Платный</span> : <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">⚪ Бесплатный</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.balance} ₽</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.referralCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm"><button onClick={() => loadUserDetail(user.id)} className="text-blue-600 hover:text-blue-900 font-medium">Подробнее</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'rcb' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Заявки на активацию статуса Партнера РЦБ (1990 ₽)</h2>
              <p className="text-sm text-gray-500 mt-1">Проверьте факт оплаты в системе РЦБ перед одобрением.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID в РЦБ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ссылка РЦБ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата заявки</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rcbLoading ? <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Загрузка...</td></tr> : rcbRequests.length === 0 ? <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Нет активных заявок</td></tr> : rcbRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{req.rcbId || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 truncate max-w-xs">
                        {req.rcbReferralLink ? <a href={req.rcbReferralLink} target="_blank" rel="noopener noreferrer" className="hover:underline">{req.rcbReferralLink}</a> : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(req.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          onClick={() => handleApproveRcb(req.id, req.phone)}
                          disabled={rcbApprovingId === req.id}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-1"
                        >
                          {rcbApprovingId === req.id ? 'Обработка...' : '✅ Одобрить'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Управление деревом и аудит</h2>
              <div className="flex gap-3">
                <button onClick={handleExportTree} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">💾 Скачать backup дерева (JSON)</button>
                <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2">📤 Восстановить из backup (JSON)</button>
                <button onClick={handleExportLogs} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">📥 Скачать логи (CSV)</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Админ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Цель</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действие</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Данные</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logsLoading ? <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Загрузка...</td></tr> : logs.length === 0 ? <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Записей нет</td></tr> : logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDateTime(log.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.adminPhone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.targetPhone || 'ВСЕ'}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${log.action === 'MOVE' ? 'bg-yellow-100 text-yellow-800' : log.action === 'IMPORT' ? 'bg-red-100 text-red-800' : log.action === 'MEMBERSHIP_TOGGLE' ? 'bg-blue-100 text-blue-800' : log.action === 'RCB_APPROVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{log.action}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-mono max-w-xs truncate" title={JSON.stringify(log.newData || log.oldData)}>{log.newData ? JSON.stringify(log.newData) : (log.oldData ? JSON.stringify(log.oldData) : '-')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Карточка пользователя</h2>
                  <button onClick={() => { setSelectedUser(null); setShowMoveModal(false); setShowRoleModal(false); setShowResetModal(false); }} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
                </div>
                <div className="space-y-4">
                  <div><label className="text-sm font-medium text-gray-500">ID</label><p className="text-gray-900">{selectedUser.id}</p></div>
                  <div><label className="text-sm font-medium text-gray-500">Телефон</label><p className="text-gray-900">{selectedUser.phone}</p></div>
                  <div><label className="text-sm font-medium text-gray-500">Роль</label><p className="text-gray-900">{selectedUser.role}</p></div>
                  <div><label className="text-sm font-medium text-gray-500">💳 Статус участия</label><p className="text-gray-900">{selectedUser.isPaidMember ? '✅ Платный участник' : '⚪ Бесплатный участник'}</p></div>
                  <div><label className="text-sm font-medium text-gray-500">Баланс</label><p className="text-gray-900">{selectedUser.balance} ₽</p></div>
                  <div><label className="text-sm font-medium text-gray-500">Дата регистрации</label><p className="text-gray-900">{formatDate(selectedUser.createdAt)}</p></div>

                  <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-3">
                    <button onClick={() => setShowAdjustModal(true)} className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2">💰 Баланс</button>
                    <button onClick={() => setShowMoveModal(true)} className="py-2 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium flex items-center justify-center gap-2">🔄 Реферер</button>
                    <button onClick={() => { setRoleForm({ role: selectedUser.role }); setShowRoleModal(true); }} className="py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium flex items-center justify-center gap-2">🛡️ Роль</button>
                    <button onClick={handleResetPassword} disabled={resetLoading} className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50">{resetLoading ? 'Сброс...' : '🔑 Сброс пароля'}</button>
                    <button onClick={handleToggleMembership} className={`py-2 px-4 rounded-lg transition font-medium flex items-center justify-center gap-2 col-span-2 ${selectedUser.isPaidMember ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                      {selectedUser.isPaidMember ? '⬇️ Сделать бесплатным' : '⬆️ Сделать платным'}
                    </button>
                  </div>

                  <div><label className="text-sm font-medium text-gray-500">Текущий пригласитель</label><p className="text-gray-900">{selectedUser.referredBy ? `${selectedUser.referredBy.phone} (ID: ${selectedUser.referredBy.id})` : 'Нет (корневой)'}</p></div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">Рефералы ({selectedUser.referrals.length})</label>
                    {selectedUser.referrals.length === 0 ? <p className="text-gray-500 text-sm">Нет рефералов</p> : (
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedUser.referrals.map((ref) => <li key={ref.id} className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">{ref.phone} — {formatDate(ref.createdAt)}</li>)}
                      </ul>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">История транзакций ({selectedUser.transactions.length})</label>
                    {selectedUser.transactions.length === 0 ? <p className="text-gray-500 text-sm">Нет транзакций</p> : (
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedUser.transactions.map((tx) => (
                          <li key={tx.id} className="text-sm bg-gray-50 px-3 py-2 rounded">
                            <div className="flex justify-between"><span className="font-medium">{tx.type}</span><span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>{tx.amount > 0 ? '+' : ''}{tx.amount} ₽</span></div>
                            <div className="text-gray-500 text-xs mt-1">{tx.description}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAdjustModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-900">Изменение баланса</h3><button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button></div>
              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Сумма</label><input type="number" required value={adjustForm.amount} onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Тип операции</label><select value={adjustForm.type} onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="MANUAL_ADJUSTMENT">Ручная корректировка</option><option value="BONUS">Бонус / Подарок</option><option value="PENALTY">Штраф / Возврат</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Причина (мин. 10 символов)</label><textarea required minLength={10} rows={3} value={adjustForm.description} onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={adjustLoading}>Отмена</button><button type="submit" disabled={adjustLoading} className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{adjustLoading ? 'Сохранение...' : 'Сохранить'}</button></div>
              </form>
            </div>
          </div>
        )}

        {showMoveModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-900">Смена реферера</h3><button onClick={() => setShowMoveModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button></div>
              <form onSubmit={handleMoveSubmit} className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800"><p>Текущий пригласитель: <strong>{selectedUser.referredBy ? selectedUser.referredBy.phone : 'Нет'}</strong></p><p className="mt-1 text-xs">Это действие будет записано в журнал аудита.</p></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ID нового пригласителя (пусто = корневой)</label><input type="number" value={moveForm.newReferredId} onChange={(e) => setMoveForm({ ...moveForm, newReferredId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowMoveModal(false)} className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={moveLoading}>Отмена</button><button type="submit" disabled={moveLoading} className="flex-1 py-2 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">{moveLoading ? 'Сохранение...' : 'Сохранить'}</button></div>
              </form>
            </div>
          </div>
        )}

        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-900">Смена роли</h3><button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button></div>
              <form onSubmit={handleRoleSubmit} className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800"><p>Пользователь: <strong>{selectedUser.phone}</strong></p><p className="mt-1">Текущая роль: <strong>{selectedUser.role}</strong></p></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Новая роль</label><select value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg"><option value="user">user (Пользователь)</option><option value="admin">admin (Администратор)</option><option value="controller">controller (Контроллер)</option></select></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={roleLoading}>Отмена</button><button type="submit" disabled={roleLoading} className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">{roleLoading ? 'Сохранение...' : 'Сохранить'}</button></div>
              </form>
            </div>
          </div>
        )}

        {showResetModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-900">Пароль сброшен!</h3><button onClick={() => { setShowResetModal(false); setGeneratedPassword(''); }} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button></div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"><p className="text-sm text-green-800 mb-2">Новый временный пароль для <strong>{selectedUser.phone}</strong>:</p><p className="text-3xl font-bold text-green-900 text-center tracking-widest">{generatedPassword}</p><p className="text-xs text-green-700 mt-2 text-center">⚠️ Скопируйте пароль сейчас! Он не будет показан снова.</p></div>
              <button onClick={() => { setShowResetModal(false); setGeneratedPassword(''); }} className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Закрыть</button>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-900">Восстановление дерева</h3><button onClick={() => { setShowImportModal(false); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button></div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 mb-4"><p className="font-bold">⚠️ ВНИМАНИЕ!</p><p className="mt-1">Это действие полностью перезапишет текущие связи `referredById` и пересчитает счетчики рефералов на основе данных из файла.</p></div>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Выберите файл backup дерева (.json)</label><input type="file" ref={fileInputRef} accept=".json" onChange={handleImportTree} className="w-full px-3 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" /></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowImportModal(false); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={importLoading}>Отмена</button></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}