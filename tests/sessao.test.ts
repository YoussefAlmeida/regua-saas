import { test } from 'node:test'
import assert from 'node:assert/strict'

// Mesma regra de lib/auth.ts (sessaoVigente). Copiada aqui porque lib/auth
// importa módulos do Next que não carregam fora do servidor.
const sessaoVigente = (svDoToken: number | undefined, svNoBanco: number | null | undefined) =>
  (svDoToken ?? 0) === (svNoBanco ?? 0)

test('cookie antigo (sem versão) vale enquanto a senha não mudou', () => {
  assert.equal(sessaoVigente(undefined, 0), true)
  assert.equal(sessaoVigente(undefined, null), true)
  assert.equal(sessaoVigente(0, undefined), true)   // coluna ainda não existe
})

test('trocar a senha derruba as sessões emitidas antes', () => {
  assert.equal(sessaoVigente(0, 1), false)
  assert.equal(sessaoVigente(undefined, 1), false)
  assert.equal(sessaoVigente(1, 2), false)
})

test('a sessão criada na troca de senha continua valendo', () => {
  assert.equal(sessaoVigente(1, 1), true)
})
