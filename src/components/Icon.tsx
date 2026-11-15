// The app's one icon set. Every icon is drawn on a 24x24 grid with the same
// stroke width (set in styles.css on ".icon"), so they all look related.
const ICONS = {
  today: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  barcode: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M8 9v6M12 9v6M16 9v6" />
    </>
  ),
  history: <path d="M6 19v-6M12 19V5M18 19v-9" />,
  settings: (
    <>
      <path d="M5 7h9M18 7h1M5 12h1M10 12h9M5 17h7M16 17h3" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="14" cy="17" r="2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.7-4.7" />
    </>
  ),
  camera: (
    <>
      <path d="M4 9a2.5 2.5 0 0 1 2.5-2.5h1.3l1.3-2h5.8l1.3 2h1.3A2.5 2.5 0 0 1 20 9v7.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" />
      <path d="M14.5 6.5l3 3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  back: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  forward: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  star: <path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />,
  starFilled: (
    <path fill="currentColor" d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
  ),
  torch: <path d="M13 2.5L5.5 13.5h5.5l-1 8 7.5-11H12z" />,
  torchOn: <path fill="currentColor" d="M13 2.5L5.5 13.5h5.5l-1 8 7.5-11H12z" />,
  bookmark: <path d="M7 4h10v16l-5-3.5L7 20z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
    </>
  ),
  food: <path d="M7 3v6.5a2 2 0 0 0 2 2V21M5 3v5M9 3v5M17 21v-7h-3c0-5 1-9 3-11z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.7" />
      <path d="M4.8 20c.9-3.6 3.7-5.5 7.2-5.5s6.3 1.9 7.2 5.5" />
    </>
  ),
}

export type IconName = keyof typeof ICONS

interface Props {
  name: IconName
  size?: number
}

export default function Icon({ name, size = 22 }: Props) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}
