import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface User {
  id: number;
  phone: string;
  role: string;
  balance: number;
  referralCount: number;
  createdAt: string;
}

interface UserDetail extends User {
  referredBy: { id: number; phone: string } | null;
  referrals: { id: number; phone: string; createdAt: string }[];
  transactions: {
    id: string;
    amount: number;
    type: string;
    description: string;
    createdAt: string;
  }[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 👇 Новые состояния для модального окна изменения баланса 👇
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ amount: '', type: 'MANUAL_ADJUSTMENT', description: '' });
  const [adjustLoading, setAdjustLoading] = useState(false);
  // 👆 Конец новых состояний 👆

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    loadUsers();
  }, [token, navigate]);

  const loadUsers = async (phone?: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: phone ? { phone } : undefined
      });
      setUsers(response.data.users);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchPhone);
  };

  const loadUserDetail = async (userId: number) => {
    try {
      const response = await axios.get(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedUser(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ошибка загрузки деталей');
    }
  };

  // 👇 Функция отправки формы изменения баланса 👇
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const numAmount = Number(adjustForm.amount);
    if (numAmount === 0) {
      alert('Сумма не может быть равна 0');
      return;
    }
    if (adjustForm.description.trim().length < 10) {
      alert('Описание должно содержать минимум 10 символов');
      return;
    }

    setAdjustLoading(true);
    try {
      await axios.post(
        `/api/admin/users/${selectedUser.id}/wallet/adjust`,
        {
          amount: numAmount,
          type: adjustForm.type,
          description: adjustForm.description.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Баланс успешно обновлен!');
      setShowAdjustModal(false);
      setAdjustForm({ amount: '', type: 'MANUAL_ADJUSTMENT', description: '' });
      
      // Перезагружаем детали пользователя, чтобы увидеть новый баланс и транзакцию
      await loadUserDetail(selectedUser.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Ошибка при изменении баланса');
    } finally {
      setAdjustLoading(false);
    }
  };
  // 👆 Конец функции 👆

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Админ-панель</h1>
          <p className="mt-2 text-gray-600">Управление пользователями экосистемы</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Поиск по телефону (например, +79991234567)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Найти
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchPhone('');
                loadUsers();
              }}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Сбросить
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Телефон</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Баланс</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Рефералы</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата регистрации</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Загрузка...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.balance} ₽</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.referralCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => loadUserDetail(user.id)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Подробнее
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Карточка пользователя</h2>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">ID</label>
                    <p className="text-gray-900">{selectedUser.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Телефон</label>
                    <p className="text-gray-900">{selectedUser.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Роль</label>
                    <p className="text-gray-900">{selectedUser.role}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Баланс</label>
                    <p className="text-gray-900">{selectedUser.balance} ₽</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Дата регистрации</label>
                    <p className="text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                  </div>

                  {/* 👇 КНОПКА ИЗМЕНЕНИЯ БАЛАНСА 👇 */}
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowAdjustModal(true)}
                      className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
                    >
                      💰 Изменить баланс
                    </button>
                  </div>
                  {/* 👆 КОНЕЦ КНОПКИ 👆 */}

                  <div>
                    <label className="text-sm font-medium text-gray-500">Пригласил</label>
                    <p className="text-gray-900">
                      {selectedUser.referredBy ? selectedUser.referredBy.phone : 'Нет'}
                    </p>
                  </div>

                  {/* Referrals */}
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      Рефералы ({selectedUser.referrals.length})
                    </label>
                    {selectedUser.referrals.length === 0 ? (
                      <p className="text-gray-500 text-sm">Нет рефералов</p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedUser.referrals.map((ref) => (
                          <li key={ref.id} className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                            {ref.phone} — {formatDate(ref.createdAt)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Transactions */}
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 block">
                      История транзакций ({selectedUser.transactions.length})
                    </label>
                    {selectedUser.transactions.length === 0 ? (
                      <p className="text-gray-500 text-sm">Нет транзакций</p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedUser.transactions.map((tx) => (
                          <li key={tx.id} className="text-sm bg-gray-50 px-3 py-2 rounded">
                            <div className="flex justify-between">
                              <span className="font-medium">{tx.type}</span>
                              <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount} ₽
                              </span>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">{tx.description}</div>
                            <div className="text-gray-400 text-xs">{formatDate(tx.createdAt)}</div>
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

        {/* 👇 Модальное окно изменения баланса 👇 */}
        {showAdjustModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Изменение баланса</h3>
                <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">
                  ✕
                </button>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Сумма (положительная для начисления, отрицательная для списания)
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustForm.amount}
                    onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                    placeholder="Например: 100 или -50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Тип операции</label>
                  <select
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="MANUAL_ADJUSTMENT">Ручная корректировка</option>
                    <option value="BONUS">Бонус / Подарок</option>
                    <option value="PENALTY">Штраф / Возврат</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Причина / Комментарий (мин. 10 символов)
                  </label>
                  <textarea
                    required
                    minLength={10}
                    rows={3}
                    value={adjustForm.description}
                    onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                    placeholder="Например: Начислено за ошибку в системе при регистрации"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    disabled={adjustLoading}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={adjustLoading}
                    className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {adjustLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* 👆 Конец модального окна изменения баланса 👆 */}

        {/* Back Button */}
        <div className="mt-6">
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            ← Вернуться в профиль
          </button>
        </div>
      </div>
    </div>
  );
}