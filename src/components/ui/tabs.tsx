import * as React from 'react'
import { cn } from '@/src/lib/utils'

type TabsCtx = {
  value?: string
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsCtx | null>(null)

export const Tabs: React.FC<{ defaultValue?: string; value?: string; onValueChange?: (v: string) => void; className?: string; children?: React.ReactNode }>
  = ({ defaultValue, value, onValueChange, className, children }) => {
    const [internal, setInternal] = React.useState<string | undefined>(defaultValue)
    const current = value !== undefined ? value : internal
    const setValue = (v: string) => { if (value === undefined) setInternal(v); onValueChange?.(v) }
    return (
      <TabsContext.Provider value={{ value: current, setValue }}>
        <div className={cn('space-y-3', className)}>{children}</div>
      </TabsContext.Provider>
    )
}

export const TabsList: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('flex items-center gap-2 rounded-lg bg-gray-100 p-1', className)}>{children}</div>
)

export const TabsTrigger: React.FC<{ value: string; className?: string; children?: React.ReactNode }> = ({ value, className, children }) => {
  const ctx = React.useContext(TabsContext)
  const active = ctx?.value === value
  return (
    <button type="button" onClick={() => ctx?.setValue(value)} className={cn('px-3 py-2 rounded-md text-sm font-semibold', active ? 'bg-white text-pink-700 shadow' : 'text-gray-700 hover:bg-white/70', className)}>
      {children}
    </button>
  )
}

export const TabsContent: React.FC<{ value: string; className?: string; children?: React.ReactNode }> = ({ value, className, children }) => {
  const ctx = React.useContext(TabsContext)
  return ctx?.value === value ? <div className={cn('rounded-lg border bg-white p-4', className)}>{children}</div> : null
}

