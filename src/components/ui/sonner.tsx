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
					toast:
						"group toast border border-white/10 bg-surface-raised text-[var(--text-primary)] shadow-lg",
					description: "group-[.toast]:text-[var(--text-secondary)]",
					actionButton: "group-[.toast]:bg-brand-primary group-[.toast]:text-white",
					cancelButton: "group-[.toast]:bg-white/[0.06] group-[.toast]:text-[var(--text-primary)]",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
