import { useEffect, useRef } from 'react'
import { t } from '../i18n'
import { THEME_IDS, type ThemeId, themeVariables } from '../themes'
import TodayPreview from './TodayPreview'

interface Props {
  value: ThemeId
  onChange: (theme: ThemeId) => void // called when another preview is swiped to the middle
}

// A row of live previews, one per theme, that you swipe through.
// Each preview gets its theme's tokens as CSS variables, so it draws itself in that theme.
export default function ThemeGallery({ value, onChange }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches

  // Start with the current theme in the middle.
  useEffect(() => {
    const item = scroller.current?.children[THEME_IDS.indexOf(value)] as HTMLElement | undefined
    item?.scrollIntoView({ inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // While swiping: find the preview whose centre is closest to the centre of the gallery.
  function onScroll() {
    const box = scroller.current
    if (!box) return
    const middle = box.scrollLeft + box.clientWidth / 2
    let closest = 0
    let smallest = Infinity
    Array.from(box.children).forEach((child, i) => {
      const item = child as HTMLElement
      const distance = Math.abs(item.offsetLeft + item.offsetWidth / 2 - middle)
      if (distance < smallest) {
        smallest = distance
        closest = i
      }
    })
    if (THEME_IDS[closest] !== value) onChange(THEME_IDS[closest])
  }

  return (
    <>
      <div className="gallery" ref={scroller} onScroll={onScroll}>
        {THEME_IDS.map((id) => (
          <div className="gallery-item" key={id}>
            <div className="theme-preview" style={themeVariables(id, dark) as React.CSSProperties} aria-label={t(`theme.${id}`)}>
              <TodayPreview />
            </div>
          </div>
        ))}
      </div>
      <div className="gallery-name">{t(`theme.${value}`)}</div>
      <div className="gallery-dots" aria-hidden="true">
        {THEME_IDS.map((id) => (
          <i key={id} className={id === value ? 'active' : ''} />
        ))}
      </div>
    </>
  )
}
