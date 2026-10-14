import type { Metadata, Viewport } from "next"
import { Fraunces, Instrument_Sans } from "next/font/google"
import "./globals.css"
import { urlDoSiteFixa } from "@/lib/site-url"

// Títulos: serifa com personagem (ofício, tradição) — sem caixa alta
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--font-display",
  display: "swap",
})

// Interface e texto: sans limpa e humana; valores usam algarismos tabulares
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    template: "%s — RÉGUA",
    default: "RÉGUA — Sua barbearia na régua.",
  },
  description: "Agenda online, lembrete no WhatsApp e caixa da barbearia no celular. Seu cliente marca pelo link, sem baixar app. 14 dias grátis.",
  metadataBase: new URL(urlDoSiteFixa()),
  applicationName: "RÉGUA",
  openGraph: { type: "website", locale: "pt_BR", siteName: "RÉGUA" },
  twitter: { card: "summary_large_image" },
  // Landing e páginas de agendamento podem aparecer no Google; painel e admin ficam fora
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F3EE",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${instrument.variable}`}
    >
      <body className="bg-bg text-fg font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
