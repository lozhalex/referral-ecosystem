export type ProjectStatus = 'available' | 'development' | 'planned';

export interface Project {
  id: string;
  icon: string;
  title: string;
  description: string;
  status: ProjectStatus;
  route: string;
  stage: 1 | 2 | 3 | 4;
  progress?: number;
}

export const projects: Project[] = [
  // === ЭТАП 1: Фундамент ===
  {
    id: 'auto',
    icon: '🚗',
    title: 'Помощник автомобилиста',
    description: 'Базовый сервис для автовладельцев',
    status: 'available',
    route: '/auto',
    stage: 1,
  },

  // === ЭТАП 2: Синергия ===
  {
    id: 'daylabor',
    icon: '👷',
    title: 'Разнорабочие',
    description: 'Биржа срочных подработок на 1 день',
    status: 'development',
    progress: 0,
    route: '/daylabor',
    stage: 2,
  },
  {
    id: 'poh',
    icon: '🔧',
    title: 'Обслуживание жилья',
    description: 'Мелкий ремонт и бытовая помощь',
    status: 'development',
    progress: 0,
    route: '/poh',
    stage: 2,
  },
  {
    id: 'gruzchiki',
    icon: '🚚',
    title: 'Грузчики и перевозки',
    description: 'Переезды и перевозка грузов',
    status: 'development',
    progress: 0,
    route: '/gruzchiki',
    stage: 2,
  },
  {
    id: 'carpooling',
    icon: '🛣️',
    title: 'Карпулинг',
    description: 'Совместные междугородние поездки',
    status: 'development',
    progress: 0,
    route: '/carpooling',
    stage: 2,
  },
  {
    id: 'tickets',
    icon: '🎟️',
    title: 'Билеты на мероприятия',
    description: 'Кэшбек за посещение + бонус рефереру',
    status: 'development',
    progress: 15,
    route: '/tickets',
    stage: 2,
  },

  // === ЭТАП 3: Дом и Жильё ===
  {
    id: 'housing',
    icon: '🏘️',
    title: 'Аренда и коливинг',
    description: 'Долгосрочная аренда и поиск соседей',
    status: 'planned',
    route: '/housing',
    stage: 3,
  },
  {
    id: 'booking',
    icon: '🏡',
    title: 'Посуточное бронирование',
    description: 'Аукционная модель бронирования жилья',
    status: 'planned',
    route: '/booking',
    stage: 3,
  },

  // === ЭТАП 4: Досуг и нишевые ===
  {
    id: 'glamping',
    icon: '⛺',
    title: 'Глэмпинги',
    description: 'Бронирование отдыха на природе',
    status: 'planned',
    route: '/glamping',
    stage: 4,
  },
  {
    id: 'travel',
    icon: '🌍',
    title: 'Совместные путешествия',
    description: 'Поиск компаньонов для туров',
    status: 'planned',
    route: '/travel',
    stage: 4,
  },
  {
    id: 'building',
    icon: '🏗️',
    title: 'Совместное строительство',
    description: 'Объединение ресурсов и закупка материалов',
    status: 'planned',
    route: '/building',
    stage: 4,
  },
  {
    id: 'eco',
    icon: '🌱',
    title: 'Эко-поселение',
    description: 'Социальный проект для жизни за городом',
    status: 'planned',
    route: '/eco',
    stage: 4,
  },
  {
    id: 'dating',
    icon: '💑',
    title: 'Знакомства',
    description: 'Социальный модуль на основе интересов',
    status: 'planned',
    route: '/dating',
    stage: 4,
  },
];