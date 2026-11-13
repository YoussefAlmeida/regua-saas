/* ================================================================
   Identidade visual de cada barbearia (white label controlado)
   O dono escolhe as cores; o sistema garante que continuam legíveis
   sobre o fundo escuro do RÉGUA: cor escura demais é clareada até
   atingir o contraste mínimo, e o texto sobre a cor (claro ou escuro)
   é escolhido pelo maior contraste. Tipografia, espaçamentos e
   estrutura não mudam.
   Sem imports: roda no servidor, no navegador e no teste.
   ================================================================ */

export const FUNDO = '#17191D'
export const CLARO = '#F2EFE9'
export const PRIMARIA_PADRAO = '#C5A46D'
export const SECUNDARIA_PADRAO = '#477A60'
export const HEX = /^#[0-9a-fA-F]{6}$/

type RGB = [number, number, number]

export function hexParaRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as RGB
}
const rgbParaHex = (c: RGB) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

function luminancia(hex: string): number {
  const [r, g, b] = hexParaRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contraste WCAG entre duas cores (1 a 21) */
export function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

function misturar(a: string, b: string, quanto: number): string {
  const x = hexParaRgb(a), y = hexParaRgb(b)
  return rgbParaHex(x.map((v, i) => v + (y[i] - v) * quanto) as RGB)
}

/** Clareia a cor, aos poucos, até ela ter o contraste mínimo sobre o fundo */
export function legivelNoFundo(cor: string, minimo: number, fundo = FUNDO): string {
  let c = cor.toUpperCase()
  for (let i = 1; i <= 20 && contraste(c, fundo) < minimo; i++) c = misturar(cor, CLARO, i * 0.05)
  return c
}

/** Texto que se lê melhor em cima da cor: escuro ou claro */
export const textoSobre = (cor: string) => (contraste(FUNDO, cor) >= contraste(CLARO, cor) ? FUNDO : CLARO)

export interface TemaBarbearia {
  /** Cores que vão pra tela (já ajustadas) */
  primaria: string
  secundaria: string
  /** true se alguma cor escolhida precisou ser clareada pra ficar legível */
  ajustada: boolean
  /** Variáveis CSS pra aplicar no elemento que envolve a página da barbearia */
  vars: Record<string, string>
}

const canais = (hex: string) => hexParaRgb(hex).join(' ')
const valida = (c: string | null | undefined): c is string => !!c && HEX.test(c)

export function temaDaBarbearia(cores: { cor_primaria?: string | null; cor_secundaria?: string | null } | null | undefined): TemaBarbearia {
  const p0 = valida(cores?.cor_primaria) ? cores!.cor_primaria! : PRIMARIA_PADRAO
  const s0 = valida(cores?.cor_secundaria) ? cores!.cor_secundaria! : SECUNDARIA_PADRAO
  // A principal vira texto e ícone (4,5:1); a secundária só preenche botão e selo (3:1)
  const primaria = legivelNoFundo(p0, 4.5)
  const secundaria = legivelNoFundo(s0, 3)
  return {
    primaria, secundaria,
    ajustada: primaria !== p0.toUpperCase() || secundaria !== s0.toUpperCase(),
    vars: {
      '--regua-accent': primaria,
      '--accent-rgb': canais(primaria),
      '--accent-press-rgb': canais(misturar(primaria, '#000000', 0.12)),
      '--accent-fg-rgb': canais(textoSobre(primaria)),
      '--verde-rgb': canais(secundaria),
      '--verde-fg-rgb': canais(textoSobre(secundaria)),
    },
  }
}
