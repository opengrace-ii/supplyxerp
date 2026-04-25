import { useSectionStore, SECTIONS } from '@/store/sectionStore'
import { useAppStore } from '@/store/useAppStore'

const MODULES_BY_TAB = {
  ops: {
    label: 'OPERATIONS',
    items: [
      { name: 'StockFlow',   status: 'LIVE', isLive: true },
      { name: 'LedgerStock', status: 'LIVE', isLive: true }
    ]
  },
  mfg: {
    label: 'MANUFACTURING',
    items: [
      { name: 'MaterialHub',          status: 'LIVE', isLive: true },
      { name: 'RFQManagement',        status: 'LIVE', isLive: true },
      { name: 'POManagement',         status: 'LIVE', isLive: true },
      { name: 'PO Block/Cancel',      status: 'LIVE', isLive: true },
      { name: 'PO Account Assignment',status: 'LIVE', isLive: true },
      { name: 'Progress Tracking',    status: 'LIVE', isLive: true },
      { name: 'BuildOrder',           status: 'LIVE', isLive: true },
      { name: 'QualityGate',          status: 'LIVE', isLive: true },
      { name: 'Delivery confirmation',status: 'LIVE', isLive: true },
      { name: 'Invoice matching',     status: 'LIVE', isLive: true },
    ]
  },
  com: {
    label: 'COMMERCE',
    items: [
      { name: 'DealFlow',        status: 'LIVE', isLive: true },
      { name: 'RouteRunner',     status: 'LIVE', isLive: true },
      { name: 'Supply Pacts',    status: 'LIVE', isLive: true },
      { name: 'Vendor Scorecards', status: 'LIVE', isLive: true }
    ]
  },
  sys: {
    label: 'SYSTEM',
    items: [
      { name: 'System Log',    status: 'LIVE', isLive: true },
      { name: 'Audit log',     status: 'LIVE', isLive: true },
      { name: 'Users & roles', status: 'LIVE', isLive: true }
    ]
  },
  cfg: {
    label: 'CONFIG',
    items: [
      { name: 'Setup',              status: 'LIVE', isLive: true },
      { name: 'Pricing Engine',     status: 'LIVE', isLive: true },
      { name: 'Tenants',            status: 'LIVE', isLive: true },
      { name: 'Org Structure',      status: 'LIVE', isLive: true },
      { name: 'Price Formulas',     status: 'LIVE', isLive: true },
      { name: 'Document Dispatch',  status: 'LIVE', isLive: true },
      { name: 'Module config',      status: 'LIVE', isLive: true },
      { name: 'Notifications',      status: 'LIVE', isLive: true }
    ]
  }
}

export function Sidebar() {
  const { section } = useSectionStore()
  const { currentModule, setModule } = useAppStore()

  const tabData = (MODULES_BY_TAB as any)[section]
  if (!tabData) return (
    <aside style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }} />
  )

  return (
    <aside
      className="flex flex-col overflow-y-auto select-none transition-colors duration-300"
      style={{ width: 'var(--sidebar-width)', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--border)' }}
    >
      <div
        className="px-4 pt-4 pb-2 text-[9.5px] font-bold tracking-widest uppercase"
        style={{ color: 'var(--accent)', opacity: 0.6 }}
      >
        {tabData.label}
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {tabData.items.map((item: any) => {
          const active = currentModule === item.name
          return (
            <button
              key={item.name}
              onClick={() => setModule(item.name)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-[12.5px] transition-all duration-150 border-none cursor-pointer"
              style={{
                background: active ? 'var(--accent-dim)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-2)',
                fontWeight: active ? 600 : 400,
                borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: '6px',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold"
                  style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }}
                >
                  {item.name.charAt(0)}
                </div>
                <span className="sx-nav-label">{item.name}</span>
              </div>

              {item.isLive ? (
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              ) : (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--bg-surface3)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
                >
                  {item.status}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 mt-auto" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--bg-surface2)', border: '1px solid var(--border)', color: 'var(--text-3)' }}
          >
            TL
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-1)', lineHeight: 1 }}>TechLogix UK</span>
            <span className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>Site: LHR-01</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
