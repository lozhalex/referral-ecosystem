export const CATEGORIES = [
  { key: 'to', name: 'ТО' },
  { key: 'oil_engine', name: 'Замена масла в двигателе' },
  { key: 'oil_trans', name: 'Замена масла в коробке передач' },
  { key: 'filters', name: 'Фильтры' },
  { key: 'brakes', name: 'Тормозная система' },
  { key: 'belts', name: 'Ремни/ролики' },
  { key: 'cooling', name: 'Охлаждающая система' },
  { key: 'tires', name: 'Шины/колёса' },
  { key: 'electrics', name: 'Электрика' },
  { key: 'ac', name: 'Кондиционер' },
  { key: 'other', name: 'Прочее / Другое' }
];

export const DEFAULT_INTERVALS: Record<string, number> = {
  to: 10000,
  oil_engine: 7500,
  oil_trans: 60000,
  filters: 15000,
  brakes: 30000,
  belts: 60000,
  cooling: 40000,
  tires: 20000,
  electrics: 50000,
  ac: 20000,
  other: 20000
};

export function getCategoryName(key: string): string {
  const found = CATEGORIES.find(c => c.key === key);
  return found ? found.name : key;
}