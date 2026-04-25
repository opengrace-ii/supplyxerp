import React from 'react'
import { useSectionStore, SECTIONS, type Section } from '@/store/sectionStore'
import { useAppStore } from '@/store/useAppStore'

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
  const { setModule, user, logout } = useAppStore()

  const handleSectionClick = (key: Section) => {
    setSection(key)
    setModule(FIRST_MODULE[key])
  }

  const getInitials = () => {
    if (!user) return '??'
    const first = user.first_name ? user.first_name.charAt(0) : ''
    const last = user.last_name ? user.last_name.charAt(0) : ''
    return (first + last).toUpperCase() || 'U'
  }

  return (
    <header style={{
      gridColumn: '1 / -1',
      height: 'var(--topbar-height, 46px)',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '12px',
      position: 'relative',
      zIndex: 100,
      flexShrink: 0,
    }}>

      {/* ── LOGO ── */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '1px',
        flexShrink: 0,
        marginRight: '8px',
      }}>
        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--text-1)',
          letterSpacing: '-0.03em',
        }}>Supply</span>
        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--accent)',
          letterSpacing: '-0.03em',
        }}>X</span>
        <span style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-3)',
          marginLeft: '2px',
          letterSpacing: '0.02em',
        }}>ERP</span>
      </div>

      {/* ── SEPARATOR ── */}
      <div style={{
        width: '1px',
        height: '18px',
        background: 'var(--border)',
        flexShrink: 0,
      }} />

      {/* ── BREADCRUMB ── */}
      <span style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '11px',
        color: 'var(--text-3)',
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        {SECTIONS[section].label} · TechLogix UK
      </span>

      {/* ── SEARCH — ONE AND ONLY ONE ── */}
      <div style={{
        flex: 1,
        maxWidth: '280px',
        marginLeft: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '30px',
        padding: '0 10px',
        background: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        cursor: 'text',
        transition: 'border-color 150ms ease',
      }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
          stroke="var(--text-3)" strokeWidth="1.8">
          <circle cx="7" cy="7" r="4.5"/>
          <path d="M11 11l2.5 2.5" strokeLinecap="round"/>
        </svg>
        <span style={{
          fontSize: '12px',
          color: 'var(--text-3)',
          fontFamily: 'Inter, system-ui, sans-serif',
          flex: 1,
        }}>Search anything…</span>
        <kbd style={{
          fontSize: '10px',
          color: 'var(--text-4)',
          background: 'var(--bg-surface2)',
          padding: '1px 5px',
          borderRadius: '3px',
          fontFamily: 'inherit',
        }}>⌘K</kbd>
      </div>

      {/* ── RIBBON TABS ── */}
      <nav style={{
        display: 'flex',
        alignItems: 'stretch',
        height: '100%',
        marginLeft: '8px',
        gap: '0',
        flexShrink: 0,
      }}>
        {RIBBON.map(({ key, label }) => {
          const isActive = section === key
          const accent = SECTIONS[key].accent
          return (
            <button
              key={key}
              onClick={() => handleSectionClick(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '0 14px',
                height: '100%',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                position: 'relative',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '12.5px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? accent : 'var(--text-3)',
                whiteSpace: 'nowrap',
                transition: 'color 150ms ease',
                borderBottom: isActive
                  ? `2px solid ${accent}`
                  : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '2px',
                background: accent,
                opacity: isActive ? 1 : 0.35,
                flexShrink: 0,
                display: 'inline-block',
              }} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* ── RIGHT SIDE ── */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#22c55e',
            display: 'inline-block',
            boxShadow: '0 0 0 0 rgba(34,197,94,0.4)',
            animation: 'pulse-green 2s infinite',
          }} />
          <span style={{
            fontSize: '11px',
            color: '#22c55e',
            fontWeight: 500,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}>Live</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            height: '28px',
            padding: '0 10px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface2)',
            color: 'var(--text-2)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {theme === 'dark' ? '☀' : '🌙'} {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {/* Notifications */}
        <button style={{
          height: '28px',
          padding: '0 10px',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface2)',
          color: 'var(--text-2)',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '11px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}>
          Notifications
          <span style={{
            background: 'var(--accent)',
            color: 'var(--accent-text)',
            fontSize: '9px',
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: '3px',
          }}>3</span>
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            height: '28px',
            padding: '0 10px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface2)',
            color: 'var(--text-2)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          Logout
        </button>

        {/* Avatar */}
        <div
          title={user?.email || 'User Profile'}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
          }}
        >
          {getInitials()}
        </div>
      </div>

    </header>
  )
}
