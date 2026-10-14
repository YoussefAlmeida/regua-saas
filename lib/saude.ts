import { criarClienteServico } from '@/lib/supabase/server'

/* ================================================================
   Saúde do sistema (painel admin)
   Confere se cada atualização do banco rodou e se as variáveis da
   Vercel estão cadastradas. Cada item diz o que fazer se faltar.
   ================================================================ */

export interface ItemSaude {
  nome: string
  ok: boolean
  /** true = sem isso algo quebra; false = só um recurso fica desligado */
  grave: boolean
  oQueFazer?: string
}

const migration = (arquivo: string) => `Rode no Supabase (SQL Editor) o arquivo supabase/migrations/${arquivo}`

export async function verificarSaude(): Promise<{ itens: ItemSaude[]; semFuncao: boolean }> {
  const db = criarClienteServico()
  const itens: ItemSaude[] = []

  const { data, error } = await db.rpc('regua_saude')
  const semFuncao = !!error
  const info = (data ?? {}) as {
    tabelas?: string[]; colunas_usuarios?: string[]; colunas_barbearias?: string[]; indices_usuarios?: string[]
    gatilho_categorias?: boolean; bucket_fotos?: boolean
  }

  // Sem a função, testa direto o que dá pra testar
  const existeTabela = async (t: string) => info.tabelas
    ? info.tabelas.includes(t)
    : !(await db.from(t).select('*', { head: true, count: 'exact' }).limit(1)).error
  const existeColuna = async (c: string) => info.colunas_usuarios
    ? info.colunas_usuarios.includes(c)
    : !(await db.from('usuarios').select(c).limit(1)).error

  itens.push({
    nome: 'Bloqueio de tentativas de login',
    ok: await existeTabela('tentativas_login'), grave: true,
    oQueFazer: migration('20261013000000_tentativas_login.sql'),
  })
  itens.push({
    nome: 'Conta de cliente com senha',
    ok: await existeColuna('senha_definida'), grave: true,
    oQueFazer: migration('20261013010000_senha_definida.sql'),
  })
  itens.push({
    nome: 'Fotos de perfil (Storage)',
    ok: info.bucket_fotos ?? !(await db.storage.getBucket('fotos')).error, grave: false,
    oQueFazer: migration('20261013020000_storage_fotos.sql'),
  })
  if (!semFuncao) {
    itens.push({
      nome: 'Categorias padrão do financeiro',
      ok: !!info.gatilho_categorias, grave: false,
      oQueFazer: migration('20261013030000_categorias_padrao.sql'),
    })
    const idx = info.indices_usuarios ?? []
    itens.push({
      nome: 'Mesmo WhatsApp em várias barbearias',
      ok: idx.includes('usuarios_whatsapp_por_barbearia') && !idx.includes('usuarios_whatsapp_unico'), grave: true,
      oQueFazer: migration('20261013040000_whatsapp_por_barbearia.sql'),
    })
  }
  itens.push({
    nome: 'Registro de erros (pasta da barbearia)',
    ok: await existeTabela('erros_sistema'), grave: false,
    oQueFazer: migration('20261014010000_erros_sistema.sql'),
  })
  itens.push({
    nome: 'Mudança de plano no fim do mês',
    ok: info.colunas_barbearias
      ? info.colunas_barbearias.includes('plano_agendado')
      : !(await db.from('barbearias').select('plano_agendado').limit(1)).error,
    grave: true,
    oQueFazer: migration('20261014020000_plano_ciclo.sql'),
  })
  itens.push({
    nome: 'Histórico do painel admin',
    ok: await existeTabela('admin_log'), grave: false,
    oQueFazer: migration('20261013050000_admin_log.sql'),
  })

  // Variáveis da Vercel
  const env = (k: string) => (process.env[k] ?? '').length > 0
  const semEspaco = (k: string) => env(k) && process.env[k] === process.env[k]!.trim()
  const vercel = 'Cadastre em Vercel → regua-saas → Settings → Environment Variables e faça Redeploy'

  itens.push({ nome: 'PASSWORD_PEPPER', ok: env('PASSWORD_PEPPER'), grave: true, oQueFazer: vercel })
  itens.push({ nome: 'SUPABASE_JWT_SECRET', ok: env('SUPABASE_JWT_SECRET'), grave: true, oQueFazer: vercel })
  itens.push({
    nome: 'CRON_SECRET (tarefas automáticas)', ok: semEspaco('CRON_SECRET'), grave: true,
    oQueFazer: env('CRON_SECRET') ? 'Tem espaço sobrando no começo ou no fim. Edite e cole de novo.' : vercel,
  })
  itens.push({ nome: 'NEXT_PUBLIC_SITE_URL (links do WhatsApp)', ok: env('NEXT_PUBLIC_SITE_URL'), grave: false, oQueFazer: vercel })
  itens.push({ nome: 'ASAAS_WEBHOOK_SECRET (aviso de pagamento)', ok: env('ASAAS_WEBHOOK_SECRET'), grave: false, oQueFazer: vercel })
  itens.push({
    nome: 'WhatsApp automático (Meta)', ok: env('WHATSAPP_TOKEN') && env('WHATSAPP_PHONE_ID'), grave: false,
    oQueFazer: 'Cadastre WHATSAPP_TOKEN e WHATSAPP_PHONE_ID quando a Meta aprovar',
  })

  return { itens, semFuncao }
}
