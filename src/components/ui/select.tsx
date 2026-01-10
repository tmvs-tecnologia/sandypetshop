import * as React from 'react'
import { cn } from '@/src/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
  options?: { label: string; value: string }[]
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, helperText, error, id, options, children, ...props }, ref) => {
    const selectId = id || React.useId()
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full h-10 px-3 rounded-lg border bg-white text-gray-900',
            'focus:ring-2 focus:ring-pink-600 focus:border-pink-600 outline-none transition',
            error ? 'border-red-500' : 'border-gray-300'
          )}
          {...props}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )) || children}
        </select>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'