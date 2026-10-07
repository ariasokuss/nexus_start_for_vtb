import { useEffect, useState } from 'react'

import { api } from '../api/client'
import type { Persona } from '../api/types'
import PhoneFrame from '../components/PhoneFrame'
import BankApp from './BankApp'

// Раздел «Старт» для свободного просмотра жюри (без сценария).
export default function AppPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [current, setCurrent] = useState<Persona | null>(null)

  useEffect(() => {
    api.personas().then((list) => {
      setPersonas(list)
      setCurrent(list[0] ?? null)
    })
  }, [])

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <select
        className="rounded-lg border bg-white px-3 py-2"
        value={current?.id}
        onChange={(e) => setCurrent(personas.find((p) => p.id === e.target.value) ?? null)}
      >
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}, {p.age}
          </option>
        ))}
      </select>
      {current && (
        <PhoneFrame>
          <BankApp key={current.id} persona={current} />
        </PhoneFrame>
      )}
    </div>
  )
}
