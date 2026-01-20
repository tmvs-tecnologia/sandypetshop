import * as React from 'react'
import { cn } from '@/src/lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, onCheckedChange, onChange, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn('h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-600', className)}
    onChange={(e) => {
      onCheckedChange?.(e.target.checked)
      onChange?.(e)
    }}
    {...props}
  />
))

Checkbox.displayName = 'Checkbox'
