import Icon, { type IconName } from './Icon'

// The one button of the app. Every tappable action uses this component,
// so buttons look and behave the same on every screen.
interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // primary = the main action; glass = frosted, on the page background;
  // quiet = subtle fill, inside cards and sheets; danger = destructive text button
  variant?: 'primary' | 'glass' | 'quiet' | 'danger'
  size?: 'small' | 'regular'
  // inline = icon next to the label; stacked = icon above the label; round = icon only
  layout?: 'inline' | 'stacked' | 'round'
  icon?: IconName
  block?: boolean // take the full width
}

export default function Button({
  variant = 'quiet',
  size = 'regular',
  layout = 'inline',
  icon,
  block = false,
  className = '',
  children,
  ...rest
}: Props) {
  const classes = ['btn', `btn-${variant}`, `btn-${size}`, `btn-${layout}`, block ? 'btn-block' : '', className]
  const iconSize = layout === 'stacked' ? 26 : size === 'small' ? 18 : 22
  return (
    // type="button" so a button inside a form doesn't submit it by accident
    <button type="button" className={classes.join(' ').trim()} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {layout !== 'round' && children}
    </button>
  )
}
