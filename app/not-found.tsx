import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center space-y-5">
      <span className="font-display text-4xl text-amber tracking-widest">RÉGUA</span>
      <h1 className="font-ui text-xl uppercase tracking-wider text-fg">Página não encontrada</h1>
      <p className="font-body text-sm text-fg-muted max-w-xs">
        Se você recebeu o link de uma barbearia, confere se ele foi digitado certinho ou pede o link de novo pra ela.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="bg-amber text-accent-fg font-ui text-xs uppercase tracking-wider px-5 py-3 rounded-button">Conhecer o RÉGUA</Link>
        <Link href="/entrar" className="border border-line text-fg font-ui text-xs uppercase tracking-wider px-5 py-3 rounded-button">Entrar</Link>
      </div>
    </div>
  )
}
