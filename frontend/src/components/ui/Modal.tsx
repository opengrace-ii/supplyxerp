import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/cn'
import { Button } from './Button'

interface ModalProps {
  open:        boolean
  onClose:     () => void
  title:       string
  subtitle?:   string
  children:    React.ReactNode
  width?:      string
}

export function Modal({ open, onClose, title, subtitle, children, width = 'w-[520px]' }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=open]:fade-in data-[state=closed]:fade-out" />
        <Dialog.Content className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          'rounded-xl p-6 max-h-[90vh]',
          'overflow-y-auto shadow-2xl max-w-[95vw]',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in data-[state=open]:zoom-in-95',
          'data-[state=closed]:fade-out data-[state=closed]:zoom-out-95',
          width,
        )}
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-hi)', boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="flex items-start justify-between mb-5">
            <div>
              <Dialog.Title className="text-base font-semibold text-[var(--text-1)]">
                {title}
              </Dialog.Title>
              {subtitle && (
                <Dialog.Description className="text-xs text-[var(--text-3)] mt-1">
                  {subtitle}
                </Dialog.Description>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-4 flex-shrink-0">
              ✕
            </Button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
