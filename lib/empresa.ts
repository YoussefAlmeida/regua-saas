/* Quem é o RÉGUA (aparece nos Termos, na Privacidade e no rodapé).
   EMPRESA_RAZAO_SOCIAL / EMPRESA_DOCUMENTO (CNPJ ou CPF) vêm da Vercel. */
export const EMPRESA = {
  marca: 'RÉGUA',
  razaoSocial: process.env.EMPRESA_RAZAO_SOCIAL ?? null,
  documento: process.env.EMPRESA_DOCUMENTO ?? null,
  cidade: process.env.EMPRESA_CIDADE ?? 'Feira de Santana, BA',
  suporteWhatsapp: (process.env.SUPORTE_WHATSAPP ?? '75982727760').replace(/\D/g, '').replace(/^55/, ''),
  emailPrivacidade: process.env.EMPRESA_EMAIL_PRIVACIDADE ?? null,
}

export const linkSuporte = (texto?: string) =>
  `https://wa.me/55${EMPRESA.suporteWhatsapp}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`

export const VERSAO_TERMOS = '2026-10-15'
