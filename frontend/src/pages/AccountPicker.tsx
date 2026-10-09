import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../api/client'
import type { Persona, ScenarioInfo } from '../api/types'
import Icon from '../components/Icon'
import ScrollStory from '../components/comic/ScrollStory'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import { AVATAR_GRADIENT, rub } from '../lib'

const TAGS: Record<string, string> = {
  artem: 'Вербовка в дропы',
  dima: 'Угрозы после перевода',
  katya: 'Первая зарплата',
  sonya: 'Переход в 14 лет',
  lev: '«Пушкинская карта»',
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

// Главная: комикс (проблема → «Старт») → почему сейчас → что умеет → алгоритм → сценарии
export default function AccountPicker() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-page/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-3 sm:px-8">
          <Logo size={34} />
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button onClick={() => scrollTo('how')} className="chip hidden hover:bg-line sm:inline-flex">Как это работает</button>
            <button onClick={() => scrollTo('scenarios')} className="chip bg-brand text-white hover:brightness-110">
              <Icon name="play" size={14} /> Сценарии
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main>
      <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
        <section className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand">Раздел ВТБ Онлайн для 14–22 лет</p>
          <h1 className="mt-4 max-w-[900px] text-[38px] font-extrabold leading-[1.05] tracking-tight sm:text-[64px]">
            В 14 детский банк заканчивается. <span className="bg-gradient-to-r from-brand to-pink bg-clip-text text-transparent">Вербовщики — нет.</span>
          </h1>
          <p className="mt-5 max-w-[620px] text-lg leading-relaxed text-muted">
            «Старт» — буфер между детским и взрослым банком: защищает подростка, когда его пытаются использовать, и учит обращаться с первыми деньгами.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={() => scrollTo('story')} className="btn-primary">Прочитать историю</button>
            <button onClick={() => scrollTo('scenarios')} className="btn-ghost"><Icon name="play" size={16} /> Сразу к сценариям</button>
          </div>
          <button onClick={() => scrollTo('story')} className="mt-14 grid size-11 animate-bounce place-items-center rounded-full bg-surface text-muted" style={{ boxShadow: 'var(--shadow-card)' }} aria-label="К истории">
            <Icon name="chevron" className="rotate-90" />
          </button>
        </section>
      </div>
      <ScrollStory onScenarios={() => scrollTo('scenarios')} />
      <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
        <WhyNow />
        <Features />
        <Algorithm />
        <Scenarios />
      </div>
      </main>
      <footer className="mx-auto max-w-[1180px] px-4 pb-10 pt-6 text-sm text-muted sm:px-8">
        «Старт» — концепт молодёжного раздела для ВТБ Онлайн, команда nexus. Данные в демо синтетические. Это не юридическая консультация.
      </footer>
    </div>
  )
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="max-w-[760px]">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-[30px] font-extrabold leading-[1.1] tracking-tight sm:text-[42px]">{title}</h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-muted">{text}</p>}
    </div>
  )
}

// ---------- Почему ВТБ и почему сейчас ----------
function WhyNow() {
  const stats = [
    ['×4', 'выросла у ВТБ доля выявленных дропов 14–17 лет', 'I кв. 2026 к I кв. 2025, по данным СМИ'],
    ['> 50%', 'людей в базе дропов ЦБ моложе 25 лет', 'Банк России, сент. 2026, по данным СМИ'],
    ['24%', 'молодых людей знают, что ответственность наступает с 16 лет', 'опрос команды, n = 25'],
  ]
  return (
    <section className="py-16 sm:py-20">
      <SectionTitle
        eyebrow="Почему ВТБ и почему сейчас"
        title="Банк под прицелом вербовщиков — а молодёжи у него всё больше"
        text="У ВТБ больше 4 млн клиентов 14–25 лет, а с 2026 года он ещё и оператор «Пушкинской карты». Каждый из них — цель для вербовщиков. «Старт» защищает их там, где они уже есть."
      />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {stats.map(([n, text, src]) => (
          <div key={text} className="card p-6">
            <div className="bg-gradient-to-r from-brand to-pink bg-clip-text text-[48px] font-extrabold leading-none text-transparent">{n}</div>
            <p className="mt-3 text-[16px] font-semibold leading-snug">{text}</p>
            <p className="mt-3 text-xs text-muted">{src}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Что умеет «Старт» ----------
function Features() {
  const items = [
    {
      img: '/landing/intercept.webp',
      alt: 'Экран «Перевод остановлен» с причинами, последствиями и кнопками',
      title: 'Перехват с объяснением',
      text: 'Когда деньги незнакомца пытаются переслать дальше, перевод останавливается. Вместо «операция отклонена» — почему банк так решил, что грозит владельцу карты и понятные кнопки: отменить, «мне предложили подработку», позвонить в банк.',
    },
    {
      img: '/landing/sos.webp',
      alt: '«Безопасный выход»: шаги с кнопками и юридическим основанием',
      title: '«Безопасный выход»',
      text: 'Если чужие деньги уже пришли или подросток успел их переслать: план по шагам без осуждения. Вернуть через банк одной кнопкой, приложить скриншоты переписки, получить черновик обращения. У каждого юридического шага — источник.',
    },
    {
      img: '/landing/shield.webp',
      alt: 'Щит: проверка сообщения вербовщика, риск высокий и признаки',
      title: 'Щит: проверка сообщений',
      text: 'Вставьте текст или скриншот из мессенджера — модель покажет, похоже ли это на вербовку или мошенничество, и какие признаки её насторожили.',
    },
  ]
  return (
    <section className="py-16 sm:py-24">
      <SectionTitle eyebrow="Что умеет «Старт»" title="Помогает тогда, когда это действительно нужно" />
      <div className="mt-10 space-y-6">
        {items.map((f, i) => (
          <div key={f.title} className={`card grid items-center gap-6 overflow-hidden p-6 sm:p-10 md:grid-cols-2 ${i % 2 ? 'md:[&>img]:order-first' : ''}`}>
            <div>
              <h3 className="text-[26px] font-extrabold leading-tight sm:text-[30px]">{f.title}</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-muted">{f.text}</p>
            </div>
            <img src={f.img} alt={f.alt} className="mx-auto max-h-[460px] w-auto rounded-3xl bg-page object-contain" style={{ boxShadow: 'var(--shadow-card)' }} />
          </div>
        ))}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['book', 'Истории по событию', 'Первая зарплата — про НДФЛ, третья подписка — сколько они стоят за год. С XP и уровнями.'],
            ['game', 'Квест «А что было бы, если…»', 'Переписка с вербовщиком, где ответы выбираете вы — и видите, чем это кончается.'],
            ['chat', 'Ассистент Бит', 'Отвечает на вопросы про деньги и безопасность, подсказывает следующий шаг.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="card p-6">
              <Icon name={icon} className="text-brand" />
              <div className="mt-3 font-bold">{title}</div>
              <div className="mt-1 text-sm leading-relaxed text-muted">{text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ---------- Алгоритм ----------
function Algorithm() {
  return (
    <section id="how" className="scroll-mt-20 py-16 sm:py-20">
      <SectionTitle eyebrow="Как это работает" title="Два этапа: заметить и остановить" />
      <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="card p-6 sm:p-8">
          <div className="text-sm font-bold text-sky">Этап 1 · Зачисление</div>
          <h3 className="mt-2 text-xl font-bold">Сравниваем с обычным поведением</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">
            Банк знает ваш профиль: от кого обычно приходят деньги и сколько. 30 000 ₽ от незнакомца — в 20 раз больше обычного —
            помечаются «под проверкой», и банк предупреждает. Не блокирует: запретить получить деньги нельзя.
          </p>
        </div>
        <div className="hidden place-items-center md:grid">
          <Icon name="next" className="text-muted" />
        </div>
        <div className="rounded-[28px] p-6 text-white sm:p-8" style={{ background: 'linear-gradient(135deg, #5b3df5, #ff5fa2)' }}>
          <div className="text-sm font-bold text-white/85">Этап 2 · Перевод</div>
          <h3 className="mt-2 text-xl font-bold">Ловим транзит</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-white/90">
            Модель CatBoost оценивает перевод: сколько пришло от незнакомцев, какую долю пересылают и как быстро. Риск от 0,7 — перевод
            останавливается, причины объясняются человеческим языком.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          ['shield', 'Решают модели', 'Опасно или нет, решают измеримые модели. Языковая модель только объясняет; без неё — готовые тексты.'],
          ['eye', 'Честно про данные', 'Демо на синтетических данных. В банке модели дообучаются на подтверждённых случаях.'],
          ['lock', 'В контуре банка', 'Всё работает внутри банка, данные клиентов наружу не уходят.'],
        ].map(([icon, title, text]) => (
          <div key={title} className="card flex gap-3 p-5">
            <Icon name={icon} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <div className="font-bold">{title}</div>
              <div className="mt-1 text-sm leading-relaxed text-muted">{text}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Сценарии: вход в кабинет ----------
function Scenarios() {
  const navigate = useNavigate()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.personas(), api.scenarios()])
      .then(([p, s]) => {
        setPersonas(p)
        setScenarios(s)
      })
      .catch(() => setError('Не удалось подключиться к серверу. Запустите бэкенд: uvicorn app.main:app'))
  }, [])

  return (
    <section id="scenarios" className="scroll-mt-20 py-16 sm:py-24">
      <SectionTitle
        eyebrow="Попробуйте сами"
        title="Посмотрите сценарии"
        text="Выберите аккаунт и нажмите «Проиграть сценарий» — или пополняйте, переводите и платите сами и смотрите, как реагирует алгоритм."
      />
      {error && <div className="card mt-6 p-5 text-risk-high">{error}</div>}
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {personas.map((p, i) => {
          const scenario = scenarios.find((s) => s.persona === p.id)
          return (
            <button
              key={p.id}
              onClick={async () => {
                // Каждый вход — с чистого листа: история из content/personas.json
                await api.resetPersona(p.id).catch(() => null)
                navigate(`/u/${p.id}`)
              }}
              className="card animate-rise group flex flex-col p-6 text-left transition hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-2xl text-2xl font-extrabold text-white" style={{ background: AVATAR_GRADIENT[p.id] }}>
                  {p.name[0]}
                </div>
                <div>
                  <div className="text-xl font-bold">{p.name}, {p.age}</div>
                  <div className="text-sm text-muted">Баланс {rub(p.balance)}</div>
                </div>
              </div>
              <p className="mt-5 flex-1 text-[15px] leading-relaxed text-ink/80">{p.description}</p>
              {scenario && (
                <div className="mt-5 rounded-2xl bg-page p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Сценарий</div>
                  <div className="mt-1 font-semibold">{scenario.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="chip bg-brand-soft px-2.5 py-1 text-xs text-brand">{TAGS[p.id]}</span>
                    <span className="chip bg-white px-2.5 py-1 text-xs text-muted">{scenario.steps_count} шагов</span>
                  </div>
                </div>
              )}
              <div className="mt-5 flex items-center justify-between font-semibold text-brand">
                Войти в аккаунт
                <span className="grid size-10 place-items-center rounded-full bg-brand text-white transition group-hover:translate-x-1">
                  <Icon name="send" size={18} />
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
