import { Toaster as Sonner } from "sonner";
import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ className, ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="dark"
			className={cn(
				"dark toaster group pointer-events-none [&_[data-sonner-toast]]:pointer-events-auto",
				className,
			)}
			duration={3000}
			toastOptions={{
				classNames: {
					toast: "group toast border border-white/10 bg-[#141416] text-[#F5F5F7] shadow-lg",
					description: "group-[.toast]:text-[var(--text-secondary)]",
					actionButton: "group-[.toast]:bg-[#5E5CE6] group-[.toast]:text-[#FFFFFF]",
					cancelButton: "group-[.toast]:bg-white/10 group-[.toast]:text-[#F5F5F7]",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
