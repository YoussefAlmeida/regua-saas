import type { Metadata, Viewport } from "next"
import { Space_Grotesk, Inter } from "next/font/google"
import "./globals.css"
import { urlDoSiteFixa } from "@/lib/site-url"

// Títulos e números: geométrica com caráter técnico
const titulos = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" })

// Interface e texto
const corpo = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" })

export const metadata: Metadata = {
  title: {
    template: "%s — RÉGUA",
    default: "RÉGUA — Sua barbearia na régua.",
  },
  description: "Agenda online, agenda da equipe e caixa da barbearia no celular. Seu cliente marca pelo link, sem baixar app. 14 dias grátis.",
  metadataBase: new URL(urlDoSiteFixa()),
  applicationName: "RÉGUA",
  openGraph: { type: "website", locale: "pt_BR", siteName: "RÉGUA" },
  twitter: { card: "summary_large_image" },
  // Landing e páginas de agendamento podem aparecer no Google; painel e admin ficam fora
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101010",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${titulos.variable} ${corpo.variable}`}
    >
      <body className="bg-bg text-fg font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
