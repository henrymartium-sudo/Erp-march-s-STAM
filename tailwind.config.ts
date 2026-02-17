import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      },
      colors: {
        /* ---- Variables shadcn/ui standard ---- */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        /* ---- Palette STAM — identité de marque ---- */
        stam: {
          primary:       "hsl(var(--stam-primary))",        /* Bleu institutionnel #1E3A5F */
          "primary-dark":"hsl(var(--stam-primary-dark))",   /* Hover sidebar */
          "primary-light":"hsl(var(--stam-primary-light))", /* Variante claire */
          gold:          "hsl(var(--stam-gold))",           /* Or/Ambre #C49A1A */
          "gold-light":  "hsl(var(--stam-gold-light))",
          "gold-subtle": "hsl(var(--stam-gold-subtle))",
          accent:        "hsl(var(--stam-accent))",         /* Bleu électrique #2563EB */
          "accent-light":"hsl(var(--stam-accent-light))",
          success:       "hsl(var(--stam-success))",        /* Vert forêt #16A34A */
          "success-bg":  "hsl(var(--stam-success-bg))",
          warning:       "hsl(var(--stam-warning))",        /* Ambre #D97706 */
          "warning-bg":  "hsl(var(--stam-warning-bg))",
          danger:        "hsl(var(--stam-danger))",         /* Rouge sobre #DC2626 */
          "danger-bg":   "hsl(var(--stam-danger-bg))",
        },

        /* ---- Tokens sidebar dark ---- */
        sidebar: {
          bg:     "hsl(var(--sidebar-bg))",
          fg:     "hsl(var(--sidebar-fg))",
          muted:  "hsl(var(--sidebar-muted))",
          active: "hsl(var(--sidebar-active-bg))",
          hover:  "hsl(var(--sidebar-hover-bg))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          logo:   "hsl(var(--sidebar-logo-bg))",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* ---- Animations ---- */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-badge": {
          "0%, 100%": { opacity: "1",   transform: "scale(1)" },
          "50%":       { opacity: "0.7", transform: "scale(1.05)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to:   { transform: "translateX(0)",     opacity: "1" },
        },
      },

      animation: {
        "accordion-down":    "accordion-down 0.2s ease-out",
        "accordion-up":      "accordion-up 0.2s ease-out",
        shimmer:             "shimmer 1.5s infinite",
        "pulse-badge":       "pulse-badge 1.5s ease-in-out infinite",
        "fade-in":           "fade-in 150ms ease-out",
        "slide-in-right":    "slide-in-right 200ms ease-out",
        "slide-in-left":     "slide-in-left 200ms ease-out",
      },

      /* ---- Ombres personnalisées ---- */
      boxShadow: {
        "card":       "0 1px 3px rgba(30, 58, 95, 0.06), 0 1px 2px rgba(30, 58, 95, 0.04)",
        "card-hover": "0 4px 16px rgba(30, 58, 95, 0.12), 0 2px 6px rgba(30, 58, 95, 0.06)",
        "sidebar":    "2px 0 8px rgba(14, 30, 54, 0.25)",
        "topbar":     "0 1px 4px rgba(30, 58, 95, 0.08)",
      },

      /* ---- Taille de police de base 14px ---- */
      fontSize: {
        xs:   ["0.6875rem", { lineHeight: "1rem" }],    /* 11px */
        sm:   ["0.8125rem", { lineHeight: "1.25rem" }], /* 13px */
        base: ["0.875rem",  { lineHeight: "1.5rem" }],  /* 14px */
        lg:   ["1rem",      { lineHeight: "1.75rem" }], /* 16px */
        xl:   ["1.125rem",  { lineHeight: "1.75rem" }], /* 18px */
        "2xl":["1.25rem",   { lineHeight: "2rem" }],    /* 20px */
        "3xl":["1.5rem",    { lineHeight: "2rem" }],    /* 24px */
      },

      /* ---- Width sidebar fixe ---- */
      width: {
        sidebar: "240px",
      },

      /* ---- Spacing pour la sidebar ---- */
      spacing: {
        sidebar: "240px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
