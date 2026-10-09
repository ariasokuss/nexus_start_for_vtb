import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../api/client'
import type { Persona, ScenarioInfo } from '../api/types'
import Icon from '../components/Icon'
import Logo from '../components/Logo'
import { AVATAR_GRADIENT, rub } from '../lib'

const TAGS: Record<string, string> = {
  artem: 'Вербовка в дропы',
  dima: 'Угрозы после перевода',
  katya: 'Первая зарплата',
  sonya: 'Переход в 14 лет',
  lev: '«Пушкинская карта»',
}

// Сообщения, которые подросток получает после 14 — из сценариев и опроса
const RECRUITER = ['Подработка без опыта, 3–5 тыс. в день', 'Сдай карту в аренду — 15 000 сразу', 'Придёт 30 тыс., перешли 27, 3 твои']

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

// Главная: проблема → решение → что умеет «Старт» → алгоритм → сценарии
export default function AccountPicker() {
  return (
    <div className="min-h-screen">
      <Hero />
      <main className="mx-auto max-w-[1180px] px-4 sm:px-8">
        <Danger />
        <Solution />
        <Features />
        <Algorithm />
        <Scenarios />
      </main>
      <footer className="mx-auto max-w-[1180px] px-4 pb-10 pt-6 text-sm text-muted sm:px-8">
        «Старт» — концепт молодёжного раздела для ВТБ Онлайн, команда nexus. Данные в демо синтетические. Это не юридическая консультация.
      </footer>
    </div>
  )
}

// ---------- 1. В 14 детский банк заканчивается ----------
function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute -right-40 -top-40 size-[520px] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, #5b3df5, transparent 70%)' }} />
      <div className="relative mx-auto max-w-[1180px] px-4 pb-16 sm:px-8 sm:pb-24">
        <header className="flex items-center justify-between py-6">
          <Logo />
          <button onClick={() => scrollTo('scenarios')} className="chip bg-white/10 text-white hover:bg-white/20">
            <Icon name="play" size={15} /> Сценарии
          </button>
        </header>

        <div className="mt-8 max-w-[820px] sm:mt-14">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-pink">Подросткам 14–22 лет</p>
          <h1 className="mt-4 text-[40px] font-extrabold leading-[1.04] tracking-tight sm:text-[64px]">
            В 14 лет детский банк заканчивается. Вербовщики — нет.
          </h1>
          <p className="mt-6 max-w-[640px] text-lg leading-relaxed text-white/75">
            Подросток выходит из детского режима: родительского контроля больше нет, взрослые функции ещё недоступны. Зато уже
            приходят сообщения про «лёгкий заработок», а через его карту пытаются провести чужие деньги.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={() => scrollTo('solution')} className="btn-primary">Что такое «Старт»</button>
            <button onClick={() => scrollTo('scenarios')} className="btn bg-white/10 text-white hover:bg-white/20">
              <Icon name="play" size={16} /> Посмотреть сценарии
            </button>
          </div>
        </div>

        <AgeLine bridged={false} />
      </div>
    </section>
  )
}

// Шкала возраста: «Детский банк» обрывается в 14; во втором блоке «Старт» перекрывает обрыв
function AgeLine({ bridged }: { bridged: boolean }) {
  return (
    <div className={`mt-14 ${bridged ? '' : 'sm:mt-20'}`} aria-label={bridged ? 'Детский банк, затем Старт с 14 до 22 лет, затем взрослый банк' : 'Детский банк заканчивается в 14 лет, дальше — пропасть'}>
      <div className="relative grid grid-cols-[8fr_9fr_3fr] items-end gap-1.5 sm:gap-2">
        <Segment label="«Детский банк»" sub="6–13 лет" tone={bridged ? 'soft' : 'kids'} />
        {bridged ? (
          <div className="relative">
            <div className="rounded-2xl px-3 py-4 text-white sm:px-5 sm:py-5" style={{ background: 'linear-gradient(135deg, #5b3df5, #ff5fa2)', boxShadow: '0 12px 40px rgb(91 61 245 / 0.35)' }}>
              <div className="text-[15px] font-extrabold sm:text-lg">«Старт»</div>
              <div className="text-xs text-white/85 sm:text-sm">14–22 года</div>
            </div>
          </div>
        ) : (
          <div className="relative h-[92px] sm:h-[100px]">
            {/* обрыв */}
            <div className="absolute inset-x-0 bottom-0 h-[3px] border-t-[3px] border-dashed border-white/25" />
            <div className="absolute bottom-3 left-0 text-xs font-semibold text-pink sm:text-sm">14 лет: здесь всё обрывается</div>
            {RECRUITER.map((m, i) => (
              <div
                key={m}
                className="animate-rise absolute hidden max-w-[260px] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[13px] text-ink shadow-lg md:block"
                style={{ left: `${8 + i * 30}%`, bottom: `${110 + (i % 2) * 58}px`, animationDelay: `${300 + i * 350}ms`, transform: `rotate(${i % 2 ? 2 : -2}deg)` }}
              >
                {m}
              </div>
            ))}
          </div>
        )}
        <Segment label="Взрослый банк" sub="после 22" tone={bridged ? 'soft' : 'adult'} />
      </div>
      {!bridged && (
        <div className="mt-6 grid gap-2 md:hidden">
          {RECRUITER.map((m) => (
            <div key={m} className="w-fit rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[13px] text-ink">{m}</div>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-[8fr_9fr_3fr] gap-2 text-xs font-semibold opacity-60">
        <span>6</span>
        <span>14</span>
        <span>22</span>
      </div>
    </div>
  )
}

function Segment({ label, sub, tone }: { label: string; sub: string; tone: 'kids' | 'adult' | 'soft' }) {
  const style =
    tone === 'kids' ? 'bg-sky/20 text-white border border-sky/40' : tone === 'adult' ? 'bg-white/10 text-white/70' : 'bg-white text-ink border border-line'
  return (
    <div className={`rounded-2xl px-3 py-4 sm:px-5 sm:py-5 ${style}`}>
      <div className="text-[13px] font-bold leading-tight sm:text-base">{label}</div>
      <div className="text-xs opacity-70 sm:text-sm">{sub}</div>
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

// ---------- 2. Пропасть: что там происходит ----------
function Danger() {
  const dangers = [
    ['users', 'Вербовка в дропы', 'Предлагают «подработку»: принять деньги на карту и переслать дальше. С 16 лет это уголовная статья 187 УК РФ.'],
    ['chat', 'Мошенники', '«Служба безопасности банка», «мам, я разбил телефон», выигрыши и предоплаты — подросток видит это впервые.'],
    ['lock', 'Молчаливые блокировки', 'Банк останавливает перевод без объяснений, а честный клиент не понимает, что случилось, и уходит.'],
  ]
  const stats = [
    ['> 50%', 'людей в базе дропов ЦБ моложе 25 лет', 'Банк России, сент. 2026, по данным СМИ'],
    ['36%', 'молодых людей получали предложения «подработки» через карту', 'опрос команды, n = 25'],
    ['24%', 'знают, что ответственность наступает с 16 лет', 'опрос команды, n = 25'],
  ]
  return (
    <section className="py-16 sm:py-24">
      <SectionTitle eyebrow="Что в пропасти" title="Опасности появляются раньше, чем защита" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {dangers.map(([icon, title, text]) => (
          <div key={title} className="card p-6">
            <span className="grid size-12 place-items-center rounded-2xl bg-risk-high/10 text-risk-high">
              <Icon name={icon} />
            </span>
            <h3 className="mt-4 text-xl font-bold">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {stats.map(([n, text, src]) => (
          <div key={text} className="rounded-[28px] bg-ink p-6 text-white">
            <div className="text-[44px] font-extrabold leading-none text-pink">{n}</div>
            <p className="mt-3 text-[15px] leading-relaxed text-white/85">{text}</p>
            <p className="mt-3 text-xs text-white/50">{src}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- 3. Решение ----------
function Solution() {
  return (
    <section id="solution" className="scroll-mt-6 rounded-[36px] bg-white p-6 sm:p-12" style={{ boxShadow: 'var(--shadow-card)' }}>
      <SectionTitle
        eyebrow="Решение"
        title="«Старт» — раздел для 14–22 лет в ВТБ Онлайн"
        text="Мост между детским и взрослым банком. Своя карта и копилка, финграмотность на реальных деньгах и защита, которая срабатывает в момент, когда подростка пытаются использовать."
      />
      <div className="text-ink">
        <AgeLine bridged />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          ['spark', 'Переход в 14 — в одно касание', 'Родитель подтверждает, цели, копилка и опыт переносятся.'],
          ['shield', 'Защита в момент события', 'Не памятка, а помощь, когда пришли чужие деньги или пишет вербовщик.'],
          ['piggy', 'Деньги и навыки', 'Копилка, цели, истории про НДФЛ и подписки — по событию, а не уроком.'],
        ].map(([icon, title, text]) => (
          <div key={title} className="flex gap-3 rounded-3xl bg-page p-5">
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

// ---------- 4. Что умеет «Старт» ----------
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

// ---------- 5. Алгоритм ----------
function Algorithm() {
  return (
    <section className="rounded-[36px] bg-ink p-6 text-white sm:p-12">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-pink">Как это работает</p>
      <h2 className="mt-3 max-w-[760px] text-[30px] font-extrabold leading-[1.1] tracking-tight sm:text-[42px]">Два этапа: заметить и остановить</h2>
      <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
          <div className="text-sm font-bold text-sky">Этап 1 · Зачисление</div>
          <h3 className="mt-2 text-xl font-bold">Сравниваем с обычным поведением</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-white/75">
            Банк знает ваш профиль: от кого обычно приходят деньги и сколько. 30 000 ₽ от незнакомца — в 20 раз больше обычного —
            помечаются «под проверкой», и банк предупреждает. Не блокирует: запретить получить деньги нельзя.
          </p>
        </div>
        <div className="hidden place-items-center md:grid">
          <Icon name="next" className="text-white/40" />
        </div>
        <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #5b3df5, #ff5fa2)' }}>
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
          ['Решают модели', 'Опасно или нет, решают измеримые модели. Языковая модель только объясняет; без неё — готовые тексты.'],
          ['Честно про данные', 'Демо на синтетических данных. В банке модели дообучаются на подтверждённых случаях.'],
          ['В контуре банка', 'Всё работает внутри банка, данные клиентов наружу не уходят.'],
        ].map(([title, text]) => (
          <div key={title} className="rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
            <div className="font-bold">{title}</div>
            <div className="mt-1 text-sm leading-relaxed text-white/70">{text}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- 6. Сценарии: вход в кабинет ----------
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
    <section id="scenarios" className="scroll-mt-6 py-16 sm:py-24">
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
