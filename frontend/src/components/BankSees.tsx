import type { LiveRisk } from '../api/types'
import { RISK_COLOR, RISK_LABEL, rub } from '../lib'
import Icon from './Icon'

// «Что видит банк»: профиль клиента + текущий риск и сработавшие правила.
export default function BankSees({ live }: { live: LiveRisk | null }) {
  if (!live) return <div className="card h-[220px] animate-pulse" />
  const p = live.profile
  const color = RISK_COLOR[live.level]

  return (
    <div className="card overflow-hidden">
      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name="eye" size={18} />
            </span>
            <h3 className="text-lg font-bold">Что видит банк</h3>
          </div>
          <span className="chip shrink-0 font-semibold text-white" style={{ background: color }}>
            Риск: {RISK_LABEL[live.level]}
          </span>
        </div>

        <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-page">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.max(live.score * 100, 4)}%`, background: color }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted">
          <span>Оценка риска {live.score.toFixed(2)}</span>
          <span>Остановка перевода от 0.70</span>
        </div>

        {live.signals.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {live.signals.map((s) => (
              <li
                key={s}
                className="animate-rise flex gap-2.5 rounded-2xl p-3 text-[14px] leading-snug"
                style={{ background: `color-mix(in srgb, ${color} 9%, white)` }}
              >
                <Icon name="alert" size={18} className="mt-px shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-risk-low/10 p-3 text-[14px] text-[#137a55]">
            <Icon name="check" size={18} />
            Операции совпадают с вашим обычным поведением
          </div>
        )}
      </div>

      {p && (
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
          <Metric label="Обычное пополнение" value={`≈ ${rub(p.avg_topup)}`} />
          <Metric label="Обычная трата" value={`≈ ${rub(p.avg_spend)}`} />
          <Metric label="Свои отправители" value={p.known_senders.join(', ') || '—'} />
          <Metric
            label="Скорость транзита"
            value={p.min_transit_minutes == null ? 'Не было' : `${p.min_transit_minutes} мин`}
            alert={p.min_transit_minutes != null}
          />
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-white px-6 py-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 truncate font-semibold ${alert ? 'text-risk-high' : ''}`} title={value}>
        {value}
      </div>
    </div>
  )
}
