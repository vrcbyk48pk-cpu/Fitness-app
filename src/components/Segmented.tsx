interface Props<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  // inset = sits inside a card or sheet (a subtle fill instead of its own surface)
  inset?: boolean
}

// A row of options where exactly one is selected, like the iOS segmented control.
export default function Segmented<T extends string>({ options, value, onChange, inset = false }: Props<T>) {
  return (
    <div className={inset ? 'segmented inset' : 'segmented chip'}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
