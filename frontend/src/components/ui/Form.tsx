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

const inputBase = cn(
  'w-full h-9 px-2.5 rounded-md text-sm text-[var(--text-1)]',
  'bg-[var(--bg-input)] border border-[var(--border-hi)]',
  'transition-colors duration-150',
  'placeholder:text-[var(--text-3)]',
  'focus:outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]',
  'disabled:opacity-40 disabled:cursor-not-allowed',
)

export const Input = forwardRef<
  HTMLInputElement, InputHTMLAttributes<HTMLInputElement>
>((props, ref) => (
  <input ref={ref} className={cn(inputBase, props.className)} {...props} />
))
Input.displayName = 'Input'

export const Select = forwardRef<
  HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>
>((props, ref) => (
  <select ref={ref} className={cn(inputBase, 'cursor-pointer', props.className)} {...props} />
))
Select.displayName = 'Select'

export const Textarea = forwardRef<
  HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>
>((props, ref) => (
  <textarea ref={ref}
    className={cn(inputBase, 'h-auto py-2.5 resize-y min-h-[80px]', props.className)}
    {...props}
  />
))
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
