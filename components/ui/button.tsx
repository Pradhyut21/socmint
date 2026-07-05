import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold cursor-pointer select-none",
    "transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "hover:-translate-y-px active:translate-y-0 active:scale-[0.98] will-change-transform",
  ].join(" "),
  {
    variants: {
      variant: {
        // Teal signature — soft colored shadow
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:brightness-[1.04]",
        // Coral brand pop
        brand:
          "gradient-warm text-white shadow-lg shadow-stamp/25 hover:shadow-xl hover:shadow-stamp/40 hover:brightness-[1.03]",
        // Teal→azure gradient for hero CTAs
        gradient:
          "gradient-brand text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-evidence/40 hover:brightness-[1.03]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/35 hover:brightness-[1.04]",
        outline:
          "border-2 border-primary/25 bg-card text-foreground shadow-sm hover:border-primary/50 hover:bg-primary/[0.06] hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground border border-border shadow-sm hover:bg-muted hover:border-primary/20",
        ghost: "text-foreground hover:bg-primary/[0.07] hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default: "h-9.5 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-[15px]",
        icon: "h-9.5 w-9.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
