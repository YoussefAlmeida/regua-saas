import type { Metadata } from 'next'
import RecuperarSenha from './recuperar-senha'

export const metadata: Metadata = { title: 'Esqueci minha senha', robots: { index: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ b?: string; t?: string }> }) {
  const { b, t } = await searchParams
  return <RecuperarSenha slug={b && /^[a-z0-9-]+$/.test(b) ? b : null} tipoInicial={t === 'dono' ? 'email' : b ? 'whatsapp' : 'email'} />
}
