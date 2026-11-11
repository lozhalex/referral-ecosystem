import { useNavigate } from 'react-router-dom';
import { Project } from '../data/projects';

interface ProjectCardProps {
  project: Project;
  isAuthorized: boolean;
}

const statusConfig = {
  available: {
    label: 'Доступен',
    bg: 'bg-neon-green/10',
    text: 'text-neon-green',
    dot: 'bg-neon-green',
    border: 'border-neon-green/20',
  },
  development: {
    label: 'В разработке',
    bg: 'bg-yellow-400/10',
    text: 'text-yellow-400',
    dot: 'bg-yellow-400',
    border: 'border-yellow-400/20',
  },
  planned: {
    label: 'В планах',
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    dot: 'bg-slate-500',
    border: 'border-slate-500/20',
  },
};

export default function ProjectCard({ project, isAuthorized }: ProjectCardProps) {
  const navigate = useNavigate();
  const config = statusConfig[project.status];

  const handleClick = () => {
    if (project.status === 'planned') {
      alert('Этот проект скоро будет доступен! Следите за обновлениями.');
      return;
    }

    if (project.status === 'available' && !isAuthorized) {
      localStorage.setItem('redirectAfterLogin', project.route);
      navigate('/login');
      return;
    }

    navigate(project.route);
  };

  return (
    <div
      className="glass p-5 hover:bg-white/10 transition-all duration-300 flex flex-col h-full border border-white/5 cursor-pointer group"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl">{project.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate font-display">{project.title}</h3>
          <span
            className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} shadow-[0_0_5px_currentColor]`}></span>
            {config.label}
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4 flex-1">{project.description}</p>

      {project.status === 'development' && project.progress !== undefined && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Готовность</span>
            <span>{project.progress}%</span>
          </div>
          <div className="w-full bg-dark-900/50 rounded-full h-2 border border-white/5">
            <div
              className="bg-gradient-to-r from-neon-purple to-neon-cyan h-2 rounded-full transition-all shadow-[0_0_10px_rgba(139,92,246,0.5)]"
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
        className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 ${
          project.status === 'available'
            ? 'btn-neon'
            : 'bg-white/5 text-slate-400 cursor-not-allowed border border-white/10'
        }`}
      >
        {project.status === 'available' ? (
          <>
            Открыть
            <span>▶</span>
          </>
        ) : (
          'Скоро'
        )}
      </button>
    </div>
  );
}