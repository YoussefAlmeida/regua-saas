import { NextRequest, NextResponse } from 'next/server'
import { getSessao } from '@/lib/auth'
import { exigirSenha } from '@/lib/reautenticar'
import { anonimizarCliente } from '@/lib/anonimizar'
import { registrarAuditoria } from '@/lib/auditoria'

/* LGPD — o dono apaga os dados de um cliente que pediu (com senha).
   Fica só o valor dos atendimentos já feitos, sem nome nem telefone. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSessao()
  if (!s || s.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })
  const body = await req.json().catch(() => ({}))
  const negado = await exigirSenha(s, body?.senha, req)
  if (negado) return negado

  const { id } = await params
  const r = await anonimizarCliente(id, s.barbearia_id, 'dono')
  if (!r.ok) return NextResponse.json({ erro: 'Cliente não encontrado' }, { status: 404 })

  await registrarAuditoria({
    barbearia_id: s.barbearia_id, usuario_id: s.usuario_id,
    acao: 'anonimizar', tabela: 'usuarios', registro_id: id,
    depois: { pedido_por: 'dono', agendamentos_cancelados: r.cancelados }, req,
  })
  return NextResponse.json({ ok: true, cancelados: r.cancelados })
}
