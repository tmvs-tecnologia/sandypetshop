import * as React from 'react'
import { cn } from '@/src/lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn('h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-600', className)}
    {...props}
  />
))

Checkbox.displayName = 'Checkbox'

