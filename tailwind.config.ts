import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      // ── shadcn/ui — HSL-based system ──────────────────────────
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          press: "rgb(var(--accent-press-rgb) / <alpha-value>)",
          fg: "rgb(var(--accent-fg-rgb) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ── RÉGUA design tokens ────────────────────────────────
        // Canais RGB em app/globals.css → funciona transparência (bg-entrada/10)
        // Fundos
        bg: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          alt: "rgb(var(--surface-2-rgb) / <alpha-value>)",
        },
        // Bordas
        line: "rgb(var(--line-rgb) / <alpha-value>)",
        // Texto
        fg: {
          DEFAULT: "rgb(var(--fg-rgb) / <alpha-value>)",
          muted: "rgb(var(--fg-muted-rgb) / <alpha-value>)",
        },
        // Acento
        amber: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          press: "rgb(var(--accent-press-rgb) / <alpha-value>)",
          fg: "rgb(var(--accent-fg-rgb) / <alpha-value>)",
        },
        // Semântica financeira — NUNCA usar pra success/error
        entrada: "rgb(var(--entrada-rgb) / <alpha-value>)",
        saida: "rgb(var(--saida-rgb) / <alpha-value>)",
        info: "rgb(var(--info-rgb) / <alpha-value>)",
      },

      // ── Tipografia ────────────────────────────────────────────
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        // Interface, texto e valores na mesma sans (valores com algarismos tabulares)
        ui: ["var(--font-body)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-body)", "system-ui", "sans-serif"],
      },

      // ── Escala tipográfica (12/14/16/20/28/40/64) ─────────────
      fontSize: {
        "2xs": ["12px", { lineHeight: "16px" }],
        xs:   ["12px", { lineHeight: "16px" }],
        sm:   ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg:   ["20px", { lineHeight: "28px" }],
        xl:   ["28px", { lineHeight: "36px" }],
        "2xl": ["40px", { lineHeight: "48px" }],
        "3xl": ["64px", { lineHeight: "72px" }],
      },

      // ── Geometria ─────────────────────────────────────────────
      borderRadius: {
        none: "0",
        sm:   "8px",   // botões
        DEFAULT: "8px",
        md:   "8px",
        lg:   "12px",  // cards
        button: "8px",   // rounded-button (usado no app todo)
        card:   "12px",  // rounded-card
        xl:   "16px",
        full: "9999px",
      },

      // ── Animações (shadcn/ui) ─────────────────────────────────
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
