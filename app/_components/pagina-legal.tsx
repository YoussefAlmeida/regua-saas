import Link from 'next/link'
import { Marca } from '@/components/marca'
import { EMPRESA } from '@/lib/empresa'

/* Moldura das páginas legais (Termos e Privacidade) */
export default function PaginaLegal({ titulo, atualizado, children }: { titulo: string; atualizado: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" aria-label="RÉGUA, início"><Marca className="text-fg" /></Link>
          <nav className="flex gap-4 font-ui text-xs uppercase tracking-wider text-fg-muted">
            <Link href="/termos" className="hover:text-fg">Termos</Link>
            <Link href="/privacidade" className="hover:text-fg">Privacidade</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="font-display text-3xl text-fg mb-1">{titulo}</h1>
        <p className="font-body text-xs text-fg-muted mb-8">Atualizado em {atualizado}</p>
        <div className="space-y-6 font-body text-sm text-fg-muted leading-relaxed [&_h2]:font-ui [&_h2]:text-sm [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-fg [&_h2]:mb-2 [&_strong]:text-fg [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
          {children}
        </div>
        <p className="mt-12 font-body text-xs text-fg-muted">
          {EMPRESA.razaoSocial ?? EMPRESA.marca}{EMPRESA.documento ? ` · ${EMPRESA.documento}` : ''} · {EMPRESA.cidade}
        </p>
      </main>
    </div>
  )
}
