"use client";

export interface Filtros {
  valor: number;
  prazoMeses: number;
  tipo: string;
  emissor: string;
}

const TIPOS = [
  { valor: "", rotulo: "Todos" },
  { valor: "cdb", rotulo: "CDB" },
  { valor: "lci", rotulo: "LCI" },
  { valor: "lca", rotulo: "LCA" },
];

const BANCOS_SUGERIDOS = [
  "Inter", "Nubank", "XP Investimentos", "BTG Pactual", "C6 Bank",
  "PagBank", "Sofisa", "Daycoval", "BS2", "Pine", "Original", "Ágora",
];

export default function PainelBusca({
  filtros,
  onChange,
}: {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-8 sm:px-6">
      <p className="eyebrow mb-2">Renda fixa · dados reais do mercado</p>
      <h1 className="display max-w-2xl text-3xl leading-tight sm:text-5xl">
        Onde seu dinheiro rende mais?
      </h1>

      <div className="mt-8 grid gap-6 rounded-2xl border border-linha bg-cartao p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <label className="flex flex-col gap-2">
          <span className="eyebrow">Quero investir</span>
          <div className="flex items-baseline gap-1 border-b-2 border-tinta pb-1">
            <span className="num text-sm text-musgo">R$</span>
            <input
              type="number"
              min={1}
              step={100}
              value={filtros.valor}
              onChange={(e) => onChange({ ...filtros, valor: Number(e.target.value) })}
              className="num w-full bg-transparent text-2xl font-semibold outline-none"
              aria-label="Valor a investir em reais"
            />
          </div>
        </label>

        <label className="flex flex-col gap-2">
          <span className="eyebrow">Posso deixar por</span>
          <div className="flex flex-col gap-3 pt-1">
            <span className="num text-2xl font-semibold">
              {filtros.prazoMeses} {filtros.prazoMeses === 1 ? "mês" : "meses"}
            </span>
            <input
              type="range"
              min={1}
              max={60}
              value={filtros.prazoMeses}
              onChange={(e) => onChange({ ...filtros, prazoMeses: Number(e.target.value) })}
              aria-label="Prazo em meses"
            />
            <button
              type="button"
              onClick={() => onChange({ ...filtros, prazoMeses: 1 })}
              aria-pressed={filtros.prazoMeses === 1}
              className={`self-start rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filtros.prazoMeses === 1
                  ? "border-selva bg-selva-claro text-selva"
                  : "border-linha hover:border-musgo"
              }`}
            >
              ⚡ Resgate rápido (até 1 mês)
            </button>
          </div>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="eyebrow mb-2">Tipo</legend>
          <div className="flex flex-wrap gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.valor}
                type="button"
                onClick={() => onChange({ ...filtros, tipo: t.valor })}
                aria-pressed={filtros.tipo === t.valor}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  filtros.tipo === t.valor
                    ? "border-tinta bg-tinta text-papel"
                    : "border-linha bg-transparent hover:border-musgo"
                }`}
              >
                {t.rotulo}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-musgo">LCI e LCA são isentas de IR.</p>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="eyebrow">Só no meu banco</span>
          <input
            type="text"
            list="bancos"
            placeholder="Todos os bancos"
            value={filtros.emissor}
            onChange={(e) => onChange({ ...filtros, emissor: e.target.value })}
            className="border-b-2 border-tinta bg-transparent pb-1 pt-2 text-lg outline-none placeholder:text-musgo/60"
            aria-label="Filtrar por banco emissor ou corretora"
          />
          <datalist id="bancos">
            {BANCOS_SUGERIDOS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </label>
      </div>
    </section>
  );
}
