import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fimDoCicloAposPagamento, planoPeloValor } from '../lib/planos.ts'

const DIA = 86_400_000
const agora = new Date('2026-10-15T12:00:00Z')
const dias = (n: number) => new Date(agora.getTime() + n * DIA).toISOString()

test('plano sai do valor pago, não da descrição', () => {
  assert.equal(planoPeloValor(39.99), 'cadeira')
  assert.equal(planoPeloValor(79.99), 'barbearia')
  assert.equal(planoPeloValor('129.99'), 'rede')
  assert.equal(planoPeloValor(80), null)
  assert.equal(planoPeloValor(undefined), null)
})

test('renovação em dia soma 1 mês ao vencimento', () => {
  const fim = fimDoCicloAposPagamento({ plano: 'cadeira', status: 'ativo', plano_ciclo_fim: '2026-10-20T12:00:00Z' }, 'cadeira', agora)
  assert.equal(fim.toISOString(), '2026-11-20T12:00:00.000Z')
})

test('pagar na carência não ganha dias de graça', () => {
  // Venceu há 4 dias: o mês novo conta do vencimento, não de hoje
  const fim = fimDoCicloAposPagamento({ plano: 'cadeira', status: 'ativo', plano_ciclo_fim: dias(-4) }, 'cadeira', agora)
  assert.equal(fim.toISOString(), '2026-11-11T12:00:00.000Z')
})

test('atraso maior que a carência começa o mês hoje', () => {
  const fim = fimDoCicloAposPagamento({ plano: 'cadeira', status: 'ativo', plano_ciclo_fim: dias(-10) }, 'cadeira', agora)
  assert.equal(fim.toISOString(), '2026-11-15T12:00:00.000Z')
})

test('trocar de plano começa o mês hoje', () => {
  const fim = fimDoCicloAposPagamento({ plano: 'cadeira', status: 'ativo', plano_ciclo_fim: dias(10) }, 'barbearia', agora)
  assert.equal(fim.toISOString(), '2026-11-15T12:00:00.000Z')
})

test('primeiro pagamento depois do teste começa hoje', () => {
  const fim = fimDoCicloAposPagamento({ plano: 'trial', status: 'trial', plano_ciclo_fim: null }, 'rede', agora)
  assert.equal(fim.toISOString(), '2026-11-15T12:00:00.000Z')
})
