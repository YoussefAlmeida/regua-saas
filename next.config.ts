import type { NextConfig } from "next"

// Host exato do projeto Supabase (antes: qualquer *.supabase.co podia ser
// buscado pelo otimizador de imagens e carregado na página)
const supabaseHost = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname } catch { return "" }
})()
const supabaseOrigem = supabaseHost ? `https://${supabaseHost}` : ""
const dev = process.env.NODE_ENV !== "production"

const CSP = [
  "default-src 'self'",
  // 'unsafe-eval' só em desenvolvimento (recarga automática do Next)
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' blob: data: ${supabaseOrigem}`.trim(),
  `connect-src 'self' ${supabaseOrigem} ${supabaseHost ? `wss://${supabaseHost}` : ""}`.trim(),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ")

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "DENY" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security",  value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy",    value: CSP },
        ],
      },
    ]
  },

  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
}

export default nextConfig
