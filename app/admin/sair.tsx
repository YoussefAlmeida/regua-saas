'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SairAdmin() {
  const router = useRouter()
  return (
    <button
      onClick={async () => { await fetch('/api/admin/logout', { method: 'POST' }); router.replace('/admin/login') }}
      className="flex items-center gap-1.5 font-ui text-xs uppercase tracking-wider text-fg-muted hover:text-fg"
    >
      <LogOut size={14} /> Sair
    </button>
  )
}
