import { useEffect, useRef, useState } from 'react'

import Icon from '../Icon'
import { PAGES } from './Pages'

const LEAVES = Math.ceil(PAGES.length / 2) // лист = лицевая страница справа + оборот слева

function useWide() {
  const query = '(min-width: 1024px)'
  const [wide, setWide] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

function Page({ index, onScenarios }: { index: number; onScenarios: () => void }) {
  const page = PAGES[index]
  if (!page) return <div className="comic-page" />
  return (
    <div className="comic-page" aria-label={page.label}>
      {page.render({ scenarios: onScenarios })}
      {index > 0 && index < PAGES.length - 1 && <div className="comic-folio">{index}</div>}
    </div>
  )
}

// Книга-комикс: на широком экране — разворот, страницы листаются справа налево; на телефоне — по одной со свайпом
export default function ComicBook({ onScenarios }: { onScenarios: () => void }) {
  const wide = useWide()
  const [flipped, setFlipped] = useState(0) // сколько листов перевёрнуто (разворот)
  const [page, setPage] = useState(0) // текущая страница (телефон)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const touch = useRef<number | null>(null)

  // Позиция в «страницах», общая для обоих режимов, чтобы при повороте экрана не терять место
  const atStart = wide ? flipped === 0 : page === 0
  const atEnd = wide ? flipped === LEAVES : page === PAGES.length - 1

  const next = () => {
    if (atEnd) return
    setDir('next')
    if (wide) setFlipped((f) => f + 1)
    else setPage((p) => p + 1)
  }
  const prev = () => {
    if (atStart) return
    setDir('prev')
    if (wide) setFlipped((f) => f - 1)
    else setPage((p) => p - 1)
  }

  useEffect(() => {
    if (wide) setFlipped(Math.min(LEAVES, Math.ceil(page / 2)))
    else setPage(Math.max(0, flipped * 2 - 1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft') prev()
  }

  const counter = wide
    ? flipped === 0
      ? 'Обложка'
      : flipped === LEAVES
        ? 'Конец'
        : `Страницы ${flipped * 2 - 1}–${flipped * 2}`
    : page === 0
      ? 'Обложка'
      : page === PAGES.length - 1
        ? 'Конец'
        : `Страница ${page} из ${PAGES.length - 2}`

  // Закрытая книга стоит по центру, открытая — разворотом
  const shift = wide ? (flipped === 0 ? '-25%' : flipped === LEAVES ? '25%' : '0%') : '0%'

  return (
    // Разворот целиком помещается в экран: ширина ограничена высотой окна (страница 3:4, разворот 3:2)
    <div className="mx-auto w-full" style={{ maxWidth: wide ? 'min(1120px, calc((100vh - 240px) * 1.5))' : undefined }}>
      <div
        className="book-stage outline-none"
        tabIndex={0}
        onKeyDown={onKey}
        role="region"
        aria-roledescription="книга"
        aria-label={`Комикс «Старт». ${counter}. Стрелки влево и вправо листают страницы`}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return
          const dx = e.changedTouches[0].clientX - touch.current
          if (dx < -40) next()
          if (dx > 40) prev()
          touch.current = null
        }}
      >
        {wide ? (
          <div className="book" style={{ transform: `translateX(${shift})` }}>
            {Array.from({ length: LEAVES }, (_, i) => {
              const isFlipped = i < flipped
              return (
                <div
                  key={i}
                  className="leaf"
                  style={{ transform: `rotateY(${isFlipped ? -180 : 0}deg)`, zIndex: isFlipped ? i + 1 : LEAVES * 2 - i }}
                >
                  <div className="face face-front" onClick={next} aria-hidden={isFlipped}>
                    <Page index={i * 2} onScenarios={onScenarios} />
                  </div>
                  <div className="face face-back" onClick={prev} aria-hidden={!isFlipped}>
                    <Page index={i * 2 + 1} onScenarios={onScenarios} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="single mx-auto">
            <div key={page} className={`single-page ${dir === 'next' ? 'turn-next' : 'turn-prev'}`} onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              if (e.clientX - r.left < r.width / 3) prev()
              else next()
            }}>
              <Page index={page} onScenarios={onScenarios} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button onClick={prev} disabled={atStart} className="grid size-12 place-items-center rounded-full bg-surface text-ink transition hover:bg-line disabled:opacity-30" style={{ boxShadow: 'var(--shadow-card)' }} aria-label="Предыдущая страница">
          <Icon name="back" />
        </button>
        <div className="min-w-[150px] text-center text-sm font-semibold text-muted" aria-live="polite">{counter}</div>
        <button onClick={next} disabled={atEnd} className="grid size-12 place-items-center rounded-full bg-brand text-white transition hover:brightness-110 disabled:opacity-30" aria-label="Следующая страница">
          <Icon name="chevron" />
        </button>
      </div>
    </div>
  )
}
