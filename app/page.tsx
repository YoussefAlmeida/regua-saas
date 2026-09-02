/* ────────────────────────────────────────────────────────────
   Dia 1 — vitrine dos tokens de design
   Confirma: projeto sobe, tokens aplicados, fontes carregadas
   ──────────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center gap-10 p-6">

      {/* ── Marca ──────────────────────────────────────────── */}
      <div className="text-center">
        <h1 className="font-display text-6xl md:text-8xl uppercase tracking-wider text-amber">
          RÉGUA
        </h1>
        <p className="font-ui text-fg-muted text-lg md:text-xl uppercase tracking-widest mt-2">
          Sua barbearia na régua.
        </p>
      </div>

      {/* ── Cards de exemplo — financeiro ──────────────────── */}
      <div className="flex flex-wrap gap-4 justify-center w-full max-w-lg">
        <Card label="Entradas" value="R$ 1.240" trend="+8" color="entrada" />
        <Card label="Saídas"   value="R$ 430"   trend="-3" color="saida" />
        <Card label="Saldo"    value="R$ 810"   trend=""   color="amber" />
      </div>

      {/* ── Amostra tipográfica ─────────────────────────────── */}
      <div className="bg-surface border border-line rounded-xl p-6 w-full max-w-lg space-y-3">
        <p className="font-display text-2xl text-amber uppercase">Anton — Display</p>
        <p className="font-ui text-lg text-fg uppercase tracking-wide">Oswald — UI Labels</p>
        <p className="font-body text-base text-fg">Open Sans — texto corrido, legível em luz baixa.</p>
        <p className="font-mono text-xl text-fg valor-monetario">R$ 1.240,00 — Space Mono</p>
      </div>

      {/* ── Paleta semântica ────────────────────────────────── */}
      <div className="flex gap-3 flex-wrap justify-center">
        <Swatch bg="bg-bg"          label="#0B0B0C" name="bg" />
        <Swatch bg="bg-surface"     label="#141416" name="surface" />
        <Swatch bg="bg-surface-alt" label="#1E1E21" name="surface-2" />
        <Swatch bg="bg-amber"       label="#E8B04B" name="accent" />
        <Swatch bg="bg-entrada"     label="#4FB477" name="entrada" />
        <Swatch bg="bg-saida"       label="#E2564D" name="saída" />
        <Swatch bg="bg-info"        label="#6BA3D6" name="info" />
      </div>

      {/* ── Status Dia 1 ────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-surface border border-line rounded-full px-5 py-2">
        <span className="w-2 h-2 rounded-full bg-entrada animate-pulse" />
        <span className="font-ui text-sm text-fg-muted uppercase tracking-wider">
          Sprint · Dia 1 — Scaffold concluído
        </span>
      </div>

    </main>
  )
}

/* ── Componentes locais de exemplo ─────────────────────────── */

function Card({
  label,
  value,
  trend,
  color,
}: {
  label: string
  value: string
  trend: string
  color: "entrada" | "saida" | "amber"
}) {
  const colorClass = {
    entrada: "text-entrada",
    saida: "text-saida",
    amber: "text-amber",
  }[color]

  return (
    <div className="bg-surface border border-line rounded-xl p-5 flex-1 min-w-[140px]">
      <p className="font-ui text-fg-muted text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`font-mono text-2xl font-bold valor-monetario ${colorClass}`}>{value}</p>
      {trend && (
        <p className={`font-ui text-xs mt-1 ${colorClass}`}>
          {trend} atendimentos
        </p>
      )}
    </div>
  )
}

function Swatch({ bg, label, name }: { bg: string; label: string; name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-10 h-10 rounded-lg border border-line ${bg}`} />
      <span className="font-mono text-xs text-fg-muted">{label}</span>
      <span className="font-ui text-xs text-fg-muted uppercase">{name}</span>
    </div>
  )
}
