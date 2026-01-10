import * as React from 'react'
import { cn } from '@/src/lib/utils'

const DropdownMenuContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

export const DropdownMenu: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className={cn('relative inline-block', className)}>{children}</div>
    </DropdownMenuContext.Provider>
  )
}

export const DropdownMenuTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, onClick, ...props }) => {
  const ctx = React.useContext(DropdownMenuContext)
  return (
    <button
      className={cn('inline-flex items-center justify-center rounded-lg px-3 py-2 bg-gray-100 text-gray-800 hover:bg-gray-200', className)}
      onClick={(e) => { ctx?.setOpen(!ctx.open); onClick?.(e) }}
      {...props}
    />
  )
}

export const DropdownMenuContent: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className, children }) => {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx?.open) return null
  return (
    <div className={cn('absolute z-50 mt-2 w-56 rounded-lg border bg-white shadow-lg', className)}>
      <div className="py-2">{children}</div>
    </div>
  )
}

export const DropdownMenuItem: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button className={cn('w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-pink-50', className)} {...props} />
)

