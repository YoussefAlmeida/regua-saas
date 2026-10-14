import type { Metadata, Viewport } from "next"
import { Anton, Oswald, Open_Sans, Space_Mono } from "next/font/google"
import "./globals.css"
import { urlDoSiteFixa } from "@/lib/site-url"

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
})

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
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
  themeColor: "#0B0B0C",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`
        ${anton.variable}
        ${oswald.variable}
        ${openSans.variable}
        ${spaceMono.variable}
      `}
    >
      <body className="bg-bg text-fg font-body antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
