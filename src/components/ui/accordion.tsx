import * as React from 'react'
import { cn } from '@/src/lib/utils'

type Ctx = {
  type: 'single' | 'multiple'
  openValues: string[]
  toggle: (v: string) => void
}

const AccordionContext = React.createContext<Ctx | null>(null)

export const Accordion: React.FC<{
  type?: 'single' | 'multiple'
  defaultValue?: string | string[]
  value?: string | string[]
  onValueChange?: (v: string | string[]) => void
  className?: string
  children?: React.ReactNode
}> = ({ type = 'single', defaultValue, value, onValueChange, className, children }) => {
  const [openValues, setOpenValues] = React.useState<string[]>(() => {
    if (Array.isArray(defaultValue)) return defaultValue
    if (typeof defaultValue === 'string') return [defaultValue]
    return []
  })
  const current = value !== undefined ? (Array.isArray(value) ? value : [value]) : openValues
  const toggle = (v: string) => {
    let next = current
    if (type === 'single') next = current[0] === v ? [] : [v]
    else next = current.includes(v) ? current.filter(x => x !== v) : [...current, v]
    if (value === undefined) setOpenValues(next)
    onValueChange?.(type === 'single' ? next[0] ?? '' : next)
  }
  return (
    <AccordionContext.Provider value={{ type, openValues: current, toggle }}>
      <div className={cn('space-y-3', className)}>{children}</div>
    </AccordionContext.Provider>
  )
}

export const AccordionItem: React.FC<{ value: string; className?: string; children?: React.ReactNode }> = ({ value, className, children }) => (
  <div data-value={value} className={cn('rounded-xl border bg-white', className)}>{children}</div>
)

export const AccordionTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { itemValue: string }> = ({ itemValue, className, children, ...props }) => {
  const ctx = React.useContext(AccordionContext)
  const open = !!ctx?.openValues.includes(itemValue)
  return (
    <button
      type="button"
      onClick={() => ctx?.toggle(itemValue)}
      aria-expanded={open}
      className={cn('w-full flex items-center justify-between px-4 py-3 text-sm font-semibold', open ? 'text-pink-700' : 'text-gray-800', className)}
      {...props}
    >
      {children}
      <svg className={cn('h-5 w-5 transition-transform', open ? 'rotate-90' : '')} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
    </button>
  )
}

export const AccordionContent: React.FC<{ itemValue: string; className?: string; children?: React.ReactNode }> = ({ itemValue, className, children }) => {
  const ctx = React.useContext(AccordionContext)
  const open = !!ctx?.openValues.includes(itemValue)
  return open ? <div className={cn('px-4 pb-4 text-sm text-gray-700', className)}>{children}</div> : null
}

