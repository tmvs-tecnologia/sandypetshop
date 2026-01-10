import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/src/lib/utils'
import { Loader2 } from 'lucide-react'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default: 'bg-pink-600 text-white hover:bg-pink-700',
        secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        outline: 'border border-gray-300 bg-white text-gray-800 hover:bg-pink-50',
        ghost: 'bg-transparent text-pink-700 hover:bg-pink-50',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-5 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), 'transition-all duration-200', className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon ? <span className="mr-2" aria-hidden="true">{leftIcon}</span> : null
        )}
        <span>{children}</span>
        {rightIcon ? <span className="ml-2" aria-hidden="true">{rightIcon}</span> : null}
      </button>
    )
  }
)

Button.displayName = 'Button'