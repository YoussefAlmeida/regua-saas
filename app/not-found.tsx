import Link from 'next/link'
import { Marca } from '@/components/marca'

export default function NaoEncontrado() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center space-y-5">
      <Marca className="text-fg scale-125" />
      <h1 className="font-display text-[28px] font-semibold leading-tight text-fg">Página não encontrada</h1>
      <p className="font-body text-sm text-fg-muted max-w-xs">
        Se você recebeu o link de uma barbearia, confere se ele foi digitado certinho ou pede o link de novo pra ela.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="font-semibold bg-amber text-accent-fg font-ui text-sm px-5 py-3 rounded-button">Conhecer o RÉGUA</Link>
        <Link href="/entrar" className="font-semibold border border-line text-fg font-ui text-sm px-5 py-3 rounded-button">Entrar</Link>
      </div>
    </div>
  )
}
