import { useNavigate } from 'react-router-dom';
import { Project } from '../data/projects';

interface ProjectCardProps {
  project: Project;
  isAuthorized: boolean;
}

const statusConfig = {
  available: {
    label: 'Доступен',
    bg: 'bg-green-100',
    text: 'text-green-800',
    dot: 'bg-green-500',
  },
  development: {
    label: 'В разработке',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    dot: 'bg-yellow-500',
  },
  planned: {
    label: 'В планах',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
};

export default function ProjectCard({ project, isAuthorized }: ProjectCardProps) {
  const navigate = useNavigate();
  const config = statusConfig[project.status];

  const handleClick = () => {
    // 1. Сначала проверяем статус
    if (project.status === 'planned') {
      alert('Этот проект скоро будет доступен! Следите за обновлениями.');
      return;
    }

    // 2. Для development и available — переходим на страницу проекта
    // (development покажет заглушку, available — реальный функционал)
    if (project.status === 'available' && !isAuthorized) {
      // Только для доступных проектов требуем авторизацию
      localStorage.setItem('redirectAfterLogin', project.route);
      navigate('/login');
      return;
    }

    // development — пускаем всех (заглушка покажет прогресс)
    // available + авторизован — пускаем в проект
    navigate(project.route);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{project.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{project.title}</h3>
          <span className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
            {config.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 flex-1">{project.description}</p>

      {project.status === 'development' && project.progress !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Готовность</span>
            <span>{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <button
        onClick={handleClick}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition ${
          project.status === 'available'
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-500 cursor-not-allowed'
        }`}
      >
        {project.status === 'available' ? 'Открыть ▶' : 'Скоро'}
      </button>
    </div>
  );
}