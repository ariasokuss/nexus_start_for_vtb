import type { LiveRisk } from '../api/types'

const COLORS = { high: 'bg-risk-high', medium: 'bg-risk-medium', low: 'bg-risk-low' } as const
const LABELS = { high: 'Высокий', medium: 'Средний', low: 'Низкий' } as const

// Правая колонка демо: что видит банк. TODO(Маша): анимация появления сигналов, история скоринга.
export default function RiskPanel({ risk }: { risk: LiveRisk }) {
  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl bg-slate-900 p-4 text-slate-100">
      <div className="text-sm uppercase tracking-wide text-slate-400">🔍 Что видит банк</div>
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span>Риск: {LABELS[risk.level]}</span>
          <span className="font-mono">{risk.score.toFixed(2)}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-700">
          <div
            className={`h-full transition-all duration-700 ${COLORS[risk.level]}`}
            style={{ width: `${Math.round(risk.score * 100)}%` }}
          />
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {risk.signals.length === 0 && <li className="text-slate-500">Подозрительных сигналов нет</li>}
        {risk.signals.map((s) => (
          <li key={s} className="rounded-lg bg-slate-800 px-3 py-2">
            ⚠ {s}
          </li>
        ))}
      </ul>
    </div>
  )
}
