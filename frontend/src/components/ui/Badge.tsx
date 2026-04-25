import { cn } from '@/lib/cn'

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray'

const styles: Record<BadgeVariant, string> = {
  green:  'bg-green-500/12  text-green-400',
  amber:  'bg-amber-500/12  text-amber-400',
  red:    'bg-red-500/12    text-red-400',
  blue:   'bg-blue-400/12   text-blue-400',
  purple: 'bg-violet-500/12 text-violet-400',
  gray:   'bg-[var(--bg-surface3)]       text-[var(--text-3)]',
}

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full',
      'text-2xs font-bold tracking-wide whitespace-nowrap',
      styles[variant],
      className,
    )}>
      {children}
    </span>
  )
}
