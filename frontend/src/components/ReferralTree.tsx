import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface TreeNode {
  id: number;
  phone: string;
  role: string;
  referralCount: number;
  totalDescendants: number;
  balance: number;
  isPaidMember: boolean;
  children: TreeNode[];
  hasMore: boolean;
}

interface TreeStats {
  totalUsers: number;
  maxDepth: number;
  paidMembers: number;
  founders: number;
  topByDirect: { phone: string; count: number }[];
  topByTotal: { phone: string; count: number }[];
}

const ROLE_COLORS: { [key: string]: string } = {
  SUPER_ADMIN: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  admin: 'bg-blue-100 text-blue-800 border-blue-300',
  partner: 'bg-green-100 text-green-800 border-green-300',
  service_master: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  user: 'bg-gray-100 text-gray-800 border-gray-300'
};

function TreeNodeComponent({ node, depth, searchPath }: { node: TreeNode; depth: number; searchPath: number[] }) {
  const [expanded, setExpanded] = useState(depth < 3);
  const [children, setChildren] = useState<TreeNode[]>(node.children);
  const [loading, setLoading] = useState(false);

  const isOnSearchPath = searchPath.includes(node.id);

  const loadMoreChildren = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/api/admin/tree/visual`, {
        params: { depth: 1, searchPhone: node.phone }
      });
      if (response.data.tree && response.data.tree.length > 0) {
        setChildren(response.data.tree[0].children);
      }
    } catch (err) {
      console.error('Error loading children:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-4 border-l-2 border-gray-300 pl-4">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg transition ${
          isOnSearchPath ? 'bg-yellow-50 border border-yellow-300' : 'hover:bg-gray-50'
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700"
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className={`px-2 py-1 rounded border text-xs font-medium ${ROLE_COLORS[node.role] || ROLE_COLORS.user}`}>
          {node.role}
        </span>
        <span className="font-mono text-sm text-gray-900">{node.phone}</span>
        <span className="text-xs text-gray-500">({node.referralCount} прямых, {node.totalDescendants} всего)</span>
        {node.isPaidMember && <span className="text-xs text-green-600">💎</span>}
      </div>
      {expanded && (
        <>
          {children.map(child => (
            <TreeNodeComponent key={child.id} node={child} depth={depth + 1} searchPath={searchPath} />
          ))}
          {node.hasMore && (
            <button
              onClick={loadMoreChildren}
              disabled={loading}
              className="ml-6 mt-2 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {loading ? 'Загрузка...' : `Показать ещё (${node.referralCount - children.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function ReferralTree() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [stats, setStats] = useState<TreeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchPath, setSearchPath] = useState<number[]>([]);

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async (phone?: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/admin/tree/visual', {
        params: phone ? { searchPhone: phone } : {}
      });
      setTree(response.data.tree);
      setStats(response.data.stats);
      if (phone && response.data.tree.length > 0) {
        const path = response.data.tree.map((n: TreeNode) => n.id);
        setSearchPath(path);
      } else {
        setSearchPath([]);
      }
    } catch (err) {
      console.error('Error loading tree:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPhone.trim()) {
      loadTree(searchPhone);
    } else {
      loadTree();
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Загрузка дерева...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-500">Всего пользователей</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-500">Максимальная глубина</div>
            <div className="text-2xl font-bold text-gray-900">{stats.maxDepth}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-500">Платных участников</div>
            <div className="text-2xl font-bold text-green-600">{stats.paidMembers}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="text-sm text-gray-500">Основателей</div>
            <div className="text-2xl font-bold text-purple-600">{stats.founders}</div>
          </div>
        </div>
      )}

      {/* Два топа */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3">🏆 Топ по прямым рефералам</h3>
            <ul className="space-y-2">
              {stats.topByDirect.map((item, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="font-mono">{item.phone}</span>
                  <span className="font-bold text-blue-600">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3">🌳 Топ по общим потомкам</h3>
            <ul className="space-y-2">
              {stats.topByTotal.map((item, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="font-mono">{item.phone}</span>
                  <span className="font-bold text-green-600">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Поиск */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          placeholder="🔍 Поиск по телефону..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Найти
        </button>
        <button
          type="button"
          onClick={() => { setSearchPhone(''); loadTree(); }}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Сбросить
        </button>
      </form>

      {/* Дерево */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        {tree.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Дерево пусто</div>
        ) : (
          tree.map(node => (
            <TreeNodeComponent key={node.id} node={node} depth={0} searchPath={searchPath} />
          ))
        )}
      </div>
    </div>
  );
}