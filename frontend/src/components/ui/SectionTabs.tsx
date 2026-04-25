import { cn } from '@/lib/cn'

export interface Tab { key: string; label: string }

interface SectionTabsProps {
  tabs: Tab[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function SectionTabs({ tabs, active, onChange, className }: SectionTabsProps) {
  return (
    <div className={cn(
      'flex items-stretch border-b border-[var(--border)] mb-5',
      className
    )}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-2.5 text-xs font-semibold tracking-wide uppercase',
            'border-none bg-transparent cursor-pointer transition-all duration-150',
            'border-b-2 -mb-px',
            active === tab.key
              ? 'text-[var(--accent)] border-[var(--accent)]'
              : 'text-[var(--text-3)] border-transparent hover:text-[var(--text-2)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
