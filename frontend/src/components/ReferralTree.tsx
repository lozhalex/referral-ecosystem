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
  SUPER_ADMIN: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  admin: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  partner: 'bg-green-500/20 text-green-300 border-green-500/30',
  service_master: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  controller: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  cashier: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  user: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
};

function TreeNodeComponent({ node, depth, searchPath }: { node: TreeNode; depth: number; searchPath: number[] }) {
  const [expanded, setExpanded] = useState(depth < 3);
  const [children, setChildren] = useState<TreeNode[]>(node.children);
  const [loading, setLoading] = useState(false);

  const isOnSearchPath = searchPath.includes(node.id);

  const loadMoreChildren = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/admin/tree/visual', {
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
    <div className="ml-4 border-l-2 border-white/10 pl-4">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg transition ${
          isOnSearchPath ? 'bg-yellow-500/10 border border-yellow-500/30' : 'hover:bg-white/5'
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className={`px-2 py-1 rounded border text-xs font-medium ${ROLE_COLORS[node.role] || ROLE_COLORS.user}`}>
          {node.role}
        </span>
        <span className="font-mono text-sm text-gray-100">{node.phone}</span>
        <span className="text-xs text-gray-400">({node.referralCount} прямых, {node.totalDescendants} всего)</span>
        {node.isPaidMember && <span className="text-xs text-cyan-400">💎</span>}
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
              className="ml-6 mt-2 text-xs text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
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
    return <div className="p-8 text-center text-gray-400">Загрузка дерева...</div>;
  }

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-white/10">
            <div className="text-sm text-gray-400">Всего пользователей</div>
            <div className="text-2xl font-bold text-gray-100">{stats.totalUsers}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-white/10">
            <div className="text-sm text-gray-400">Максимальная глубина</div>
            <div className="text-2xl font-bold text-gray-100">{stats.maxDepth}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-white/10">
            <div className="text-sm text-gray-400">Платных участников</div>
            <div className="text-2xl font-bold text-green-400">{stats.paidMembers}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-white/10">
            <div className="text-sm text-gray-400">Основателей</div>
            <div className="text-2xl font-bold text-purple-400">{stats.founders}</div>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-white/10">
            <h3 className="font-bold text-gray-100 mb-3">🏆 Топ по прямым рефералам</h3>
            <ul className="space-y-2">
              {stats.topByDirect.map((item, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="font-mono text-gray-300">{item.phone}</span>
                  <span className="font-bold text-cyan-400">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-slate-900 p-4 rounded-xl border border-white/10">
            <h3 className="font-bold text-gray-100 mb-3">🌳 Топ по общим потомкам</h3>
            <ul className="space-y-2">
              {stats.topByTotal.map((item, idx) => (
                <li key={idx} className="flex justify-between text-sm">
                  <span className="font-mono text-gray-300">{item.phone}</span>
                  <span className="font-bold text-green-400">{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          placeholder="🔍 Поиск по телефону..."
          className="flex-1 px-4 py-2 bg-slate-900 border border-white/10 text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none placeholder-gray-500"
        />
        <button type="submit" className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition">
          Найти
        </button>
        <button
          type="button"
          onClick={() => { setSearchPhone(''); loadTree(); }}
          className="px-6 py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700 transition border border-white/10"
        >
          Сбросить
        </button>
      </form>

      <div className="bg-slate-900 p-6 rounded-xl border border-white/10">
        {tree.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Дерево пусто</div>
        ) : (
          tree.map(node => (
            <TreeNodeComponent key={node.id} node={node} depth={0} searchPath={searchPath} />
          ))
        )}
      </div>
    </div>
  );
}