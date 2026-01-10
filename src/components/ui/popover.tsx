import * as React from 'react'
import { cn } from '@/src/lib/utils'

const PopoverContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

export const Popover: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className={cn('relative inline-block', className)}>{children}</div>
    </PopoverContext.Provider>
  )
}

export const PopoverTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, onClick, ...props }) => {
  const ctx = React.useContext(PopoverContext)
  return (
    <button
      className={cn('inline-flex items-center justify-center rounded-lg px-3 py-2 bg-gray-100 text-gray-800 hover:bg-gray-200', className)}
      onClick={(e) => { ctx?.setOpen(!ctx.open); onClick?.(e) }}
      {...props}
    />
  )
}

export const PopoverContent: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  const ctx = React.useContext(PopoverContext)
  if (!ctx?.open) return null
  return (
    <div className={cn('absolute z-50 mt-2 rounded-lg border bg-white p-3 shadow-lg', className)}>{children}</div>
  )
}

