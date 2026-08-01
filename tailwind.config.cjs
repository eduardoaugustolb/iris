/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			// Named keys here (not transitionDuration/transitionTimingFunction — those get
			// spread into these by tailwindcss-animate itself, which would just reintroduce
			// the ambiguity) resolve unambiguously to the animate-plugin's own duration/ease
			// matchers, since core Tailwind's transitionDuration/transitionTimingFunction
			// scales don't define these names. Bracket syntax (duration-[280ms]) collides
			// with the plugin's matcher and silently drops from the compiled CSS.
			animationDuration: {
				standard: "280ms",
			},
			animationTimingFunction: {
				standard: "cubic-bezier(0.32, 0.72, 0, 1)",
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				"record-pulse": {
					"0%, 100%": { boxShadow: "0 0 8px rgba(255, 69, 58, 0.15)" },
					"50%": { boxShadow: "0 0 16px rgba(255, 69, 58, 0.4)" },
				},
				"mic-panel-in": {
					from: { opacity: "0", transform: "translateY(4px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"record-pulse": "record-pulse 1.5s ease-in-out infinite",
				"mic-panel-in": "mic-panel-in 0.15s ease-out",
			},
			boxShadow: {
				"hud-bar": "0 2px 16px rgba(0, 0, 0, 0.25), 0 0 40px rgba(100, 80, 200, 0.08)",
				"mic-panel": "0 2px 12px rgba(0, 0, 0, 0.2), 0 0 30px rgba(100, 80, 200, 0.06)",
			},
			borderRadius: {
				lg: "var(--radius-lg)",
				md: "var(--radius-md)",
				sm: "var(--radius-sm)",
			},
			colors: {
				surface: {
					base: "var(--surface-base)",
					raised: "var(--surface-raised)",
				},
				brand: {
					primary: "var(--brand-primary)",
					"primary-hover": "var(--brand-primary-hover)",
				},
				text: {
					primary: "var(--text-primary)",
					secondary: "var(--text-secondary)",
					tertiary: "var(--text-tertiary)",
				},
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};
