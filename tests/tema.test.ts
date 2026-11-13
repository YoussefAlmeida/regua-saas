import { test } from 'node:test'
import assert from 'node:assert/strict'
import { temaDaBarbearia, contraste, legivelNoFundo, textoSobre, FUNDO, PRIMARIA_PADRAO, SECUNDARIA_PADRAO } from '../lib/tema.ts'

test('sem cores escolhidas: paleta oficial, sem ajuste', () => {
  const t = temaDaBarbearia(null)
  assert.equal(t.primaria, PRIMARIA_PADRAO)
  assert.equal(t.secundaria, SECUNDARIA_PADRAO)
  assert.equal(t.ajustada, false)
  assert.equal(t.vars['--accent-rgb'], '197 164 109')
})

test('cor escura demais é clareada até ficar legível no fundo', () => {
  for (const cor of ['#000000', '#17191D', '#1A237E', '#4A0000', '#0B3D2E']) {
    const t = temaDaBarbearia({ cor_primaria: cor, cor_secundaria: cor })
    assert.ok(contraste(t.primaria, FUNDO) >= 4.5, `${cor} → ${t.primaria}`)
    assert.ok(contraste(t.secundaria, FUNDO) >= 3, `${cor} → ${t.secundaria}`)
    assert.equal(t.ajustada, true)
  }
})

test('cor que já é legível não muda', () => {
  assert.equal(legivelNoFundo('#FF5722', 4.5), '#FF5722')
  assert.equal(temaDaBarbearia({ cor_primaria: '#ff5722' }).ajustada, false)
})

test('texto sobre a cor é sempre o de maior contraste', () => {
  assert.equal(textoSobre('#FFFFFF'), FUNDO)
  assert.equal(textoSobre('#C5A46D'), FUNDO)
  assert.equal(textoSobre('#1A237E'), '#F2EFE9')
  for (const cor of ['#C5A46D', '#477A60', '#FF5722', '#2196F3', '#9C27B0', '#FFEB3B']) {
    const t = temaDaBarbearia({ cor_primaria: cor })
    assert.ok(contraste(textoSobre(t.primaria), t.primaria) >= 4.5, cor)
  }
})

test('valor que não é cor cai na paleta oficial (nada de CSS injetado)', () => {
  const t = temaDaBarbearia({ cor_primaria: 'red; background:url(x)', cor_secundaria: '#12' })
  assert.equal(t.primaria, PRIMARIA_PADRAO)
  assert.equal(t.secundaria, SECUNDARIA_PADRAO)
})
