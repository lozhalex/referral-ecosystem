import { useNavigate } from 'react-router-dom';
import { Key, Wallet, Users, Car, Ticket, ShieldCheck } from 'lucide-react';

export default function HomeGuest() {
  const navigate = useNavigate();

  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 overflow-x-hidden">
      {/* ==========================================
          БЛОК 1: HERO (Первый экран)
      ========================================== */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        {/* Анимированные фоновые пятна */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold font-display tracking-tight bg-gradient-to-r from-purple-400 via-white to-cyan-400 bg-clip-text text-transparent">
            Бумеранг — закрытый клуб сервисов для своих.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Помощник автомобилиста с умным прогнозом ТО. Билеты на закрытые мероприятия. 
            Кэшбек и бонусы за каждого приглашённого друга. Всё — в одном аккаунте.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all transform hover:scale-105"
            >
              У меня есть приглашение
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-gray-300 rounded-xl font-medium text-lg hover:bg-white/10 hover:border-white/20 transition-all"
            >
              Как получить доступ?
            </button>
          </div>

          <div className="pt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">👥 22 участника</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full" />
            <span className="flex items-center gap-2">🚗 3 авто на учёте</span>
          </div>
        </div>
      </section>

      {/* ==========================================
          БЛОК 2: Что такое Бумеранг
      ========================================== */}
      <section className="py-20 px-4 bg-slate-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-white">
              Одна экосистема. Один аккаунт. Безлимит возможностей.
            </h2>
            <p className="text-gray-400 max-w-3xl mx-auto text-lg">
              Бумеранг — это закрытая экосистема сервисов. Вы регистрируетесь один раз 
              и получаете доступ ко всем модулям с единым балансом и реферальной системой.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Key, title: 'Единый аккаунт', desc: 'Одна регистрация, мгновенный доступ ко всем сервисам экосистемы' },
              { icon: Wallet, title: 'Кэшбек в каждом сервисе', desc: 'Возвращаем бонусы за активность. Копите и тратьте внутри клуба' },
              { icon: Users, title: 'Реферальная система', desc: 'Приглашайте друзей и получайте бонусы за каждого нового участника' }
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-slate-900/50 border border-white/10 rounded-2xl hover:border-purple-500/30 transition-all duration-300 group">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors mx-auto">
                  <item.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          БЛОК 3: Активные модули (Витрина)
      ========================================== */}
      <section className="py-20 px-4 bg-slate-900/30 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-4">Доступно прямо сейчас</h2>
            <p className="text-gray-400">Начните пользоваться экосистемой уже сегодня</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              { 
                icon: Car, 
                title: 'Помощник автомобилиста', 
                desc: 'Умный прогноз ТО, журнал обслуживания и QR-доступ для сервисменов.',
                redirect: '/auto'
              },
              { 
                icon: Ticket, 
                title: 'Билеты на мероприятия', 
                desc: 'Доступ к закрытым событиям. QR-код на входе и кэшбек за участие.',
                redirect: '/events'
              }
            ].map((module, idx) => (
              <div 
                key={idx}
                onClick={() => navigate(`/login?redirect=${module.redirect}`)}
                className="group relative p-8 bg-slate-900 border border-white/10 rounded-2xl cursor-pointer hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="absolute top-4 right-4 px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20">
                  АКТИВЕН
                </div>
                <div className="w-14 h-14 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 transition-colors">
                  <module.icon className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{module.title}</h3>
                <p className="text-gray-400 mb-6 leading-relaxed">{module.desc}</p>
                <div className="flex items-center text-cyan-400 font-medium group-hover:translate-x-2 transition-transform">
                  Войти в модуль <span className="ml-2">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          БЛОК 4: Преимущества
      ========================================== */}
      <section className="py-20 px-4 bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-4">Почему выбирают Бумеранг</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: ShieldCheck, title: 'Умный прогноз ТО', desc: 'Автохелпер сам напомнит, когда менять масло, проверять тормоза и продлевать ОСАГО. Больше никаких забытых ТО и штрафов.' },
              { icon: Ticket, title: 'Закрытые мероприятия', desc: 'Доступ к эксклюзивным событиям, которых нет в открытой продаже. Билеты прямо в телефоне, QR-код на входе.' },
              { icon: Wallet, title: 'Кэшбек в каждом сервисе', desc: 'Возвращаем бонусы за каждый сервис экосистемы. Копите и тратьте внутри Бумеранга.' },
              { icon: Users, title: 'Приглашай друзей', desc: 'Получайте бонусы за каждого приглашённого друга. Стройте свою сеть внутри закрытого клуба.' }
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-slate-900/60 backdrop-blur border border-white/10 rounded-2xl hover:border-purple-500/40 transition-all duration-300 group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/20 transition-colors">
                    <item.icon className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          БЛОК 5: Как это работает
      ========================================== */}
      <section id="how-it-works" className="py-20 px-4 bg-slate-900/30 border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-white mb-12">Как начать пользоваться</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Соединительная линия для десктопа */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-purple-500/50 to-cyan-500/50" />
            
            {[
              { step: '01', title: 'Регистрация по приглашению', desc: 'Введите номер телефона и реферальный код друга' },
              { step: '02', title: 'Получите доступ к модулям', desc: 'Выберите, какие сервисы экосистемы нужны вам прямо сейчас' },
              { step: '03', title: 'Пользуйтесь и зарабатывайте', desc: 'Получайте кэшбек за активности и бонусы за приглашённых друзей' }
            ].map((item, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 bg-slate-900 border-2 border-purple-500/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-500/10">
                  <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================
          БЛОК 6: Финальный CTA
      ========================================== */}
      <section className="py-24 px-4 bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold font-display text-white">
            Готовы присоединиться к клубу?
          </h2>
          <p className="text-gray-400 text-lg">
            Получите приглашение от друга или оставьте заявку на доступ к экосистеме.
          </p>
          
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:shadow-xl hover:shadow-purple-500/30 transition-all transform hover:scale-105"
            >
              Получить приглашение
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-500 hover:text-cyan-400 transition-colors underline underline-offset-4"
            >
              Уже есть код приглашения? Войти
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}