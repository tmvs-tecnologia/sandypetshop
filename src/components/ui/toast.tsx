import * as React from 'react'
import { cn } from '@/src/lib/utils'

type ToastItem = { id: number; title?: string; description?: string; variant?: 'default' | 'success' | 'error' }

const ToastContext = React.createContext<{
  toasts: ToastItem[]
  add: (t: Omit<ToastItem, 'id'>) => void
  remove: (id: number) => void
} | null>(null)

export const ToastProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const add = (t: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts(prev => [...prev, { id, ...t }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000)
  }
  const remove = (id: number) => setToasts(prev => prev.filter(x => x.id !== id))
  return (
    <ToastContext.Provider value={{ toasts, add, remove }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={cn('rounded-lg border bg-white px-4 py-3 shadow', t.variant === 'success' ? 'border-green-500' : t.variant === 'error' ? 'border-red-500' : 'border-gray-200')}>
            {t.title && <div className="text-sm font-semibold text-gray-900">{t.title}</div>}
            {t.description && <div className="text-sm text-gray-700">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

