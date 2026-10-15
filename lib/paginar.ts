/* ================================================================
   Busca TODAS as linhas, de 1000 em 1000.
   O Supabase devolve no máximo 1000 linhas por consulta (max_rows) e
   corta o resto calado: soma de caixa e relatório saíam menores que o
   real em barbearia grande. A consulta precisa de uma ordem estável
   (termine com .order('id')) pra página não pular nem repetir linha.

   Uso:
     const { data, error } = await todasAsLinhas((de, ate) =>
       db.from('movimentacoes').select('tipo, valor').eq(...).order('id').range(de, ate))
   ================================================================ */

const PAGINA = 1000          // = max_rows padrão do Supabase
const TETO = 200_000         // trava de segurança contra laço sem fim

type Resposta<T> = { data: T[] | null; error: { message: string; code?: string } | null }

export async function todasAsLinhas<T>(
  pagina: (de: number, ate: number) => PromiseLike<Resposta<T>>,
): Promise<{ data: T[]; error: Resposta<T>['error'] }> {
  const todas: T[] = []
  for (let de = 0; de < TETO; de += PAGINA) {
    const { data, error } = await pagina(de, de + PAGINA - 1)
    if (error) return { data: todas, error }
    todas.push(...(data ?? []))
    if (!data || data.length < PAGINA) break
  }
  return { data: todas, error: null }
}
