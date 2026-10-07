import { useEffect, useState } from 'react'

import { api } from '../api/client'
import type { InterceptAction, Persona, SosBranch, Transaction, TransferResponse } from '../api/types'

type Screen = 'home' | 'transfer' | 'intercept' | 'sos' | 'sos_branch'

interface Props {
  persona: Persona
  /** Меняется при каждом событии демо — сигнал перечитать операции. */
  version?: number
  /** Подсказка из шага сценария: куда и сколько переводить. */
  prefill?: { to?: string; amount?: number }
}

const rub = (x: number) => `${x.toLocaleString('ru-RU')} ₽`

// Банковское приложение внутри телефона: раздел «Старт».
// Каркас: все экраны рабочие, но простые. TODO(Маша): дизайн по Figma, Щит, уроки, профиль, XP.
export default function BankApp({ persona, version = 0, prefill }: Props) {
  const [screen, setScreen] = useState<Screen>('home')
  const [txs, setTxs] = useState<Transaction[]>([])
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<TransferResponse | null>(null)
  const [branches, setBranches] = useState<SosBranch[]>([])
  const [branch, setBranch] = useState<SosBranch | null>(null)
  const [done, setDone] = useState<Record<number, string>>({})

  useEffect(() => {
    api.transactions(persona.id).then(setTxs)
  }, [persona.id, version])

  useEffect(() => {
    api.sosBranches().then(setBranches)
  }, [])

  const openTransfer = () => {
    setTo(prefill?.to ?? '')
    setAmount(prefill?.amount ? String(prefill.amount) : '')
    setScreen('transfer')
  }

  const submitTransfer = async () => {
    const r = await api.transfer(persona.id, to, Number(amount))
    setResult(r)
    setScreen(r.status === 'intercepted' ? 'intercept' : 'home')
  }

  const openBranch = (id: SosBranch['id']) => {
    setBranch(branches.find((b) => b.id === id) ?? null)
    setDone({})
    setScreen('sos_branch')
  }

  const onIntercept = (action: InterceptAction) => {
    if (action === 'cancel') setScreen('home')
    if (action === 'offered_job') openBranch('A')
    // TODO: check_message → экран Щита; continue → пауза и доп. подтверждение
  }

  const runStep = async (i: number, action: string | null) => {
    if (action === 'return_funds') {
      const incoming = [...txs].reverse().find((t) => t.direction === 'in' && t.is_new_counterparty && !t.frozen)
      if (!incoming) return
      const r = await api.returnFunds(persona.id, incoming.id)
      setDone({ ...done, [i]: `Заморожено ${rub(r.frozen_amount)}, заявка ${r.claim_id}` })
    } else if (action === 'pause_outgoing') {
      await api.pauseOutgoing(persona.id)
      setDone({ ...done, [i]: 'Исходящие переводы на паузе 24 часа' })
    } else {
      // TODO(тимлид): block_contact, evidence, notify_parent, report_bank, report_police, block_card, logout_all
      setDone({ ...done, [i]: 'Готово' })
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="bg-brand px-4 pb-6 pt-8 text-white">
        <div className="text-xs opacity-80">Старт · {persona.name}, {persona.age}</div>
        <div className="mt-1 text-3xl font-bold">{rub(persona.balance)}</div>
      </header>

      {screen === 'home' && (
        <div className="flex flex-col gap-3 p-4">
          <div className="grid grid-cols-2 gap-2">
            <button className="rounded-xl bg-brand py-3 text-white" onClick={openTransfer}>
              Перевести
            </button>
            <button className="rounded-xl bg-risk-high/10 py-3 text-risk-high" onClick={() => setScreen('sos')}>
              Я влип — что делать?
            </button>
          </div>
          {result?.status === 'ok' && (
            <div className="rounded-xl bg-risk-low/10 p-3 text-sm text-risk-low">Перевод выполнен</div>
          )}
          <div className="text-sm font-semibold text-slate-500">Операции</div>
          {[...txs].reverse().map((t) => (
            <div key={t.id} className="flex justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
              <span>
                {t.counterparty}
                {t.frozen && <span className="ml-2 text-xs text-brand">заморожено</span>}
              </span>
              <span className={t.direction === 'in' ? 'text-risk-low' : ''}>
                {t.direction === 'in' ? '+' : '−'}
                {rub(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {screen === 'transfer' && (
        <div className="flex flex-col gap-3 p-4">
          <div className="text-lg font-semibold">Перевод по номеру</div>
          <input className="rounded-xl border p-3" placeholder="Телефон" value={to} onChange={(e) => setTo(e.target.value)} />
          <input
            className="rounded-xl border p-3"
            placeholder="Сумма"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="rounded-xl bg-brand py-3 text-white" onClick={submitTransfer}>
            Перевести
          </button>
          <button className="text-sm text-slate-500" onClick={() => setScreen('home')}>
            Назад
          </button>
        </div>
      )}

      {screen === 'intercept' && result?.intercept && (
        <div className="flex flex-col gap-3 p-4">
          <div className="text-center text-4xl">✋</div>
          <div className="text-center text-xl font-bold">{result.intercept.title}</div>
          <p className="text-sm">{result.intercept.text}</p>
          <div className="rounded-xl bg-slate-100 p-3 text-sm">
            <div className="mb-1 font-semibold">Почему мы так думаем:</div>
            {result.risk.reasons.map((r) => (
              <div key={r}>• {r}</div>
            ))}
          </div>
          <div className="rounded-xl bg-risk-high/10 p-3 text-sm">
            <div className="mb-1 font-semibold">Что тебе грозит:</div>
            {result.intercept.consequences.map((c) => (
              <div key={c}>• {c}</div>
            ))}
          </div>
          <button className="rounded-xl bg-brand py-3 text-white" onClick={() => onIntercept('cancel')}>
            Отменить перевод
          </button>
          <button className="rounded-xl border border-brand py-3 text-brand" onClick={() => onIntercept('offered_job')}>
            Мне предложили подработку
          </button>
          <button className="rounded-xl border py-3" onClick={() => onIntercept('check_message')}>
            Проверить сообщение
          </button>
          <button className="text-xs text-slate-500" onClick={() => onIntercept('continue')}>
            Это мои деньги, продолжить →
          </button>
        </div>
      )}

      {screen === 'sos' && (
        <div className="flex flex-col gap-3 p-4">
          <div className="text-lg font-semibold">Что случилось?</div>
          <p className="text-sm text-slate-500">Ты не первый, это можно исправить. Выбери свою ситуацию.</p>
          {branches.map((b) => (
            <button key={b.id} className="rounded-xl bg-white p-3 text-left text-sm shadow-sm" onClick={() => openBranch(b.id)}>
              {b.title}
            </button>
          ))}
          <button className="text-sm text-slate-500" onClick={() => setScreen('home')}>
            Назад
          </button>
        </div>
      )}

      {screen === 'sos_branch' && branch && (
        <div className="flex flex-col gap-3 p-4">
          <div className="text-lg font-semibold">{branch.title}</div>
          {branch.steps.map((s, i) => (
            <div key={i} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <div>
                {i + 1}. {s.text}
              </div>
              {s.action &&
                (done[i] ? (
                  <div className="mt-2 text-risk-low">✓ {done[i]}</div>
                ) : (
                  <button className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-white" onClick={() => runStep(i, s.action)}>
                    Сделать
                  </button>
                ))}
            </div>
          ))}
          <p className="text-xs text-slate-400">Это не юридическая консультация.</p>
          <button className="text-sm text-slate-500" onClick={() => setScreen('home')}>
            На главную
          </button>
        </div>
      )}
    </div>
  )
}
