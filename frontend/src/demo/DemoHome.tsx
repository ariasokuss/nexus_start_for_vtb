import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../api/client'
import type { ScenarioInfo } from '../api/types'

export default function DemoHome() {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([])

  useEffect(() => {
    api.scenarios().then(setScenarios)
  }, [])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-bold">Старт · режим демонстрации</h1>
      <p className="text-slate-600">
        Молодёжный раздел мобильного банка: перехват вербовки в дропы и безопасный выход. Выберите сценарий.
      </p>
      {scenarios.map((s) => (
        <Link key={s.id} to={`/demo/${s.id}`} className="rounded-2xl bg-white p-4 shadow-sm hover:shadow-md">
          <div className="font-semibold">{s.title}</div>
          <div className="text-sm text-slate-500">
            Персонаж: {s.persona} · шагов: {s.steps_count}
          </div>
        </Link>
      ))}
      <Link to="/app" className="text-sm text-brand">
        Открыть раздел «Старт» без сценария →
      </Link>
    </div>
  )
}
