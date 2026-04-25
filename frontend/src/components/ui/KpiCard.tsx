import { cn } from '@/lib/cn'

interface KpiCardProps {
  label:     string
  value:     string | number
  delta?:    string
  deltaDir?: 'up' | 'down' | 'neutral'
  icon?:     React.ReactNode
  className?: string
}

export function KpiCard({
  label, value, delta, deltaDir = 'neutral', icon, className
}: KpiCardProps) {
  return (
    <div className={cn('relative rounded-xl overflow-hidden p-4 transition-all duration-150', className)}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-hi)'
        ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface2)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface)'
      }}
    >
      {/* Accent top stripe — follows section theme */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'var(--accent)', opacity: 0.8 }}
      />

      <div className="flex items-start justify-between mb-3">
        <span
          className="text-[10px] font-bold tracking-[0.1em] uppercase"
          style={{ color: 'var(--text-3)' }}
        >
          {label}
        </span>
        {icon && (
          <span className="text-base leading-none opacity-60" style={{ color: 'var(--accent)' }}>
            {icon}
          </span>
        )}
      </div>

      <div
        className="font-bold leading-none tracking-tight tabular-nums"
        style={{
          fontSize: 'clamp(22px, 2.5vw, 32px)',
          color: 'var(--text-1)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {value}
      </div>

      {delta && (
        <div
          className="text-[11px] font-medium mt-2 leading-none"
          style={{
            color: deltaDir === 'up' ? 'var(--c-green)'
                 : deltaDir === 'down' ? 'var(--c-red)'
                 : 'var(--text-3)'
          }}
        >
          {deltaDir === 'up' ? '▲ ' : deltaDir === 'down' ? '▼ ' : ''}{delta}
        </div>
      )}
    </div>
  )
}
