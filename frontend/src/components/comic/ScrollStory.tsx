import { useEffect, useRef, useState } from 'react'

import { PAGES } from './Pages'

// Обложку и заднюю обложку не показываем — их роль играет первый экран сайта
const STORY = PAGES.filter((p) => p.id !== 'cover' && p.id !== 'back')
const N = STORY.length

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

// История на весь экран: пользователь прокручивает сайт вниз, а экраны переворачиваются справа налево, как страницы.
// Секция высотой N экранов; внутри — «липкий» экран, прогресс прокрутки решает, насколько перевёрнута каждая страница.
export default function ScrollStory({ onScenarios }: { onScenarios: () => void }) {
  const ref = useRef<HTMLElement>(null)
  const [progress, setProgress] = useState(0) // 0 … N-1: сколько страниц перевёрнуто
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = ref.current
      if (!el) return
      const total = el.offsetHeight - window.innerHeight
      const passed = clamp(-el.getBoundingClientRect().top, 0, total)
      setProgress(total > 0 ? (passed / total) * (N - 1) : 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  const current = clamp(Math.round(progress), 0, N - 1)

  // Перейти к странице: прокручиваем к нужной точке секции
  const goTo = (i: number) => {
    const el = ref.current
    if (!el) return
    const total = el.offsetHeight - window.innerHeight
    window.scrollTo({ top: el.offsetTop + (total * i) / (N - 1), behavior: 'smooth' })
  }

  return (
    <section ref={ref} id="story" style={{ height: `${N * 100}vh` }} aria-label="История в комиксе: прокручивайте вниз">
      <div className="story-stage sticky top-0 h-screen overflow-hidden">
        {STORY.map((page, i) => {
          // turn: 0 — страница лежит, 1 — перевёрнута; плавность — «пауза» в начале и конце каждого экрана
          const raw = clamp(progress - i, 0, 1)
          const turn = clamp((raw - 0.1) / 0.8, 0, 1)
          const style = reduced.current
            ? { opacity: 1 - turn, visibility: turn >= 1 ? ('hidden' as const) : undefined }
            : { transform: `rotateY(${-turn * 180}deg)`, visibility: turn >= 1 ? ('hidden' as const) : undefined }
          return (
            <div key={page.id} className="story-screen" style={{ zIndex: N - i, ...style }} aria-hidden={i !== current}>
              <div className="story-inner">
                <div className="story-side">
                  <div className="story-num">{String(i + 1).padStart(2, '0')}<span> / {String(N).padStart(2, '0')}</span></div>
                  <div className="story-title">{page.title}</div>
                </div>
                <div className="story-page comic-page-host">
                  <div className="comic-page" aria-label={page.label}>
                    {page.render({ scenarios: onScenarios })}
                  </div>
                </div>
              </div>
              {/* тень от поднятой страницы */}
              <div className="story-shade" style={{ opacity: Math.sin(turn * Math.PI) * 0.35 }} />
            </div>
          )
        })}

        <nav className="story-dots" aria-label="Страницы истории">
          {STORY.map((p, i) => (
            <button key={p.id} onClick={() => goTo(i)} className={i === current ? 'is-on' : ''} aria-label={`${i + 1}. ${p.title}`} aria-current={i === current} />
          ))}
        </nav>
        {current === 0 && progress < 0.2 && <div className="story-hint">Прокручивайте вниз — страницы перелистываются</div>}
      </div>
    </section>
  )
}
