import { useEffect, useRef } from 'react'

import type { DemoState } from '../api/types'
import Icon from './Icon'

const CHAT_TITLE: Record<string, string> = {
  artem: 'Работа | Подработка',
  dima: 'Куратор',
}

// Выдвижная панель сценария: шаги, подсказка «что сделать» и переписка в мессенджере.
export default function ScenarioPanel({ state, onNext, onRestart, onClose, onExpect }: {
  state: DemoState
  onNext: () => void
  onRestart: () => void
  onClose: () => void
  onExpect: (expect: Record<string, unknown>) => void
}) {
  const chatRef = useRef<HTMLDivElement>(null)
  const last = state.step_index >= state.steps_count - 1
  const expect = state.step.expect

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [state.chat_history.length])

  const expectLabel = (() => {
    if (!expect) return null
    if (expect.action === 'transfer') return 'Открыть перевод'
    if (expect.action === 'sos') return 'Открыть «Безопасный выход»'
    if (expect.action === 'event') return 'Открыть урок'
    return null
  })()

  return (
    <aside
      className="animate-slide fixed inset-y-0 right-0 z-20 flex w-full flex-col bg-white sm:w-[420px]"
      style={{ boxShadow: 'var(--shadow-pop)' }}
    >
      <div className="border-b border-line p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wide text-brand">Сценарий</div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-page hover:bg-line" aria-label="Закрыть сценарий">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: state.steps_count }).map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= state.step_index ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
        <div className="mt-3 text-sm text-muted">
          Шаг {state.step_index + 1} из {state.steps_count}
        </div>
        <div className="text-xl font-bold">{state.step.title}</div>
        {state.step.hint && (
          <div className="mt-3 flex gap-2.5 rounded-2xl bg-brand-soft p-3.5 text-[14px] leading-snug">
            <Icon name="star" size={18} className="mt-px shrink-0 text-brand" />
            <span>{state.step.hint}</span>
          </div>
        )}
        {expect && expectLabel && (
          <button className="btn-primary mt-3 w-full" onClick={() => onExpect(expect)}>
            {expectLabel}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 border-b border-line bg-page/70 px-5 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-ink text-white">
          <Icon name="chat" size={17} />
        </span>
        <div>
          <div className="text-sm font-bold">{CHAT_TITLE[state.persona.id] ?? 'Мессенджер'}</div>
          <div className="text-xs text-muted">Переписка персонажа</div>
        </div>
      </div>

      <div ref={chatRef} className="flex-1 space-y-2.5 overflow-y-auto bg-page/70 p-4">
        {state.chat_history.length === 0 && (
          <div className="mt-10 text-center text-sm text-muted">В этом сценарии нет переписки — следите за операциями в кабинете.</div>
        )}
        {state.chat_history.map((m, i) =>
          m.sender === 'system' ? (
            <div key={i} className="animate-rise text-center text-xs font-semibold text-muted">{m.text}</div>
          ) : (
            <div key={i} className={`animate-rise flex ${m.sender === 'user' ? 'justify-end' : ''}`}>
              <div
                className={`max-w-[85%] rounded-[18px] px-3.5 py-2 text-[14.5px] leading-snug ${
                  m.sender === 'user' ? 'rounded-br-md bg-[#dcf8c6]' : 'rounded-bl-md bg-white'
                }`}
                style={{ boxShadow: '0 1px 1px rgb(0 0 0 / 0.06)' }}
              >
                {m.text}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="flex gap-2 border-t border-line p-4">
        <button className="btn-ghost" onClick={onRestart}>
          <Icon name="reset" size={18} /> Сначала
        </button>
        <button className="btn-primary flex-1" onClick={onNext} disabled={last}>
          {last ? 'Сценарий пройден' : 'Следующий шаг'} {!last && <Icon name="next" size={18} />}
        </button>
      </div>
    </aside>
  )
}
