import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lerValorBRL } from '../lib/dinheiro.ts'

test('lê valores do jeito brasileiro', () => {
  assert.equal(lerValorBRL('35'), 35)
  assert.equal(lerValorBRL('35,5'), 35.5)
  assert.equal(lerValorBRL('35,50'), 35.5)
  assert.equal(lerValorBRL('1.500'), 1500)
  assert.equal(lerValorBRL('1.234,56'), 1234.56)
  assert.equal(lerValorBRL('R$ 1.500,00'), 1500)
  assert.equal(lerValorBRL('12.000'), 12000)
  assert.equal(lerValorBRL('1500'), 1500)
})

test('aceita ponto como decimal quando não é milhar', () => {
  assert.equal(lerValorBRL('35.5'), 35.5)
  assert.equal(lerValorBRL('35.50'), 35.5)
})

test('recusa o que não é valor', () => {
  for (const v of ['', 'abc', '1,2,3', '1.23.4', '1.5000', '12,345', '-5', '1.500,5,0']) {
    assert.ok(Number.isNaN(lerValorBRL(v)), v)
  }
})
