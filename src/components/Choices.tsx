import Icon from './Icon'

export interface Choice<T> {
  value: T
  label: string
  tag?: string // a small badge next to the label, e.g. "Recommended"
  description?: string
  detail?: string // an optional second line under the description
  disabled?: boolean // shown, but cannot be chosen
  lead?: React.ReactNode // something to show in front of the text, e.g. a colour swatch
}

interface Props<T> {
  options: Choice<T>[]
  value: T | undefined
  onChange: (value: T) => void
}

// A list of rows to pick one from; the selected one gets an accent outline and a check mark.
export default function Choices<T extends string | number>({ options, value, onChange }: Props<T>) {
  return (
    <div>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'row surface selected' : 'row surface'}
          onClick={() => onChange(option.value)}
          disabled={option.disabled}
          aria-pressed={option.value === value}
        >
          {option.lead}
          <div className="row-main">
            <div className="row-title">
              {option.label}
              {option.tag && <span className="tag">{option.tag}</span>}
            </div>
            {option.description && <div className="muted">{option.description}</div>}
            {option.detail && <div className="muted">{option.detail}</div>}
          </div>
          <span className="row-check">
            <Icon name="check" size={16} />
          </span>
        </button>
      ))}
    </div>
  )
}
