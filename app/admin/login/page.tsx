import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLoginPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('regua-admin')?.value
  if (token === process.env.ADMIN_TOKEN) redirect('/admin')

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6">
        <h1 className="font-display text-3xl text-amber tracking-widest text-center">RÉGUA Admin</h1>

        <form
          action={async (fd: FormData) => {
            'use server'
            const senha = fd.get('senha') as string
            if (senha !== process.env.ADMIN_TOKEN) redirect('/admin/login')
            const { cookies: c } = await import('next/headers')
            ;(await c()).set('regua-admin', senha, {
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
              maxAge: 60 * 60 * 8,
              path: '/',
            })
            const { redirect: r } = await import('next/navigation')
            r('/admin')
          }}
          className="bg-surface border border-line rounded-card p-6 space-y-4"
        >
          <div className="space-y-1">
            <label className="font-ui text-xs uppercase tracking-wider text-fg-muted">Senha</label>
            <input
              name="senha"
              type="password"
              autoFocus
              required
              className="w-full bg-bg border border-line rounded-button px-3 py-2 font-body text-sm text-fg focus:outline-none focus:border-amber/60"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-amber text-bg font-ui text-sm uppercase tracking-wider rounded-button py-2 hover:opacity-90 transition-opacity"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
