import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formata valor numérico como moeda brasileira */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(valor)
}

/** Formata data pro fuso America/Bahia */
export function formatData(date: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("pt-BR", {
    timeZone: "America/Bahia",
    ...opts,
  })
}

/** WhatsApp no formato guardado no banco: só DDD + número, sem +55 e sem máscara */
export function normalizarWhatsapp(valor: string): string {
  const d = valor.replace(/\D/g, '')
  return d.length >= 12 && d.startsWith('55') ? d.slice(2) : d
}
