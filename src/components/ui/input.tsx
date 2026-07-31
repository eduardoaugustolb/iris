import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, ...props }, ref) => {
		return (
			<input
				type={type}
				className={cn(
					"flex h-10 w-full rounded-[14px] border border-white/10 bg-[#141416] px-3 py-2 text-[13px] text-[#F5F5F7] file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E5CE6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0C] disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Input.displayName = "Input";

export { Input };
