import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export type ButtonVariant = 'premium' | 'operational' | 'secondary' | 'tertiary' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export function buttonClass(variant: ButtonVariant = 'operational', size: ButtonSize = 'md', className?: string): string {
  return cx('btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, className)
}

export function Button({
  variant = 'operational',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

export type CardVariant = 'surface' | 'metric' | 'property' | 'market' | 'activity' | 'presentation' | 'inspector'

export function Card({ variant = 'surface', interactive = false, className, ...props }: HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
  interactive?: boolean
}) {
  const roleClass = variant === 'surface' ? 'surface-card' : `card-${variant}`
  return <div className={cx(roleClass, interactive && 'surface-interactive', className)} {...props} />
}

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export function Badge({ tone = 'neutral', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return <span className={cx('badge', `badge-${tone}`, className)} {...props} />
}

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className
}: {
  icon: ReactNode
  title: string
  description?: string
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('empty-state', className)}>
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {description && <p className="empty-state-copy">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="empty-state-actions">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

