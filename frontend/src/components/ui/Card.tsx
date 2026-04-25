import { cn } from '@/lib/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}
interface CardHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn('rounded-xl overflow-hidden transition-colors', onClick && 'cursor-pointer', className)}
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, children, className }: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between px-4 py-3', className)}
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{title}</span>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{subtitle}</p>}
      </div>
      {action && <span className="text-xs font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>{action}</span>}
      {children}
    </div>
  )
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn('p-4', className)}>{children}</div>
}
