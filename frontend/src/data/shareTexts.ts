export interface ShareText {
  id: string;
  text: string;
  tone: 'rational' | 'emotional' | 'short';
}

export interface ModuleShareTexts {
  moduleId: string;
  moduleName: string;
  texts: ShareText[];
}

export const SHARE_TEXTS: Record<string, ModuleShareTexts> = {
  auto: {
    moduleId: 'auto',
    moduleName: 'Помощник автомобилиста',
    texts: [
      {
        id: 'auto-rational',
        tone: 'rational',
        text: 'Пользуюсь приложением «Помощник автомобилиста» — само считает средний пробег, прогнозирует, когда менять масло и когда заканчивается ОСАГО. Больше не забываю про ТО. Попробуй, регистрация бесплатная: {link}'
      },
      {
        id: 'auto-emotional',
        tone: 'emotional',
        text: 'Нашёл крутое приложение для водителей 🚗 Напоминает про ТО, считает расходы, даже полис ОСАГО не даст пропустить. Реально удобно, рекомендую: {link}'
      },
      {
        id: 'auto-short',
        tone: 'short',
        text: 'Перестал забывать про ТО — приложение само напоминает 🛠 Попробуй: {link}'
      }
    ]
  },
  events: {
    moduleId: 'events',
    moduleName: 'Билеты на мероприятия',
    texts: [
      {
        id: 'events-rational',
        tone: 'rational',
        text: 'Купил билет на мероприятие через приложение «Бумеранг» — QR-код прямо в телефоне, на входе сканируют за секунду. Без бумажных билетов и очередей: {link}'
      },
      {
        id: 'events-emotional',
        tone: 'emotional',
        text: 'Сходил на крутое мероприятие 🎟 Билет покупал через приложение — всё удобно, ничего не потерялось. Зацени: {link}'
      },
      {
        id: 'events-short',
        tone: 'short',
        text: 'Билеты на события теперь в телефоне 📱 Удобно: {link}'
      }
    ]
  }
};

export const getShareTexts = (moduleId: string): ModuleShareTexts | undefined => {
  return SHARE_TEXTS[moduleId];
};

export const getReferralLink = (moduleId: string, phone: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/${moduleId}?ref=${encodeURIComponent(phone)}`;
};