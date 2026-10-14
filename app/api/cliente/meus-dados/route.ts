import { NextRequest, NextResponse } from 'next/server'
import { getSessao, COOKIE_SESSION } from '@/lib/auth'
import { exigirSenha } from '@/lib/reautenticar'
import { anonimizarCliente, dadosDoCliente } from '@/lib/anonimizar'
import { registrarAuditoria } from '@/lib/auditoria'

/* LGPD — o cliente baixa (GET) ou apaga (DELETE, com senha) os próprios dados */

export async function GET() {
  const s = await getSessao()
  if (!s || s.papel !== 'cliente') return NextResponse.json({ erro: 'Entre na sua conta' }, { status: 401 })
  const dados = await dadosDoCliente(s.usuario_id, s.barbearia_id)
  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="meus-dados-regua.json"',
      'Cache-Control': 'no-store',
    },
  })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessao()
  if (!s || s.papel !== 'cliente') return NextResponse.json({ erro: 'Entre na sua conta' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const negado = await exigirSenha(s, body?.senha, req)
  if (negado) return negado

  // Registra antes: depois a conta deixa de existir como pessoa
  await registrarAuditoria({
    barbearia_id: s.barbearia_id, usuario_id: s.usuario_id,
    acao: 'anonimizar', tabela: 'usuarios', registro_id: s.usuario_id,
    depois: { pedido_por: 'cliente' }, req,
  })
  const r = await anonimizarCliente(s.usuario_id, s.barbearia_id, 'cliente')
  if (!r.ok) return NextResponse.json({ erro: 'Conta não encontrada' }, { status: 404 })

  const res = NextResponse.json({ ok: true, cancelados: r.cancelados })
  res.cookies.delete(COOKIE_SESSION)
  return res
}
