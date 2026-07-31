import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";
import styles from "./switch.module.css";

const Switch = React.forwardRef<
	React.ElementRef<typeof SwitchPrimitives.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitives.Root
		className={cn(
			"peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-[28px] border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E5CE6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0C] disabled:cursor-not-allowed disabled:opacity-50",
			styles.track,
			"data-[state=checked]:bg-[#5E5CE6] data-[state=unchecked]:bg-white/[0.12]",
			className,
		)}
		{...props}
		ref={ref}
	>
		<SwitchPrimitives.Thumb
			className={cn(
				"pointer-events-none block h-4 w-4 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] ring-0 transition-transform",
				styles.thumb,
				"bg-white",
				"data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
			)}
		/>
	</SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
