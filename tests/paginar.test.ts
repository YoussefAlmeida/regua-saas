import { test } from 'node:test'
import assert from 'node:assert/strict'
import { todasAsLinhas } from '../lib/paginar.ts'

// Simula o Supabase: devolve no máximo 1000 por vez
const banco = (n: number, falhaNaPagina?: number) => {
  const linhas = Array.from({ length: n }, (_, i) => ({ id: i, valor: 10 }))
  let chamadas = 0
  const pagina = async (de: number, ate: number) => {
    chamadas++
    if (falhaNaPagina !== undefined && de / 1000 === falhaNaPagina) return { data: null, error: { message: 'caiu' } }
    return { data: linhas.slice(de, Math.min(ate + 1, de + 1000)), error: null }
  }
  return { pagina, chamadas: () => chamadas }
}

test('traz tudo acima de 1000 linhas (antes cortava calado)', async () => {
  const b = banco(3500)
  const { data, error } = await todasAsLinhas(b.pagina)
  assert.equal(error, null)
  assert.equal(data.length, 3500)
  assert.equal(data.reduce((s, l) => s + l.valor, 0), 35000)
  assert.equal(b.chamadas(), 4)
})

test('poucas linhas: uma consulta só', async () => {
  const b = banco(12)
  const { data } = await todasAsLinhas(b.pagina)
  assert.equal(data.length, 12)
  assert.equal(b.chamadas(), 1)
})

test('exatamente 1000: confere a página seguinte vazia', async () => {
  const b = banco(1000)
  const { data } = await todasAsLinhas(b.pagina)
  assert.equal(data.length, 1000)
  assert.equal(b.chamadas(), 2)
})

test('erro no meio devolve o erro (não um total errado em silêncio)', async () => {
  const { error } = await todasAsLinhas(banco(2500, 1).pagina)
  assert.ok(error)
})
