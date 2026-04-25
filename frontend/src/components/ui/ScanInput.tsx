import { cn } from '@/lib/cn'
import { useRef } from 'react'
import { Button } from './Button'

interface ScanInputProps {
  mode: string
  onScan: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ScanInput({ mode, onScan, placeholder, disabled, className }: ScanInputProps) {
  const ref = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && ref.current?.value.trim()) {
      onScan(ref.current.value.trim())
      ref.current.value = ''
    }
  }

  const handleClick = () => {
    if (ref.current?.value.trim()) {
      onScan(ref.current.value.trim())
      ref.current.value = ''
    }
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-4 rounded-xl',
      'bg-[var(--bg-input)] border border-[var(--border)]',
      'focus-within:border-[var(--accent)] focus-within:bg-[var(--bg-surface)]',
      'transition-all duration-150',
      className
    )}>
      {/* Scan icon */}
      <svg className="w-5 h-5 text-[var(--accent)] flex-shrink-0 opacity-70"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
        <rect x="7" y="7" width="10" height="10" rx="1"/>
      </svg>

      <input
        ref={ref}
        type="text"
        disabled={disabled}
        placeholder={placeholder ?? `Scan in ${mode} mode...`}
        onKeyDown={handleKeyDown}
        autoFocus
        className={cn(
          'flex-1 bg-transparent border-none outline-none',
          'text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)]',
          'font-mono tracking-wide',
          'disabled:opacity-40',
        )}
      />

      <Button
        variant="primary"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className="flex-shrink-0 px-5"
      >
        Scan
      </Button>
    </div>
  )
}
