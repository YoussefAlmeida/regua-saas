import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSessao } from '@/lib/auth'
import { criarClienteServico } from '@/lib/supabase/server'
import { exigirSenha } from '@/lib/reautenticar'
import { registrarAuditoria } from '@/lib/auditoria'
import { limitesDoMes } from '@/lib/periodo'
import { falhaInterna } from '@/lib/erros'

/* Exporta o extrato em CSV (abre direto no Excel/Planilhas em português:
   separador ";" e vírgula decimal). Relatório completo pede a senha. */

const Schema = z.object({
  senha: z.string().min(1),
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  profissional_id: z.string().uuid().optional(),
})

const um = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)

function celula(v: string | number | null | undefined): string {
  let s = v === null || v === undefined ? '' : String(v)
  // Evita fórmula maliciosa quando abrir no Excel (CSV injection)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function POST(req: NextRequest) {
  const sessao = await getSessao()
  if (!sessao || sessao.papel !== 'dono') return NextResponse.json({ erro: 'Sem permissão' }, { status: 403 })

  const parse = Schema.safeParse(await req.json().catch(() => null))
  if (!parse.success) return NextResponse.json({ erro: 'Dados inválidos', pedirSenha: true }, { status: 400 })

  const negado = await exigirSenha(sessao, parse.data.senha, req)
  if (negado) return negado

  const { de, ate } = limitesDoMes(parse.data.mes)
  let q = criarClienteServico()
    .from('movimentacoes')
    .select('data, tipo, descricao, valor, origem, agendamento_id, recorrente_id, categoria:categorias_fin(nome), profissional:profissionais(nome)')
    .eq('barbearia_id', sessao.barbearia_id)
    .gte('data', de)
    .lt('data', ate)
    .order('data')
    .order('criado_em')
  if (parse.data.profissional_id) q = q.eq('profissional_id', parse.data.profissional_id)

  const { data, error } = await q
  if (error) return falhaInterna('painel/exportar', error, 'Erro ao gerar o arquivo')

  const linhas = [['Data', 'Tipo', 'Descrição', 'Categoria', 'Barbeiro', 'Origem', 'Valor (R$)'].join(';')]
  let entradas = 0, saidas = 0
  for (const m of data ?? []) {
    const valor = Number(m.valor)
    if (m.tipo === 'entrada') entradas += valor; else saidas += valor
    const origem = m.agendamento_id ? 'Agendamento' : m.recorrente_id ? 'Despesa fixa' : 'Manual'
    linhas.push([
      m.data.split('-').reverse().join('/'),
      m.tipo === 'entrada' ? 'Entrada' : 'Saída',
      celula(m.descricao),
      celula((um(m.categoria as never) as { nome?: string } | null)?.nome ?? ''),
      celula((um(m.profissional as never) as { nome?: string } | null)?.nome ?? ''),
      origem,
      (m.tipo === 'saida' ? -valor : valor).toFixed(2).replace('.', ','),
    ].join(';'))
  }
  linhas.push('')
  linhas.push(`;;;;;Entradas;${entradas.toFixed(2).replace('.', ',')}`)
  linhas.push(`;;;;;Saídas;${(-saidas).toFixed(2).replace('.', ',')}`)
  linhas.push(`;;;;;Saldo;${(entradas - saidas).toFixed(2).replace('.', ',')}`)

  await registrarAuditoria({
    barbearia_id: sessao.barbearia_id,
    usuario_id: sessao.usuario_id,
    acao: 'exportar',
    tabela: 'movimentacoes',
    depois: { mes: parse.data.mes, linhas: data?.length ?? 0 },
    req,
  })

  return new NextResponse('﻿' + linhas.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="regua-extrato-${parse.data.mes}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
