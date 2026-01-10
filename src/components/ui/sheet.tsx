import * as React from 'react'

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: 'left' | 'right' | 'top' | 'bottom'
  title?: string
  children?: React.ReactNode
}

export const Sheet: React.FC<SheetProps> = ({ open, onOpenChange, side = 'bottom', title, children }) => {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'} `} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`absolute bg-white shadow-xl transition-transform duration-200 rounded-t-2xl ${
          side === 'bottom' ? 'left-0 right-0 bottom-0' : ''
        } ${open ? 'translate-y-0' : 'translate-y-full'} p-4`}
        role="dialog"
        aria-modal="true"
      >
        {title && <div className="text-base font-semibold mb-2">{title}</div>}
        {children}
      </div>
    </div>
  )
}