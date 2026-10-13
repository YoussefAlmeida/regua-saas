/* ================================================================
   Regras de senha — seção 10.1
   Bloqueia as senhas que qualquer um chuta em 3 tentativas.
   Roda no servidor (cadastro) e no navegador (aviso na hora).
   ================================================================ */

export const SENHA_MIN = 8

const OBVIAS = new Set([
  'senha', 'senha123', 'senha1234', 'password', 'password1', 'qwerty', 'qwerty123',
  'abc123', 'abcd1234', 'mudar123', 'barbearia', 'barbeiro', 'regua', 'regua123',
  '123mudar', 'admin', 'admin123', 'iloveyou', 'brasil', 'bahia', 'teste123',
])

function sequencia(s: string): boolean {
  if (s.length < 4) return false
  let sobe = true, desce = true
  for (let i = 1; i < s.length; i++) {
    const d = s.charCodeAt(i) - s.charCodeAt(i - 1)
    if (d !== 1) sobe = false
    if (d !== -1) desce = false
  }
  return sobe || desce
}

/** Retorna a mensagem de erro, ou null se a senha serve */
export function problemaNaSenha(senha: string, extras: string[] = []): string | null {
  if (senha.length < SENHA_MIN) return `A senha precisa ter pelo menos ${SENHA_MIN} caracteres`
  const s = senha.toLowerCase()
  if (/^(.)\1+$/.test(s)) return 'Senha fácil demais — não repita o mesmo caractere'
  if (sequencia(s)) return 'Senha fácil demais — evite sequências como 12345678'
  if (OBVIAS.has(s)) return 'Essa senha é das primeiras que alguém tenta. Escolha outra'
  // Não pode ser o próprio telefone/e-mail
  for (const e of extras) {
    const limpo = e.toLowerCase().replace(/\D/g, '') || e.toLowerCase()
    if (limpo && limpo.length >= 4 && (s === limpo || s.includes(limpo) || limpo.includes(s))) {
      return 'A senha não pode ser seu telefone ou e-mail'
    }
  }
  return null
}
