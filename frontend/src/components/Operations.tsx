import type { Transaction } from '../api/types'
import { CATEGORIES, categoryOf, formatDate, signedRub } from '../lib'
import Icon from './Icon'

const ICON: Record<string, string> = {
  food: 'food',
  clothes: 'shirt',
  subscriptions: 'music',
  fun: 'film',
  transfers: 'user',
  other: 'card',
}

export default function Operations({ txs, limit = 8 }: { txs: Transaction[]; limit?: number }) {
  const list = [...txs].reverse().slice(0, limit)
  return (
    <div className="card p-6 sm:p-7">
      <h3 className="text-[22px] font-bold">История операций</h3>
      <ul className="mt-3 divide-y divide-line">
        {list.map((t) => {
          const cat = categoryOf(t)
          const suspicious = t.flagged && !t.frozen
          const tint = suspicious
            ? 'var(--color-risk-high)'
            : t.direction === 'in'
              ? 'var(--color-brand)'
              : CATEGORIES[cat].color
          return (
            <li key={t.id} className="animate-rise flex items-center gap-4 py-3.5">
              <div
                className="grid size-11 shrink-0 place-items-center rounded-2xl"
                style={{ background: `color-mix(in srgb, ${tint} 12%, white)`, color: tint }}
              >
                <Icon name={suspicious ? 'alert' : t.direction === 'in' ? 'plus' : ICON[cat]} size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{t.counterparty}</div>
                <div className="text-sm text-muted">
                  {formatDate(t.ts)} · {t.direction === 'in' ? 'Пополнение' : CATEGORIES[cat].label}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-bold ${t.direction === 'in' ? 'text-risk-low' : ''} ${t.frozen ? 'text-muted line-through' : ''}`}
                >
                  {signedRub(t)}
                </div>
                {suspicious && <div className="text-xs font-semibold text-risk-high">Под проверкой</div>}
                {t.frozen && <div className="text-xs font-semibold text-brand">Вернётся отправителю</div>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
