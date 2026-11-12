import { Link, useNavigate } from 'react-router-dom';
import { hasRole } from '../utils/roles';

interface HeaderProps {
  user: { phone: string; role: string } | null;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="glass border-b border-white/10 sticky top-0 z-40 backdrop-blur-xl bg-dark-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <span className="text-2xl">🪃</span>
            <span className="text-xl font-bold text-white font-display">Бумеранг</span>
          </div>

          {/* Кнопки */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden sm:block text-sm text-slate-300">
                  Привет, {user.phone}
                </span>
                
                {/* ✅ НОВОЕ: Кнопка Админ-панели с гибкой проверкой ролей */}
                {hasRole(user.role, ['admin', 'SUPER_ADMIN']) && (
                  <Link
                    to="/admin"
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600/20 hover:bg-purple-600/30 rounded-xl transition border border-purple-500/30 flex items-center gap-2 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
                  >
                    ⚙️ Админ-панель
                  </Link>
                )}

                <button
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 text-sm font-medium text-slate-300 glass hover:bg-white/10 rounded-xl transition border border-white/10"
                >
                  Профиль
                </button>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500/10 hover:bg-red-500/20 rounded-xl transition border border-red-500/20"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-slate-300 glass hover:bg-white/10 rounded-xl transition border border-white/10"
                >
                  Войти
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm font-medium text-white btn-neon rounded-xl"
                >
                  Регистрация
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Слоган */}
        <div className="pb-3 text-center">
          <p className="text-sm text-slate-400 italic">
            Всё возвращается. Одна экосистема жизни.
          </p>
        </div>
      </div>
    </header>
  );
}