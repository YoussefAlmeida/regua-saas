import type { Metadata, Viewport } from "next"
import { Montserrat } from "next/font/google"
import "./globals.css"
import { urlDoSiteFixa } from "@/lib/site-url"

// Identidade CUBO: Montserrat em tudo (títulos 700, interface 600, texto 400/500)
const titulos = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display", display: "swap" })
const corpo = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body", display: "swap" })

export const metadata: Metadata = {
  title: {
    template: "%s — CUBO",
    default: "CUBO — Gestão para barbearias",
  },
  description: "Agenda online, agenda da equipe e caixa da barbearia no celular. Seu cliente marca pelo link, sem baixar app. 14 dias grátis.",
  metadataBase: new URL(urlDoSiteFixa()),
  applicationName: "CUBO",
  openGraph: { type: "website", locale: "pt_BR", siteName: "CUBO" },
  twitter: { card: "summary_large_image" },
  // Landing e páginas de agendamento podem aparecer no Google; painel e admin ficam fora
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0D10",
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
