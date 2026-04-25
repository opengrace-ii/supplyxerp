import { cn } from '@/lib/cn'
import { type InputHTMLAttributes, type SelectHTMLAttributes,
         type TextareaHTMLAttributes, forwardRef } from 'react'

interface FieldProps {
  label:    string
  error?:   string
  children: React.ReactNode
  className?: string
}

export function Field({ label, error, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-2xs font-bold tracking-widest uppercase text-[var(--text-3)]">
        {label}
      </label>
      {children}
      {error && <p className="text-2xs text-red-400">{error}</p>}
    </div>
  )
}

const inputBase = [
  'w-full rounded-md text-sm',
  'transition-colors duration-150',
  'outline-none',
  'disabled:opacity-40 disabled:cursor-not-allowed',
  'placeholder:text-[var(--text-3)]'
].join(' ')

const inputStyles: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-hi)',
  borderRadius: 'var(--r-md)',
  color: 'var(--text-1)',
  fontFamily: 'var(--font-sans)',
  width: '100%',
  height: '36px',
  padding: '0 10px',
  fontSize: 'var(--fs-base)',
  outline: 'none',
  transition: 'border-color 180ms ease, background 180ms ease',
}

const selectStyles: React.CSSProperties = {
  ...inputStyles,
  cursor: 'pointer',
}

const textareaStyles: React.CSSProperties = {
  ...inputStyles,
  height: 'auto',
  minHeight: '80px',
  padding: '8px 10px',
  resize: 'vertical' as const,
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(inputBase, 'focus:shadow-[0_0_0_3px_var(--accent-dim)]', className)}
      style={{ ...inputStyles, ...style }}
      {...props}
      onFocus={e => {
        e.target.style.borderColor = 'var(--accent)'
        e.target.style.background = 'var(--bg-surface)'
        props.onFocus?.(e)
      }}
      onBlur={e => {
        e.target.style.borderColor = 'var(--border-hi)'
        e.target.style.background = 'var(--bg-input)'
        props.onBlur?.(e)
      }}
    />
  )
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, style, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(inputBase, className)}
      style={{ ...selectStyles, ...style }}
      {...props}
    />
  )
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, style, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(inputBase, className)}
      style={{ ...textareaStyles, ...style }}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

interface InlineAlertProps { type: 'error' | 'success'; message: string; className?: string }
export function InlineAlert({ type, message, className }: InlineAlertProps) {
  return (
    <div className={cn('px-3 py-2 rounded-md text-xs font-medium mt-3 border', {
      'bg-red-500/10   text-red-400   border-red-500/20':   type === 'error',
      'bg-green-500/10 text-green-400 border-green-500/20': type === 'success',
    }, className)}>
      {message}
    </div>
  )
}
