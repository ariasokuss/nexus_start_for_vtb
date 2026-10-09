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
  sonya: 'Мост в 14 лет',
  lev: '«Пушкинская карта»',
}

export default function AccountPicker() {
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
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-4 py-6 sm:px-8">
        <Logo />
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-8">
        <section className="mb-10 mt-6 max-w-[720px]">
          <h1 className="text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px]">
            Банк, который <span className="bg-gradient-to-r from-brand to-pink bg-clip-text text-transparent">замечает</span>, когда вас пытаются использовать
          </h1>
          <p className="mt-5 text-lg text-muted">
            Выберите аккаунт. Внутри можно пополнять счёт, переводить и платить как в настоящем банке — и посмотреть,
            как алгоритм реагирует на подозрительные деньги.
          </p>
        </section>

        {error && <div className="card mb-6 p-5 text-risk-high">{error}</div>}

        <div className="grid gap-5 md:grid-cols-3">
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
                  <div
                    className="grid size-14 place-items-center rounded-2xl text-2xl font-extrabold text-white"
                    style={{ background: AVATAR_GRADIENT[p.id] }}
                  >
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

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            ['eye', 'Знает ваше обычное поведение', 'Средний размер пополнений и трат, от кого обычно приходят деньги и кому вы переводите.'],
            ['alert', 'Замечает странные зачисления', 'Крупная сумма от незнакомца помечается, а вы получаете предупреждение.'],
            ['shield', 'Останавливает транзит', 'Если такие деньги пытаются переслать дальше — перевод останавливается и банк помогает выйти из ситуации.'],
          ].map(([icon, title, text]) => (
            <div key={title} className="flex gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-brand" style={{ boxShadow: 'var(--shadow-card)' }}>
                <Icon name={icon} />
              </div>
              <div>
                <div className="font-bold">{title}</div>
                <div className="mt-1 text-[15px] text-muted">{text}</div>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  )
}
