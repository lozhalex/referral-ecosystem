export interface Category {
  key: string;
  name: string;
  isPredictable: boolean; // Показывается в прогнозе на главной
  isTimeBased: boolean;   // Интервал в месяцах, а не в км
  defaultInterval: number; // Интервал по умолчанию (км или месяцы)
}

export const CATEGORIES: Category[] = [
  // === ПРОГНОЗИРУЕМЫЕ (ПР) ===
  
  // Двигатель и ТО
  { key: 'to', name: 'Регламентное ТО', isPredictable: true, isTimeBased: false, defaultInterval: 10000 },
  { key: 'oil_engine', name: 'Масло двигателя + фильтр', isPredictable: true, isTimeBased: false, defaultInterval: 7500 },
  { key: 'filters_air_cabin', name: 'Воздушный и салонный фильтры', isPredictable: true, isTimeBased: false, defaultInterval: 15000 },
  { key: 'fuel_filter', name: 'Топливный фильтр', isPredictable: true, isTimeBased: false, defaultInterval: 30000 },
  { key: 'spark_plugs', name: 'Свечи зажигания', isPredictable: true, isTimeBased: false, defaultInterval: 30000 },
  { key: 'timing_belt', name: 'Ремень/цепь ГРМ и ролики', isPredictable: true, isTimeBased: false, defaultInterval: 60000 },
  
  // Трансмиссия
  { key: 'transmission_oil', name: 'Масло в КПП', isPredictable: true, isTimeBased: false, defaultInterval: 60000 },
  { key: 'transfer_case_oil', name: 'Масло в раздатке и редукторах', isPredictable: true, isTimeBased: false, defaultInterval: 60000 },
  
  // Тормозная система и подвеска
  { key: 'brake_pads_front', name: 'Тормозные колодки передние', isPredictable: true, isTimeBased: false, defaultInterval: 30000 },
  { key: 'brake_pads_rear', name: 'Тормозные колодки задние', isPredictable: true, isTimeBased: false, defaultInterval: 40000 },
  { key: 'brake_discs', name: 'Тормозные диски', isPredictable: true, isTimeBased: false, defaultInterval: 60000 },
  { key: 'brake_fluid', name: 'Тормозная жидкость', isPredictable: true, isTimeBased: true, defaultInterval: 24 }, // 24 месяца
  { key: 'shocks', name: 'Амортизаторы и стойки', isPredictable: true, isTimeBased: false, defaultInterval: 80000 },
  { key: 'silent_blocks', name: 'Сайлентблоки и рычаги', isPredictable: true, isTimeBased: false, defaultInterval: 80000 },
  { key: 'ball_joints', name: 'Шаровые опоры', isPredictable: true, isTimeBased: false, defaultInterval: 80000 },
  
  // Охлаждение и климат
  { key: 'antifreeze', name: 'Антифриз / Охлаждающая жидкость', isPredictable: true, isTimeBased: true, defaultInterval: 36 }, // 36 месяцев
  { key: 'ac_recharge', name: 'Заправка кондиционера', isPredictable: true, isTimeBased: true, defaultInterval: 24 }, // 24 месяца
  { key: 'ac_filter', name: 'Фильтр кондиционера', isPredictable: true, isTimeBased: false, defaultInterval: 15000 },
  
  // === НЕПРОГНОЗИРУЕМЫЕ (НП) - только в журнале ===
  { key: 'wheel_bearings', name: 'Ступичные подшипники', isPredictable: false, isTimeBased: false, defaultInterval: 100000 },
  { key: 'cooling_hoses', name: 'Патрубки системы охлаждения', isPredictable: false, isTimeBased: false, defaultInterval: 100000 },
  { key: 'battery', name: 'Аккумулятор (АКБ)', isPredictable: false, isTimeBased: true, defaultInterval: 48 }, // 48 месяцев
  { key: 'starter_generator', name: 'Генератор / стартер', isPredictable: false, isTimeBased: false, defaultInterval: 150000 },
  { key: 'tire_service', name: 'Шиномонтаж и балансировка', isPredictable: false, isTimeBased: false, defaultInterval: 10000 },
  { key: 'wheel_alignment', name: 'Развал-схождение', isPredictable: false, isTimeBased: false, defaultInterval: 20000 },
  { key: 'other', name: 'Прочее', isPredictable: false, isTimeBased: false, defaultInterval: 20000 }
];

// Интервалы по умолчанию (для инициализации настроек пользователя)
export const DEFAULT_INTERVALS: Record<string, number> = {};
CATEGORIES.forEach(cat => {
  DEFAULT_INTERVALS[cat.key] = cat.defaultInterval;
});

// Получить название категории по ключу
export function getCategoryName(key: string): string {
  const found = CATEGORIES.find(c => c.key === key);
  return found ? found.name : key;
}

// Получить только прогнозируемые категории
export function getPredictableCategories(): Category[] {
  return CATEGORIES.filter(c => c.isPredictable);
}

// Получить только непрогнозируемые категории
export function getNonPredictableCategories(): Category[] {
  return CATEGORIES.filter(c => !c.isPredictable);
}

// Получить категорию по ключу
export function getCategoryByKey(key: string): Category | undefined {
  return CATEGORIES.find(c => c.key === key);
}