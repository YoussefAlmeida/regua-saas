import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resumoCliente, estaSumido, mensagemDeVolta } from '../lib/radar-clientes.ts'

const agora = new Date('2026-11-19T15:00:00Z')
const diasAtras = (n: number) => new Date(agora.getTime() - n * 86_400_000).toISOString()
const diasFrente = (n: number) => new Date(agora.getTime() + n * 86_400_000).toISOString()

test('conta cortes, faltas e dias desde o último corte', () => {
  const r = resumoCliente([
    { inicio: diasAtras(90), status: 'concluido' },
    { inicio: diasAtras(40), status: 'concluido' },
    { inicio: diasAtras(20), status: 'faltou' },
    { inicio: diasAtras(10), status: 'cancelado' },
  ], agora)
  assert.equal(r.cortes, 2)
  assert.equal(r.faltas, 1)
  assert.equal(r.diasSemVir, 40)
  assert.equal(r.temMarcado, false)
})

test('sumido: cortou, passou da janela e não tem horário marcado', () => {
  const sumido = resumoCliente([{ inicio: diasAtras(35), status: 'concluido' }], agora)
  assert.equal(estaSumido(sumido, 30), true)
  assert.equal(estaSumido(sumido, 45), false)
})

test('quem já marcou de novo não aparece no radar', () => {
  const r = resumoCliente([
    { inicio: diasAtras(50), status: 'concluido' },
    { inicio: diasFrente(2), status: 'agendado' },
  ], agora)
  assert.equal(estaSumido(r, 30), false)
})

test('quem nunca cortou (só faltou ou cancelou) não é sumido', () => {
  const r = resumoCliente([{ inicio: diasAtras(60), status: 'faltou' }], agora)
  assert.equal(r.diasSemVir, null)
  assert.equal(estaSumido(r, 30), false)
})

test('mensagem usa o primeiro nome e o link da barbearia', () => {
  const m = mensagemDeVolta('João Pedro Silva', 42, 'Concept Barber', 'https://regua.app/concept')
  assert.match(m, /^Fala, João!/)
  assert.match(m, /42 dias/)
  assert.match(m, /Concept Barber/)
  assert.match(m, /https:\/\/regua\.app\/concept$/)
})
