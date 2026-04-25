import type { ReactNode } from 'react'
import { useSectionStore, SECTIONS, type Section } from '@/store/sectionStore'
import { useAppStore } from '@/store/useAppStore'
import { Button } from '@/components/ui/Button'

const RIBBON: { key: Section; label: string }[] = [
  { key: 'ops', label: 'Operations'    },
  { key: 'mfg', label: 'Manufacturing' },
  { key: 'com', label: 'Commerce'      },
  { key: 'sys', label: 'System'        },
  { key: 'cfg', label: 'Config'        },
]

const FIRST_MODULE: Record<Section, string> = {
  ops: 'StockFlow',
  mfg: 'MaterialHub',
  com: 'DealFlow',
  sys: 'System Log',
  cfg: 'Setup',
}

export function TopBar() {
  const { section, theme, setSection, toggleTheme } = useSectionStore()
  const { setModule } = useAppStore()

  const handleSectionClick = (key: Section) => {
    setSection(key)
    setModule(FIRST_MODULE[key])
  }

  return (
    <header
      className="col-span-2 flex items-center px-4 gap-3 select-none z-50"
      style={{ height: 'var(--topbar-height)', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <span className="text-sm font-bold tracking-tight flex-shrink-0 mr-2">
        <span className="sx-logo-supply">Supply</span>
        <span className="sx-logo-x">X</span>
        <span className="sx-logo-erp text-xs"> ERP</span>
      </span>

      {/* Separator */}
      <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border-hi)' }} />

      {/* Breadcrumb */}
      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
        {SECTIONS[section].label} · TechLogix UK
      </span>

      {/* Search */}
      <div className="flex-1 max-w-[260px] ml-2">
        <div className="sx-search" style={{ height: '28px', minWidth: 0 }}>
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="7" cy="7" r="4.5"/>
            <path d="M11 11l2.5 2.5" strokeLinecap="round"/>
          </svg>
          <input placeholder="Search anything…" readOnly />
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'var(--bg-surface3)', color: 'var(--text-3)' }}>⌘K</kbd>
        </div>
      </div>

      {/* Ribbon tabs */}
      <nav className="flex items-stretch ml-4 gap-0.5 h-full">
        {RIBBON.map(({ key, label }) => {
          const active = section === key
          const accent = SECTIONS[key].accent
          return (
            <button
              key={key}
              onClick={() => handleSectionClick(key)}
              className="relative flex items-center gap-1.5 px-3.5 text-xs font-medium cursor-pointer border-none bg-transparent transition-colors duration-150 h-full whitespace-nowrap"
              style={{ color: active ? accent : 'var(--text-3)' }}
            >
              <span className="w-2 h-2 rounded-[2px] flex-shrink-0 transition-opacity" style={{ background: accent, opacity: active ? 1 : 0.35 }} />
              {label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ background: accent }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 font-medium">Live</span>
        </div>

        <button
          onClick={toggleTheme}
          className="text-xs px-2 py-1 rounded transition-all"
          style={{ background: 'var(--bg-surface2)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer' }}
        >
          {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
        </button>

        <button
          className="text-xs px-2 py-1 rounded transition-all flex items-center gap-1.5"
          style={{ background: 'var(--bg-surface2)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer' }}
        >
          Notifications
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}>3</span>
        </button>

        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
        >
          TK
        </div>
      </div>
    </header>
  )
}
