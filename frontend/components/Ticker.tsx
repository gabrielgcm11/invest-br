"use client";

import { Taxas, fmtPct } from "@/lib/api";

export default function Ticker({ taxas }: { taxas: Taxas | null }) {
  const itens = taxas
    ? [
        { rotulo: "CDI hoje", valor: fmtPct(taxas.cdi_aa) + " a.a." },
        { rotulo: "Selic", valor: fmtPct(taxas.selic_aa) + " a.a." },
        { rotulo: "IPCA 12m", valor: fmtPct(taxas.ipca_12m) },
      ]
    : [
        { rotulo: "CDI hoje", valor: "—" },
        { rotulo: "Selic", valor: "—" },
        { rotulo: "IPCA 12m", valor: "—" },
      ];

  return (
    <div className="border-b border-linha bg-cartao">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <span className="display text-sm tracking-tight">
          quanto<span className="text-selva">rende</span>
        </span>
        <dl className="flex items-center gap-4 sm:gap-8">
          {itens.map((t) => (
            <div key={t.rotulo} className="flex items-baseline gap-2">
              <dt className="eyebrow hidden sm:block">{t.rotulo}</dt>
              <dt className="eyebrow sm:hidden">{t.rotulo.split(" ")[0]}</dt>
              <dd className="num text-sm font-medium">{t.valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
