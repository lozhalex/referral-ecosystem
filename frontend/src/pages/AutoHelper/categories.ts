export interface CategoryConfig {
  key: string;
  name: string;
  defaultInterval: number; // в км или месяцах
  isTimeBased: boolean; // true = интервал в месяцах, false = в км
  isPredictable: boolean; // показывается ли на главной
  isFwdOnly?: boolean; // только для полного привода (масло в раздатке)
  isReglament?: boolean; // регламентное ТО (скрывается при пробеге > 100000)
  group: string; // группа для сортировки
}

export const CATEGORIES: CategoryConfig[] = [
  // === ДВИГАТЕЛЬ И ТО ===
  { key: 'reglament', name: 'Регламентное ТО', defaultInterval: 15000, isTimeBased: false, isPredictable: true, isReglament: true, group: 'engine' },
  { key: 'oil', name: 'Масло двигателя + фильтр', defaultInterval: 10000, isTimeBased: false, isPredictable: true, group: 'engine' },
  { key: 'air_filter', name: 'Воздушный и салонный фильтры', defaultInterval: 15000, isTimeBased: false, isPredictable: true, group: 'engine' },
  { key: 'fuel_filter', name: 'Топливный фильтр', defaultInterval: 30000, isTimeBased: false, isPredictable: true, group: 'engine' },
  { key: 'spark_plugs', name: 'Свечи зажигания', defaultInterval: 30000, isTimeBased: false, isPredictable: true, group: 'engine' },
  { key: 'timing_belt', name: 'Ремень/цепь ГРМ и ролики', defaultInterval: 60000, isTimeBased: false, isPredictable: true, group: 'engine' },

  // === ТРАНСМИССИЯ ===
  { key: 'transmission_oil', name: 'Масло в КПП', defaultInterval: 60000, isTimeBased: false, isPredictable: true, group: 'transmission' },
  { key: 'transfer_oil', name: 'Масло в раздатке и редукторах', defaultInterval: 60000, isTimeBased: false, isPredictable: true, isFwdOnly: true, group: 'transmission' },

  // === ТОРМОЗА И ПОДВЕСКА ===
  { key: 'brake_pads_front', name: 'Тормозные колодки передние', defaultInterval: 40000, isTimeBased: false, isPredictable: true, group: 'brakes' },
  { key: 'brake_pads_rear', name: 'Тормозные колодки задние', defaultInterval: 60000, isTimeBased: false, isPredictable: true, group: 'brakes' },
  { key: 'brake_discs', name: 'Тормозные диски', defaultInterval: 80000, isTimeBased: false, isPredictable: true, group: 'brakes' },
  { key: 'brake_fluid', name: 'Тормозная жидкость', defaultInterval: 24, isTimeBased: true, isPredictable: true, group: 'brakes' },
  { key: 'shock_absorbers', name: 'Амортизаторы и стойки', defaultInterval: 80000, isTimeBased: false, isPredictable: true, group: 'brakes' },
  { key: 'silentblocks', name: 'Сайлентблоки и рычаги', defaultInterval: 80000, isTimeBased: false, isPredictable: true, group: 'brakes' },
  { key: 'ball_joints', name: 'Шаровые опоры', defaultInterval: 80000, isTimeBased: false, isPredictable: true, group: 'brakes' },

  // === ОХЛАЖДЕНИЕ И КЛИМАТ ===
  { key: 'antifreeze', name: 'Антифриз', defaultInterval: 48, isTimeBased: true, isPredictable: true, group: 'cooling' },
  { key: 'ac_recharge', name: 'Заправка кондиционера', defaultInterval: 24, isTimeBased: true, isPredictable: true, group: 'cooling' },
  { key: 'ac_filter', name: 'Фильтр кондиционера', defaultInterval: 15000, isTimeBased: false, isPredictable: true, group: 'cooling' },

  // === ОСАГО (добавлено по запросу) ===
  { key: 'osago', name: 'ОСАГО', defaultInterval: 12, isTimeBased: true, isPredictable: true, group: 'insurance' },

  // === НЕПРОГНОЗИРУЕМЫЕ (только журнал) ===
  { key: 'wheel_bearings', name: 'Ступичные подшипники', defaultInterval: 0, isTimeBased: false, isPredictable: false, group: 'other' },
  { key: 'hoses', name: 'Патрубки системы охлаждения', defaultInterval: 0, isTimeBased: false, isPredictable: false, group: 'other' },
  { key: 'battery', name: 'Аккумулятор (АКБ)', defaultInterval: 0, isTimeBased: false, isPredictable: false, group: 'other' },
  { key: 'generator', name: 'Генератор / стартер', defaultInterval: 0, isTimeBased: false, isPredictable: false, group: 'other' },
  { key: 'tires', name: 'Шиномонтаж и балансировка', defaultInterval: 0, isTimeBased: false, isPredictable: false, group: 'other' },
  { key: 'alignment', name: 'Развал-схождение', defaultInterval: 0, isTimeBased: false, isPredictable: false, group: 'other' },
  { key: 'other', name: 'Прочее', defaultInterval: 0, isTimeBased: false, isPredictable: false, group: 'other' },
];

export const getCategoryName = (key: string): string => {
  return CATEGORIES.find(c => c.key === key)?.name || key;
};

export const getPredictableCategories = (isFwd: boolean = false, currentMileage: number = 0): CategoryConfig[] => {
  return CATEGORIES.filter(c => {
    if (!c.isPredictable) return false;
    if (c.isFwdOnly && !isFwd) return false;
    if (c.isReglament && currentMileage > 100000) return false;
    return true;
  });
};

export const DEFAULT_INTERVALS: Record<string, number> = {};
CATEGORIES.forEach(c => {
  DEFAULT_INTERVALS[c.key] = c.defaultInterval;
});