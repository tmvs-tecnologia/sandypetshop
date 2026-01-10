import * as React from 'react'
import { cn } from '@/src/lib/utils'

type RadioGroupContextValue = {
  name?: string
  value?: string
  setValue: (v: string) => void
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null)

export const RadioGroup: React.FC<{
  name?: string
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  className?: string
  children?: React.ReactNode
}> = ({ name, value, defaultValue, onValueChange, className, children }) => {
  const [internal, setInternal] = React.useState<string | undefined>(defaultValue)
  const current = value !== undefined ? value : internal
  const setValue = (v: string) => {
    if (value === undefined) setInternal(v)
    onValueChange?.(v)
  }
  return (
    <RadioGroupContext.Provider value={{ name, value: current, setValue }}>
      <div className={cn('flex flex-wrap gap-2', className)}>{children}</div>
    </RadioGroupContext.Provider>
  )
}

export const RadioGroupItem: React.FC<{
  value: string
  children?: React.ReactNode
  className?: string
}> = ({ value, children, className }) => {
  const ctx = React.useContext(RadioGroupContext)
  const checked = ctx?.value === value
  return (
    <label className={cn('inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold', checked ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-700 hover:bg-pink-50', className)}>
      <input
        type="radio"
        name={ctx?.name}
        value={value}
        checked={checked}
        onChange={() => ctx?.setValue(value)}
        className="sr-only"
      />
      <span>{children}</span>
    </label>
  )
}

