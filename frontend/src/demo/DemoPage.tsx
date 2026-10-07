import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { api } from '../api/client'
import type { DemoState } from '../api/types'
import BankApp from '../app/BankApp'
import Messenger from '../components/Messenger'
import PhoneFrame from '../components/PhoneFrame'
import RiskPanel from '../components/RiskPanel'

// Режим демонстрации для жюри: мессенджер | телефон с банком | что видит банк.
export default function DemoPage() {
  const { scenarioId = 'artem' } = useParams()
  const [state, setState] = useState<DemoState | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    api.demoReset(scenarioId).then(setState)
    // SSE: панель и телефон обновляются после шагов, переводов и действий в SOS
    const es = new EventSource(api.demoStreamUrl(scenarioId))
    es.onmessage = (e) => {
      setState(JSON.parse(e.data) as DemoState)
      setVersion((v) => v + 1)
    }
    return () => es.close()
  }, [scenarioId])

  if (!state) return <div className="p-8">Загрузка…</div>

  const expect = state.step.expect as { to?: string; amount?: number } | null

  return (
    <div className="flex h-screen flex-col gap-4 p-4">
      <header className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <Link to="/demo" className="text-sm text-brand">
          ← Сценарии
        </Link>
        <div className="font-semibold">
          {state.persona.name}, {state.persona.age}
        </div>
        <div className="text-sm text-slate-500">
          Шаг {state.step_index + 1} из {state.steps_count}: «{state.step.title}»
        </div>
        <div className="flex-1 text-sm italic text-slate-600">{state.step.hint}</div>
        <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => api.demoReset(scenarioId)}>
          Сбросить
        </button>
        <button
          className="rounded-lg bg-brand px-4 py-1.5 text-sm text-white disabled:opacity-40"
          disabled={state.step_index >= state.steps_count - 1}
          onClick={() => api.demoNext(scenarioId)}
        >
          Далее ▶
        </button>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <Messenger messages={state.chat_history} />
        <PhoneFrame>
          <BankApp key={scenarioId} persona={state.persona} version={version} prefill={expect ?? undefined} />
        </PhoneFrame>
        <RiskPanel risk={state.risk} />
      </main>
    </div>
  )
}
