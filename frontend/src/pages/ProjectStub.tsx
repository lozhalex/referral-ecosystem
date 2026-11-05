import { useLocation, useNavigate } from 'react-router-dom';
import { projects } from '../data/projects';

const statusLabels: Record<string, string> = {
  available: '🟢 Доступен',
  development: '🟡 В разработке',
  planned: '⚪ В планах',
};

export default function ProjectStub() {
  const location = useLocation();
  const navigate = useNavigate();

  // Получаем ID проекта из пути (например, /tickets → "tickets")
  const projectId = location.pathname.replace(/^\//, '');
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Проект не найден</h1>
          <p className="text-gray-600 mb-6">
            Запрашиваемый проект не существует в системе.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">{project.icon}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.title}</h1>
        <p className="text-gray-600 mb-4">{project.description}</p>
        
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-6 ${
          project.status === 'available' ? 'bg-green-100 text-green-800' :
          project.status === 'development' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          {statusLabels[project.status]}
        </div>

        {project.status === 'available' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              🚧 Проект в стадии запуска. Скоро здесь появится полный функционал!
            </p>
          </div>
        )}

        {project.status === 'development' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800 mb-2">Идёт активная разработка</p>
            {project.progress !== undefined && (
              <div>
                <div className="flex justify-between text-xs text-yellow-700 mb-1">
                  <span>Прогресс</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {project.status === 'planned' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Проект запланирован. Мы сообщим о запуске.
            </p>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
        >
          ← Вернуться на главную
        </button>
      </div>
    </div>
  );
}