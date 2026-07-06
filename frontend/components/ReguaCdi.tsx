"use client";

import { Oferta, Taxas, fmtPct } from "@/lib/api";

const CORES_TIPO: Record<string, string> = {
  CDB: "bg-selva",
  LCI: "bg-urucum",
  LCA: "bg-urucum",
};

export default function ReguaCdi({
  ofertas,
  taxas,
  carregando,
  onSelecionar,
}: {
  ofertas: Oferta[];
  taxas: Taxas | null;
  carregando: boolean;
  onSelecionar: (o: Oferta) => void;
}) {
  const cdi = taxas?.cdi_aa ?? null;
  const validas = ofertas
    .filter((o) => o.rentabilidade_liquida_aa_pct !== null)
    .sort(
      (a, b) =>
        (b.rentabilidade_liquida_aa_pct as number) - (a.rentabilidade_liquida_aa_pct as number),
    );
  const maiorTaxa = Math.max(
    cdi ?? 0,
    ...validas.map((o) => o.rentabilidade_liquida_aa_pct as number),
    1,
  );
  const escala = maiorTaxa * 1.12;
  const posCdi = cdi ? (cdi / escala) * 100 : null;

  if (carregando) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6" aria-busy="true">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-linha/50" />
          ))}
        </div>
      </section>
    );
  }

  if (validas.length === 0) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-dashed border-linha bg-cartao p-10 text-center">
          <p className="display text-lg">Nenhuma oferta com esses filtros</p>
          <p className="mt-2 text-sm text-musgo">
            Aumente o prazo, mude o tipo ou limpe o filtro de banco.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="eyebrow">
          {validas.length === 1
            ? "1 oferta · ordenada pelo rendimento líquido"
            : `${validas.length} ofertas · ordenadas pelo rendimento líquido`}
        </h2>
        {cdi !== null && (
          <span className="eyebrow flex items-center gap-2">
            <span className="inline-block h-3 w-px bg-tinta" aria-hidden />
            réguas na escala do CDI ({fmtPct(cdi)})
          </span>
        )}
      </header>

      <ol className="flex flex-col gap-2">
        {validas.map((o, i) => {
          const taxa = o.rentabilidade_liquida_aa_pct as number;
          const largura = (taxa / escala) * 100;
          return (
            <li key={`${o.url ?? o.nome}-${i}`}>
              <button
                type="button"
                onClick={() => onSelecionar(o)}
                className="group grid w-full grid-cols-1 items-center gap-x-6 gap-y-2 rounded-xl border border-linha bg-cartao px-4 py-3 text-left transition-colors hover:border-musgo sm:grid-cols-[minmax(180px,240px)_1fr_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{o.emissor}</p>
                  <p className="truncate text-xs text-musgo">
                    {o.tipo} · por {o.distribuidor}
                    {o.fgc && (
                      <span className="ml-1 rounded bg-selva-claro px-1 py-px text-[10px] font-semibold text-selva">
                        FGC
                      </span>
                    )}
                  </p>
                </div>

                <div className="relative h-8" aria-hidden>
                  {posCdi !== null && (
                    <span
                      className="absolute top-0 h-full w-px bg-tinta/70"
                      style={{ left: `${posCdi}%` }}
                    />
                  )}
                  <span
                    className={`barra absolute top-1.5 h-5 rounded-r-sm ${CORES_TIPO[o.tipo] ?? "bg-musgo"} opacity-85 group-hover:opacity-100`}
                    style={{ width: `${largura}%`, transitionDelay: `${Math.min(i * 45, 450)}ms` }}
                  />
                </div>

                <div className="flex items-baseline gap-4 sm:flex-col sm:items-end sm:gap-0">
                  <span className="num text-lg font-semibold text-selva">
                    {fmtPct(taxa)} <span className="text-xs font-normal">a.a. líq.</span>
                  </span>
                  <span className="num text-xs text-musgo">
                    {o.rentabilidade} · venc. {o.vencimento}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-xs leading-relaxed text-musgo">
        Rendimento líquido já desconta IR e IOF quando aplicáveis. Ofertas coletadas ao vivo
        no Yubb; mínimo de aplicação pode variar. Clique numa oferta para simular com seu valor.
        {validas.some((o) => o.investimento_minimo && o.investimento_minimo > 0) && " "}
      </p>
    </section>
  );
}
