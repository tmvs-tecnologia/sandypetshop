import * as React from 'react'
import { cn } from '@/src/lib/utils'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children?: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, title, description, children }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={() => onOpenChange(false)} />
      <div className={cn('relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl')}
           role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
        <div className="p-6">
          {title && <h2 id="dialog-title" className="text-xl font-bold text-gray-900">{title}</h2>}
          {description && <p id="dialog-desc" className="mt-1 text-sm text-gray-600">{description}</p>}
          <div className="mt-4">{children}</div>
          <div className="mt-6 flex justify-end">
            <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200" onClick={() => onOpenChange(false)}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}