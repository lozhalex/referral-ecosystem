import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  user: { phone: string; role: string } | null;
  onLogout: () => void;
}

export default function Header({ user, onLogout }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <span className="text-2xl">🎨</span>
            <span className="text-xl font-bold text-gray-900">Краски жизни</span>
          </div>

          {/* Кнопки */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden sm:block text-sm text-gray-600">
                  Привет, {user.phone}
                </span>
                <button
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Профиль
                </button>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Войти
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  Регистрация
                </button>
              </>
            )}
          </div>
        </div>

        {/* Слоган */}
        <div className="pb-3 text-center">
          <p className="text-sm text-gray-500 italic">
            Все цвета радости. Одна экосистема жизни.
          </p>
        </div>
      </div>
    </header>
  );
}