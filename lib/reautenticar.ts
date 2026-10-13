import { NextResponse, type NextRequest } from 'next/server'
import type { SessaoUsuario } from '@/lib/auth'
import { verificarSenha } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { ipDa, segundosBloqueado, registrarFalha, limparFalhas, textoEspera } from '@/lib/limite-login'

/* ================================================================
   Senha de novo antes de ação sensível — seção 10.1
   (apagar/editar lançamento, exportar relatório completo, remover
   barbeiro, cancelar assinatura). Erro conta no bloqueio progressivo.
   Devolve null se a senha confere, ou a resposta de erro.
   ================================================================ */
export async function exigirSenha(sessao: SessaoUsuario, senha: unknown, req: NextRequest): Promise<NextResponse | null> {
  if (typeof senha !== 'string' || !senha) {
    return NextResponse.json({ erro: 'Digite sua senha pra confirmar', pedirSenha: true }, { status: 401 })
  }

  const chave = `reauth:${sessao.usuario_id}`
  const ip = ipDa(req)
  const espera = await segundosBloqueado([`id:${chave}`, `ip:${ip}`])
  if (espera > 0) {
    return NextResponse.json({ erro: `Muitas tentativas. Espera ${textoEspera(espera)}.` }, { status: 429 })
  }

  const { data } = await criarClienteServico()
    .from('usuarios')
    .select('senha_hash')
    .eq('id', sessao.usuario_id)
    .single()

  const ok = data ? await verificarSenha(senha, data.senha_hash).catch(() => false) : false
  if (!ok) {
    await registrarFalha(chave, ip)
    return NextResponse.json({ erro: 'Senha incorreta', pedirSenha: true }, { status: 401 })
  }
  await limparFalhas(chave)
  return null
}
