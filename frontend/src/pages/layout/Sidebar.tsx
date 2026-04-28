import React, { useState, useEffect } from 'react'
import { useSectionStore, SECTIONS, type Section } from '@/store/sectionStore'
import { useAppStore } from '@/store/useAppStore'

const COLLAPSED_WIDTH = '52px'
const EXPANDED_WIDTH  = '210px'

const MODULES_BY_TAB: Record<Section, { label: string; items: any[] }> = {
  ops: {
    label: 'Operations',
    items: [
      { key: 'StockFlow',   label: 'Stock Flow',   icon: 'S', isLive: true },
      { key: 'LedgerStock', label: 'Ledger Stock', icon: 'L', isLive: true }
    ]
  },
  mfg: {
    label: 'Manufacturing',
    items: [
      { key: 'MaterialHub',           label: 'Material Hub',          icon: 'M', isLive: true },
      { key: 'POManagement',          label: 'PO Manage',             icon: 'P', isLive: true },
      { key: 'PO Block/Cancel',       label: 'PO Block/Cancel',       icon: 'B', isLive: true },
      { key: 'PO Account Assignment', label: 'PO Account Assignment', icon: 'A', isLive: true },
      { key: 'Progress Tracking',     label: 'Progress Tracking',     icon: 'T', isLive: true },
      { key: 'BuildOrder',            label: 'Build Order',           icon: 'O', isLive: true },
      { key: 'QualityGate',           label: 'Quality Gate',          icon: 'Q', isLive: true },
      { key: 'Delivery confirmation', label: 'Delivery Confirmation', icon: 'D', isLive: true },
      { key: 'Invoice matching',      label: 'Invoice Match',         icon: 'I', isLive: true },
    ]
  },
  com: {
    label: 'Commerce',
    items: [
      { key: 'DealFlow',          label: 'Deal Flow',         icon: 'D', isLive: true },
      { key: 'RouteRunner',       label: 'Route Runner',      icon: 'R', isLive: true },
      { key: 'Supply Pacts',      label: 'Supply Pacts',      icon: 'S', isLive: true },
      { key: 'Vendor Scorecards', label: 'Vendor Scorecards', icon: 'V', isLive: true }
    ]
  },
  sys: {
    label: 'System',
    items: [
      { key: 'System Log',    label: 'System Log',    icon: 'L', isLive: true },
      { key: 'Audit log',     label: 'Audit Log',     icon: 'A', isLive: true },
      { key: 'Users & roles', label: 'Users & Roles', icon: 'U', isLive: true }
    ]
  },
  cfg: {
    label: 'Config',
    items: [
      { key: 'Setup',              label: 'Setup',              icon: 'S', isLive: true },
      { key: 'Pricing Engine',     label: 'Pricing Engine',     icon: 'P', isLive: true },
      { key: 'Tenants',            label: 'Tenants',            icon: 'T', isLive: true },
      { key: 'Org Structure',      label: 'Org Structure',      icon: 'O', isLive: true },
      { key: 'Price Formulas',     label: 'Price Formulas',     icon: 'F', isLive: true },
      { key: 'Document Dispatch',  label: 'Document Dispatch',  icon: 'D', isLive: true },
      { key: 'Module config',      label: 'Module Config',      icon: 'M', isLive: true },
      { key: 'Notifications',      label: 'Notifications',      icon: 'N', isLive: true }
    ]
  }
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem('sx-sidebar-collapsed') === 'true'
  )

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sx-sidebar-collapsed', String(next))
  }

  const { section } = useSectionStore()
  const { currentModule, setModule } = useAppStore()

  const tabData = MODULES_BY_TAB[section]

  const sidebarStyle: React.CSSProperties = {
    width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
    minWidth: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
    background: 'var(--sidebar-bg)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'width 200ms cubic-bezier(0.4,0,0.2,1), min-width 200ms cubic-bezier(0.4,0,0.2,1)',
    flexShrink: 0,
    position: 'relative',
    height: '100%',
  }

  const NavItem = ({
    moduleKey, icon, label, badge, dotType
  }: {
    moduleKey: string
    icon: string
    label: string
    badge?: number
    dotType?: 'live' | 'phase'
  }) => {
    const isActive = currentModule === moduleKey
    const accentColor = 'var(--accent)'

    return (
      <div
        onClick={() => setModule(moduleKey)}
        title={collapsed ? label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : '9px',
          padding: collapsed ? '8px 0' : '8px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          cursor: 'pointer',
          borderRight: isActive
            ? `2px solid ${accentColor}`
            : '2px solid transparent',
          background: isActive ? 'var(--accent-dim)' : 'transparent',
          transition: 'all 150ms ease',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
        }}
        onMouseLeave={e => {
          if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
        }}
      >
        <span style={{
          width: '26px',
          height: '26px',
          borderRadius: '6px',
          background: isActive ? 'var(--accent-dim)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          flexShrink: 0,
          color: isActive ? accentColor : 'var(--text-2)',
          fontWeight: isActive ? 700 : 500,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          {icon}
        </span>

        {!collapsed && (
          <>
            <span style={{
              flex: 1,
              fontSize: '12.5px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? accentColor : 'var(--text-2)',
              fontFamily: 'Inter, system-ui, sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
            }}>
              {label}
            </span>

            {badge !== undefined && badge > 0 && (
              <span style={{
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: '3px',
                background: 'var(--accent-dim)',
                color: accentColor,
                flexShrink: 0,
              }}>
                {badge}
              </span>
            )}

            {dotType && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: dotType === 'live' ? '#22c55e' : 'var(--text-4)',
                flexShrink: 0,
              }} />
            )}
          </>
        )}
      </div>
    )
  }

  const GroupLabel = ({ label }: { label: string }) => (
    collapsed ? <div style={{ height: '10px' }} /> : (
      <div style={{
        padding: '14px 12px 4px',
        fontSize: '9.5px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--accent)',
        opacity: 0.55,
        fontFamily: 'Inter, system-ui, sans-serif',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}>
        {label}
      </div>
    )
  )

  return (
    <aside style={sidebarStyle}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {tabData && (
          <>
            <GroupLabel label={tabData.label} />
            <nav style={{ padding: '4px 0' }}>
              {tabData.items.map((item) => (
                <NavItem
                  key={item.key}
                  moduleKey={item.key}
                  label={item.label}
                  icon={item.icon}
                  dotType={item.isLive ? 'live' : undefined}
                />
              ))}
            </nav>
          </>
        )}
      </div>

      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {!collapsed && (
          <>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-1)',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>TechLogix UK</div>
            <div style={{
              fontSize: '10px',
              color: 'var(--text-3)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>Site: LHR-01</div>
          </>
        )}
      </div>

      <div
        onClick={toggle}
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          cursor: 'pointer',
          color: 'var(--text-3)',
          transition: 'color 150ms ease',
          flexShrink: 0,
          background: 'rgba(0,0,0,0.02)'
        }}
        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = 'var(--text-1)'}
        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = 'var(--text-3)'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </div>
    </aside>
  )
}
