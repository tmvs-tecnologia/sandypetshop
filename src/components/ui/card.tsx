import * as React from 'react'
import { cn } from '@/src/lib/utils'

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)} {...props}>
    {children}
  </div>
)

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('p-4 border-b border-gray-200', className)} {...props}>
    {children}
  </div>
)

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, children, ...props }) => (
  <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props}>
    {children}
  </h3>
)

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('p-4', className)} {...props}>
    {children}
  </div>
)