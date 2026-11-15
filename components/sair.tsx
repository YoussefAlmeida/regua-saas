'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

/* Sair da conta (equipe): volta pra tela de entrada */
export default function Sair() {
  const router = useRouter()
  async function sair() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null)
    router.replace('/entrar')
    router.refresh()
  }
  return (
    <button type="button" onClick={sair} className="ds-btn-ghost w-full !justify-start !text-saida md:hidden">
      <LogOut size={16} aria-hidden /> Sair da conta
    </button>
  )
}
