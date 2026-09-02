import type { Metadata, Viewport } from "next"
import { Anton, Oswald, Open_Sans, Space_Mono } from "next/font/google"
import "./globals.css"

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
  description: "Sistema de agendamento e fluxo de caixa para barbearias do interior da Bahia. Sem app pra baixar. Sem planilha.",
  robots: { index: false, follow: false }, // ativar quando for a landing pública
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
