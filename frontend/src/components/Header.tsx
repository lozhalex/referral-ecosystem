import { useNavigate } from 'react-router-dom';

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
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <img src="/logo-mark.svg" alt="Бумеранг" className="h-8 w-auto" />
            <span className="text-xl font-bold text-white font-display">Бумеранг</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden sm:block text-sm text-slate-300">
                  Привет, {user.phone}
                </span>
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
        <div className="pb-3 text-center">
          <p className="text-sm text-slate-400 italic">
            Всё возвращается. Одна экосистема жизни.
          </p>
        </div>
      </div>
    </header>
  );
}