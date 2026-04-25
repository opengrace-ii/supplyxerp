import { cn } from '@/lib/cn'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:   'bg-[var(--accent)] text-[var(--accent-text)] font-semibold border-transparent hover:opacity-85',
  secondary: 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)] hover:opacity-90',
  ghost:     'bg-[var(--bg-surface2)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--bg-surface3)] hover:text-[var(--text-1)]',
  danger:    'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20',
}

const sizes: Record<Size, string> = {
  sm: 'h-7  px-3  text-xs  gap-1.5',
  md: 'h-8  px-3.5 text-sm gap-2',
  lg: 'h-9  px-4  text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'ghost', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded border font-medium',
        'transition-all duration-150 ease-smooth cursor-pointer select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'hover:-translate-y-px active:translate-y-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
