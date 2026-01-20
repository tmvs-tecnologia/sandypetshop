import * as React from 'react'
import { cn } from '@/src/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const inputId = id || React.useId()
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'w-full h-10 px-3 rounded-lg border bg-white text-gray-900 placeholder:text-gray-400',
            'focus:ring-2 focus:ring-pink-600 focus:border-pink-600 outline-none transition',
            error ? 'border-red-500' : 'border-gray-300'
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-gray-500">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'