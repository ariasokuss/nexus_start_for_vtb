import { useState } from 'react'

import type { Transaction } from '../api/types'
import { CATEGORIES, categoryOf, rub } from '../lib'

const INCOME_COLORS = ['#5b3df5', '#3cc3f0', '#22b07d', '#ff9f43', '#ff5fa2', '#b7bccb']
const SUSPICIOUS = 'Под проверкой'

// Операции за месяц: кольцо и чипы по категориям (как в веб-кабинетах банков).
export default function Spending({ txs }: { txs: Transaction[] }) {
  const [tab, setTab] = useState<'out' | 'in'>('out')
  const monthAgo = Date.now() - 31 * 86_400_000
  const list = txs.filter((t) => t.direction === tab && new Date(t.ts).getTime() >= monthAgo)

  const groups = new Map<string, number>()
  for (const t of list) {
    const key = tab === 'out' ? categoryOf(t) : t.flagged ? SUSPICIOUS : t.counterparty
    groups.set(key, (groups.get(key) ?? 0) + t.amount)
  }
  const items = [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, value], i) => ({
      key,
      value,
      label: tab === 'out' ? CATEGORIES[key].label : key,
      color:
        tab === 'out'
          ? CATEGORIES[key].color
          : key === SUSPICIOUS
            ? 'var(--color-risk-high)'
            : INCOME_COLORS[i % INCOME_COLORS.length],
    }))
  const total = items.reduce((s, x) => s + x.value, 0)

  const R = 70
  const C = 2 * Math.PI * R
  let offset = 0

  return (
    <div className="card p-6 sm:p-7">
      <h3 className="text-[22px] font-bold">Операции за месяц</h3>
      <div className="mt-4 flex gap-2">
        {(['out', 'in'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`chip border ${tab === k ? 'border-brand bg-brand-soft text-brand' : 'border-line text-ink hover:bg-page'}`}
          >
            {k === 'out' ? 'Траты' : 'Пополнения'}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-1 flex-wrap gap-2">
          {items.length === 0 && <span className="text-muted">Операций пока нет</span>}
          {items.map((x) => (
            <span key={x.key} className="chip" style={{ background: `color-mix(in srgb, ${x.color} 12%, var(--color-surface))` }}>
              <span className="size-2 rounded-full" style={{ background: x.color }} />
              {x.label} {rub(x.value)}
            </span>
          ))}
        </div>
        <div className="relative size-[170px] shrink-0">
          <svg viewBox="0 0 170 170" className="-rotate-90">
            <circle cx="85" cy="85" r={R} fill="none" stroke="var(--color-page)" strokeWidth="16" />
            {items.map((x) => {
              const len = total ? (x.value / total) * C : 0
              const el = (
                <circle
                  key={x.key}
                  cx="85"
                  cy="85"
                  r={R}
                  fill="none"
                  stroke={x.color}
                  strokeWidth="16"
                  strokeDasharray={`${Math.max(len - 3, 0.1)} ${C}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-500"
                />
              )
              offset += len
              return el
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-lg font-bold">{rub(total)}</div>
              <div className="text-sm text-muted">{tab === 'out' ? 'Траты' : 'Пополнения'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
