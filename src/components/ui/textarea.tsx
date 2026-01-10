import * as React from 'react'
import { cn } from '@/src/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn('w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-600 focus:border-transparent', className)}
    {...props}
  />
))

Textarea.displayName = 'Textarea'

