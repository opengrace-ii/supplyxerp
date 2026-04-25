import { cn } from '@/lib/cn'

interface Column<T> {
  key:      keyof T | string
  header:   string
  render?:  (row: T, index?: number) => React.ReactNode
  width?:   string
  mono?:    boolean
  className?: string
}

interface DataTableProps<T> {
  columns:  Column<T>[]
  rows:     T[]
  onRowClick?: (row: T) => void
  emptyText?: string
  loading?: boolean
}

export function DataTable<T extends Record<string, any>>({
  columns, rows, onRowClick, emptyText = 'No records found', loading
}: DataTableProps<T>) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={String(col.key)}
              style={{ width: col.width }}
              className="text-left px-2.5 pb-2.5 text-2xs font-bold tracking-widest
                         uppercase text-[var(--text-3)] border-b border-[var(--border)]"
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length}
              className="px-2.5 py-8 text-center text-sm text-[var(--text-3)]">
              {emptyText}
            </td>
          </tr>
        ) : rows.map((row, i) => (
          <tr key={i}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'border-b border-[var(--border)] transition-colors duration-100',
              onRowClick ? 'cursor-pointer hover:bg-[var(--bg-surface2)]' : ''
            )}
          >
            {columns.map((col, ci) => {
              const val = col.render ? col.render(row, i) : row[col.key as keyof T]
              return (
                <td key={String(col.key)}
                  className={cn(
                    'px-2.5 py-2 text-[var(--text-2)] align-middle',
                    ci === 0 && 'text-[var(--text-1)] font-medium',
                    col.mono && 'font-mono text-xs text-[var(--accent)]',
                    col.className,
                  )}
                >
                  {val as React.ReactNode}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
