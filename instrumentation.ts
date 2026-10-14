/* Next.js chama onRequestError quando uma página ou API quebra sem
   tratamento. Guardamos em erros_sistema pra aparecer no admin.
   (Imports dentro do if: só entram no build do servidor Node.) */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routePath?: string; routeType?: string },
) {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { criarClienteServico } = await import('@/lib/supabase/server')
      const db = criarClienteServico()
      const caminho = request.path.split('?')[0]

      // Tenta achar a barbearia pelo link público (/<slug>/...)
      let barbearia_id: string | null = null
      const slug = caminho.split('/')[1]
      if (slug && /^[a-z0-9-]+$/.test(slug) && !['painel', 'api', 'admin', 'entrar', '_next'].includes(slug)) {
        const { data } = await db.from('barbearias').select('id').eq('slug', slug).maybeSingle()
        barbearia_id = data?.id ?? null
      }

      const e = (err ?? {}) as { message?: string; code?: string; digest?: string }
      console.error('[erro] falha inesperada:', caminho, e.message)
      await db.from('erros_sistema').insert({
        barbearia_id,
        onde: `falha inesperada: ${context.routePath ?? caminho}`,
        codigo: e.code ?? null,
        mensagem: (err instanceof Error ? err.message : e.message ?? String(err)).slice(0, 500),
        detalhe: { caminho, metodo: request.method, tipo: context.routeType ?? null, digest: e.digest ?? null },
      })
    } catch (falha) {
      console.error('[erro] não deu pra registrar:', falha)
    }
  }
}
