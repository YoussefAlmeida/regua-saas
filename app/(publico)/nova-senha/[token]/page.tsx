import type { Metadata } from 'next'
import Link from 'next/link'
import { validarTokenNovaSenha } from '@/lib/recuperacao'
import NovaSenha from './nova-senha'

export const metadata: Metadata = { title: 'Criar senha nova', robots: { index: false } }

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const v = await validarTokenNovaSenha(token)

  if ('erro' in v) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="font-display text-3xl uppercase tracking-wide text-fg">Link inválido</h1>
          <p className="font-body text-sm text-fg-muted">{v.erro}</p>
          <Link href="/recuperar-senha" className="inline-block text-amber font-ui text-xs uppercase tracking-wider hover:underline">Pedir outro link</Link>
        </div>
      </div>
    )
  }

  return <NovaSenha token={token} nome={v.usuario.nome} minimo={v.usuario.papel === 'cliente' ? 4 : 8} />
}
