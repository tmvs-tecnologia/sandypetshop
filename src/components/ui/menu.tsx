import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

const menuRootStyles = "flex flex-col gap-3";

const menuItemStyles = cva(
  "w-full flex items-center gap-4 px-5 py-3 rounded-xl text-base font-semibold transition-all shadow-sm",
  {
    variants: {
      active: {
        true: "bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-lg scale-[1.02]",
        false:
          "text-gray-700 hover:bg-white hover:shadow-md bg-white/60 hover:scale-[1.01]",
      },
      tone: {
        default: "",
        subtle: "px-4 py-2 text-sm",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  }
);

export type MenuProps = {
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
};

export const Menu: React.FC<MenuProps> = ({ className, children, ariaLabel }) => {
  return (
    <nav className={twMerge(menuRootStyles, className)} aria-label={ariaLabel}>
      {children}
    </nav>
  );
};

type MenuItemProps = {
  active?: boolean;
  icon?: React.ReactNode;
  label: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
} & VariantProps<typeof menuItemStyles>;

export const MenuItem: React.FC<MenuItemProps> = ({
  active = false,
  icon,
  label,
  onClick,
  className,
  ariaLabel,
  tone,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={twMerge(menuItemStyles({ active, tone }), className)}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
};

export default Menu;