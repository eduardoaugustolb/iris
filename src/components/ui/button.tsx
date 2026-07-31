import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-[13px] font-[590] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E5CE6] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-[#5E5CE6] text-[#F5F5F7] hover:bg-[#8886F0]",
				destructive: "bg-[#FF453A] text-[#FFFFFF] hover:bg-[#FF453A]/90",
				outline: "border border-white/10 bg-white/[0.06] text-[#F5F5F7] hover:bg-white/10",
				secondary: "bg-white/10 text-[#F5F5F7] hover:bg-white/15",
				ghost: "text-[#F5F5F7] hover:bg-white/10",
				link: "text-[#5E5CE6] underline-offset-4 hover:underline",
			},
			size: {
				default: "h-8 px-4 py-2",
				sm: "h-7 px-3 text-xs",
				lg: "h-10 px-8",
				icon: "h-8 w-8",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
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
