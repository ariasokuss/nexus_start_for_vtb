import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { api } from '../api/client'
import type {
  DemoState,
  InterceptAction,
  Lesson,
  LiveRisk,
  OperationResponse,
  Persona,
  SosBranch,
  Transaction,
  TransferResponse,
} from '../api/types'
import { PayModal, TopUpModal, TransferModal } from '../components/ActionModals'
import Assistant, { type Nudge } from '../components/Assistant'
import BankSees from '../components/BankSees'
import Icon from '../components/Icon'
import Logo from '../components/Logo'
import Operations from '../components/Operations'
import { InterceptModal, LessonModal, ShieldModal, SosModal } from '../components/SafetyModals'
import ScenarioPanel from '../components/ScenarioPanel'
import Spending from '../components/Spending'
import { AVATAR_GRADIENT, greeting, rub } from '../lib'

type ModalState =
  | { kind: 'topup' }
  | { kind: 'pay' }
  | { kind: 'transfer'; prefill?: { to?: string; amount?: number } }
  | { kind: 'intercept'; result: TransferResponse; to: string; amount: number }
  | { kind: 'sos'; branch?: SosBranch['id'] }
  | { kind: 'shield'; text?: string }
  | { kind: 'lesson'; lesson: Lesson }
  | null

const PERSONA_IDS = ['artem', 'dima', 'katya']

export default function Cabinet() {
  const { personaId = '' } = useParams()
  const [persona, setPersona] = useState<Persona | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [live, setLive] = useState<LiveRisk | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [scenario, setScenario] = useState<DemoState | null>(null)
  const [nudge, setNudge] = useState<Nudge | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [xp, setXp] = useState(0)
  const seenFlagged = useRef<Set<string> | null>(null)

  const say = useCallback((text: string, suggestions?: string[]) => {
    setNudge({ id: Date.now() + Math.random(), text, suggestions })
  }, [])

  const notify = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 3500)
  }

  const refresh = useCallback(async () => {
    const [personas, t, l] = await Promise.all([api.personas(), api.transactions(personaId), api.liveRisk(personaId)])
    setPersona(personas.find((p) => p.id === personaId) ?? null)
    setTxs(t)
    setLive(l)

    // Этап 1 алгоритма: новое подозрительное зачисление — ассистент пишет сам
    const flagged = t.filter((x) => x.flagged && !x.frozen)
    if (seenFlagged.current) {
      const fresh = flagged.find((x) => !seenFlagged.current!.has(x.id))
      if (fresh) {
        say(
          `Вам пришло ${rub(fresh.amount)} от «${fresh.counterparty}». Это необычно для вашего счёта:\n— ` +
            l.signals.slice(0, 3).join('\n— ') +
            '\n\nПожалуйста, не переводите эти деньги дальше — даже «обратно», если попросят. Если вам предложили за это процент, это вербовка в дропы.',
          ['Мне пришли чужие деньги', 'Почему нельзя вернуть самому?', 'Что такое дроп?'],
        )
      }
    }
    seenFlagged.current = new Set(flagged.map((x) => x.id))
  }, [personaId, say])

  useEffect(() => {
    seenFlagged.current = null
    setScenario(null)
    setXp(0)
    refresh()
  }, [refresh])

  if (!PERSONA_IDS.includes(personaId)) return <Navigate to="/" replace />

  // ---------- Операции ----------
  const onTopUp = async (r: OperationResponse) => {
    setModal(null)
    notify(r.status === 'flagged' ? `Зачислено ${rub(r.transaction!.amount)} — сумма под проверкой` : `Зачислено ${rub(r.transaction!.amount)}`)
    await refresh()
  }

  const onPay = async (r: OperationResponse) => {
    setModal(null)
    notify(`Оплачено: ${r.transaction!.counterparty}, ${rub(r.transaction!.amount)}`)
    await refresh()
  }

  const onTransfer = async (r: TransferResponse, to: string, amount: number) => {
    if (r.status === 'intercepted') {
      setModal({ kind: 'intercept', result: r, to, amount })
      say(
        'Я остановил этот перевод. Похоже, вам пришли чужие деньги, и их просят переслать дальше — это классическая схема с дропами. Ничего страшного ещё не произошло: можно отменить перевод и спокойно вернуть деньги через банк.',
        ['Открыть «Безопасный выход»', 'Что мне грозит?', 'Как устроен алгоритм?'],
      )
    } else {
      setModal(null)
      notify(`Переведено ${rub(amount)} → ${to}`)
    }
    await refresh()
  }

  const lastRecruiterMessage = () =>
    [...(scenario?.chat_history ?? [])].reverse().find((m) => m.sender === 'recruiter')?.text ?? ''

  const onIntercept = async (action: InterceptAction) => {
    if (modal?.kind !== 'intercept') return
    if (action === 'cancel') {
      setModal(null)
      notify('Перевод отменён')
    } else if (action === 'offered_job') {
      setModal({ kind: 'sos', branch: 'A' })
    } else if (action === 'check_message') {
      setModal({ kind: 'shield', text: lastRecruiterMessage() })
    } else {
      const { to, amount } = modal
      try {
        await api.transfer(personaId, to, amount, true)
        notify(`Переведено ${rub(amount)} → ${to}`)
      } catch (e) {
        notify((e as Error).message)
      }
      setModal(null)
    }
    await refresh()
  }

  // ---------- Сценарий ----------
  const startScenario = async () => {
    seenFlagged.current = null
    setScenario(await api.demoReset(personaId))
    setXp(0)
    await refresh()
  }

  const nextStep = async () => {
    setScenario(await api.demoNext(personaId))
    await refresh()
  }

  const openLesson = async (type: string) => {
    const { lesson } = await api.event(personaId, type)
    if (lesson) setModal({ kind: 'lesson', lesson })
  }

  const onExpect = (expect: Record<string, unknown>) => {
    if (expect.action === 'transfer') {
      setModal({ kind: 'transfer', prefill: { to: String(expect.to), amount: Number(expect.amount) } })
    } else if (expect.action === 'sos') {
      setModal({ kind: 'sos', branch: expect.branch as SosBranch['id'] })
    } else if (expect.action === 'event') {
      openLesson(String(expect.type))
    }
  }

  const onAssistantAction = (action: string) => {
    if (action === 'open_sos') setModal({ kind: 'sos' })
    if (action === 'open_shield') setModal({ kind: 'shield', text: lastRecruiterMessage() })
  }

  const resetAccount = async () => {
    await api.resetPersona(personaId)
    setScenario(null)
    seenFlagged.current = null
    setXp(0)
    notify('Аккаунт сброшен к исходному состоянию')
    await refresh()
  }

  if (!persona) {
    return <div className="grid min-h-screen place-items-center text-muted">Загружаем кабинет…</div>
  }

  const frozen = txs.filter((t) => t.frozen).reduce((s, t) => s + t.amount, 0)
  const suspicious = txs.filter((t) => t.flagged && !t.frozen).reduce((s, t) => s + t.amount, 0)
  const level = 1 + Math.floor(xp / 100)

  const tiles = [
    { icon: 'plus', title: 'Пополнить', sub: 'От родителей или другого человека', onClick: () => setModal({ kind: 'topup' }) },
    { icon: 'send', title: 'Перевести', sub: 'Своим или по номеру телефона', onClick: () => setModal({ kind: 'transfer' }) },
    { icon: 'bag', title: 'Оплатить', sub: 'Одежда, еда, кино, подписки', onClick: () => setModal({ kind: 'pay' }) },
    { icon: 'lifebuoy', title: 'Безопасный выход', sub: 'Если что-то пошло не так', onClick: () => setModal({ kind: 'sos' }), accent: true },
  ]

  return (
    <div className={`min-h-screen transition-[padding] ${scenario ? 'sm:pr-[420px]' : ''}`}>
      {/* ---------- Шапка ---------- */}
      <header className="sticky top-0 z-10 border-b border-line bg-page/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-4 py-3.5 sm:px-8">
          <Link to="/"><Logo size={34} /></Link>
          <nav className="ml-6 hidden gap-1 md:flex">
            {[['Главная', true], ['Операции', false], ['Безопасность', false]].map(([label, active]) => (
              <span key={String(label)} className={`rounded-full px-3.5 py-1.5 text-[15px] ${active ? 'bg-white font-semibold shadow-sm' : 'text-muted'}`}>
                {label}
              </span>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {!scenario && (
              <button className="btn-primary px-4 py-2.5 text-sm" onClick={startScenario}>
                <Icon name="play" size={16} /> <span className="hidden sm:inline">Проиграть сценарий</span>
              </button>
            )}
            <button className="btn-ghost hidden px-3 py-2.5 text-sm sm:inline-flex" onClick={resetAccount} title="Сбросить аккаунт">
              <Icon name="reset" size={16} />
            </button>
            <Link to="/" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-white" title="Сменить аккаунт">
              <span className="grid size-9 place-items-center rounded-full font-bold text-white" style={{ background: AVATAR_GRADIENT[persona.id] }}>
                {persona.name[0]}
              </span>
              <span className="hidden text-[15px] font-semibold sm:inline">{persona.name}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-8 sm:px-8">
        <h1 className="text-[34px] font-extrabold tracking-tight sm:text-[44px]">
          {greeting()}, {persona.name}
        </h1>

        <div className="mt-7 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* ---------- Левая колонка ---------- */}
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-[28px] p-6 text-white" style={{ background: 'linear-gradient(135deg, #5b3df5 0%, #8b3df5 55%, #ff5fa2 120%)', boxShadow: 'var(--shadow-card)' }}>
              <div className="absolute -right-10 -top-12 size-44 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 right-10 size-36 rounded-full bg-lime/20" />
              <div className="relative">
                <div className="text-sm text-white/75">Карта «Старт» · •• 4821</div>
                <div className="mt-2 text-[38px] font-extrabold leading-none tracking-tight">{rub(persona.balance)}</div>
                {(suspicious > 0 || frozen > 0) && (
                  <div className="mt-4 space-y-1.5 text-sm">
                    {suspicious > 0 && (
                      <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
                        <Icon name="alert" size={16} /> {rub(suspicious)} под проверкой — не переводите
                      </div>
                    )}
                    {frozen > 0 && (
                      <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2">
                        <Icon name="lock" size={16} /> {rub(frozen)} заморожено, вернётся отправителю
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="card flex items-center gap-4 p-5">
              <span className="grid size-12 place-items-center rounded-2xl bg-lime text-ink">
                <Icon name="star" size={22} />
              </span>
              <div className="flex-1">
                <div className="flex justify-between text-[15px]">
                  <span className="font-bold">Уровень {level}</span>
                  <span className="text-muted">{xp % 100} / 100 XP</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-page">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand to-pink transition-all duration-700" style={{ width: `${xp % 100}%` }} />
                </div>
                <div className="mt-1.5 text-xs text-muted">Очки за уроки и правильные решения</div>
              </div>
            </div>

            <div className="card flex items-center gap-4 p-5">
              <span className="grid size-12 place-items-center rounded-2xl bg-sky/15 text-sky">
                <Icon name="piggy" size={22} />
              </span>
              <div className="flex-1">
                <div className="flex justify-between text-[15px]">
                  <span className="font-bold">Копилка: наушники</span>
                  <span className="text-muted">2 100 / 6 000 ₽</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-page">
                  <div className="h-full w-[35%] rounded-full bg-sky" />
                </div>
              </div>
            </div>

            <BankSees live={live} />
          </div>

          {/* ---------- Правая колонка ---------- */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              {tiles.map((t) => (
                <button
                  key={t.title}
                  onClick={t.onClick}
                  className={`card group flex min-h-[148px] flex-col justify-between p-5 text-left transition hover:-translate-y-0.5 ${t.accent ? 'ring-2 ring-coral/30' : ''}`}
                >
                  <span className={`grid size-11 place-items-center rounded-2xl transition group-hover:scale-110 ${t.accent ? 'bg-coral text-white' : 'bg-brand-soft text-brand'}`}>
                    <Icon name={t.icon} size={21} />
                  </span>
                  <span>
                    <span className="block text-[17px] font-bold">{t.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-muted">{t.sub}</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setModal({ kind: 'shield', text: lastRecruiterMessage() })}
              className="card flex w-full items-center gap-4 p-5 text-left transition hover:-translate-y-0.5"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-ink text-lime">
                <Icon name="shield" size={21} />
              </span>
              <span className="flex-1">
                <span className="block font-bold">Предлагают «лёгкую подработку»?</span>
                <span className="block text-sm text-muted">Проверьте сообщение — покажем признаки мошенничества</span>
              </span>
              <Icon name="chevron" className="text-muted" />
            </button>

            <Spending txs={txs} />
            <Operations txs={txs} />
          </div>
        </div>
      </main>

      {/* ---------- Сценарий ---------- */}
      {scenario && (
        <ScenarioPanel
          state={scenario}
          onNext={nextStep}
          onRestart={startScenario}
          onClose={() => setScenario(null)}
          onExpect={onExpect}
        />
      )}

      {/* ---------- Модальные окна ---------- */}
      {modal?.kind === 'topup' && <TopUpModal persona={persona} onClose={() => setModal(null)} onDone={onTopUp} />}
      {modal?.kind === 'pay' && <PayModal persona={persona} onClose={() => setModal(null)} onDone={onPay} />}
      {modal?.kind === 'transfer' && (
        <TransferModal persona={persona} profile={live?.profile ?? null} prefill={modal.prefill} onClose={() => setModal(null)} onDone={onTransfer} />
      )}
      {modal?.kind === 'intercept' && (
        <InterceptModal result={modal.result} to={modal.to} amount={modal.amount} onAction={onIntercept} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'sos' && (
        <SosModal
          persona={persona}
          txs={txs}
          initialBranch={modal.branch}
          onClose={() => setModal(null)}
          onChanged={refresh}
          onComplete={() => {
            setXp((x) => x + 50)
            say('Вы всё сделали правильно. Деньги вернутся владельцу через банк, а переписка сохранена как доказательство. Если вам снова напишут — не отвечайте и сразу сообщите банку.', ['Что такое дроп?', 'Как устроен алгоритм?'])
          }}
        />
      )}
      {modal?.kind === 'shield' && (
        <ShieldModal initialText={modal.text} onClose={() => setModal(null)} onOpenSos={() => setModal({ kind: 'sos' })} />
      )}
      {modal?.kind === 'lesson' && (
        <LessonModal
          lesson={modal.lesson}
          onClose={() => setModal(null)}
          onFinish={() => {
            api.progress(personaId, modal.lesson.id)
            setXp((x) => x + modal.lesson.xp)
          }}
        />
      )}

      {toast && (
        <div className="animate-rise fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-ink px-5 py-3 text-[15px] font-medium text-white" style={{ boxShadow: 'var(--shadow-pop)' }}>
          {toast}
        </div>
      )}

      <Assistant key={personaId} personaId={personaId} personaName={persona.name} nudge={nudge} onAction={onAssistantAction} shifted={Boolean(scenario)} />
    </div>
  )
}
