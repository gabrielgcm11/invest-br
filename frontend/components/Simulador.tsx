"use client";

import { useEffect, useState } from "react";
import { Oferta, Simulacao, simular, fmtBRL, fmtPct } from "@/lib/api";

export default function Simulador({
  oferta,
  valor,
  onFechar,
}: {
  oferta: Oferta | null;
  valor: number;
  onFechar: () => void;
}) {
  const [sim, setSim] = useState<Simulacao | null>(null);
  const [erro, setErro] = useState(false);
  const carregando = !sim && !erro;

  useEffect(() => {
    if (!oferta) return;
    let ativo = true;
    simular(oferta, valor)
      .then((r) => ativo && (r ? setSim(r) : setErro(true)))
      .catch(() => ativo && setErro(true));
    return () => {
      ativo = false;
    };
  }, [oferta, valor]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  if (!oferta) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Simulação da oferta">
      <button
        type="button"
        aria-label="Fechar simulação"
        onClick={onFechar}
        className="absolute inset-0 bg-tinta/30 backdrop-blur-[2px]"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-papel shadow-2xl">
        <header className="border-b border-linha bg-cartao px-6 py-5">
          <p className="eyebrow">{oferta.tipo} · {oferta.distribuidor}</p>
          <h2 className="display mt-1 text-xl">{oferta.nome}</h2>
          <p className="mt-1 text-sm text-musgo">
            Emissor: {oferta.emissor}
            {oferta.fgc && " · garantido pelo FGC até R$ 250 mil"}
          </p>
        </header>

        <div className="flex-1 px-6 py-6">
          {carregando && <p className="num text-sm text-musgo">Calculando…</p>}

          {erro && (
            <p className="text-sm text-musgo">
              Não foi possível simular esta oferta. Tente outra ou verifique se a API está no ar.
            </p>
          )}

          {sim && (
            <>
              <p className="eyebrow">Investindo {fmtBRL(sim.valor_investido)} até o vencimento</p>
              <p className="num mt-2 text-4xl font-semibold text-selva">
                {fmtBRL(sim.valor_final)}
              </p>
              <p className="mt-1 text-sm text-musgo">
                em {sim.prazo_dias} dias ({fmtPct(sim.rentabilidade_liquida_pct)} no período)
              </p>

              <dl className="mt-8 flex flex-col divide-y divide-linha border-y border-linha">
                <Linha rotulo="Rendimento bruto" valor={`+ ${fmtBRL(sim.rendimento_bruto)}`} />
                <Linha
                  rotulo="IOF"
                  valor={sim.iof > 0 ? `− ${fmtBRL(sim.iof)}` : "isento"}
                  atenuar={sim.iof === 0}
                />
                <Linha
                  rotulo={sim.isento_ir ? "Imposto de renda" : `IR (${fmtPct(sim.aliquota_ir)})`}
                  valor={sim.isento_ir ? "isento" : `− ${fmtBRL(sim.imposto_renda)}`}
                  atenuar={sim.isento_ir}
                />
                <Linha
                  rotulo="Rendimento líquido"
                  valor={`+ ${fmtBRL(sim.rendimento_liquido)}`}
                  destaque
                />
              </dl>

              <p className="mt-6 text-xs leading-relaxed text-musgo">
                Simulação com CDI {fmtPct(sim.taxa_referencia.cdi_aa)} e IPCA{" "}
                {fmtPct(sim.taxa_referencia.ipca_12m)} atuais, taxa efetiva de{" "}
                {fmtPct(sim.taxa_referencia.taxa_efetiva_aa)} a.a. Rentabilidade passada e
                projeções não garantem resultado futuro.
              </p>
            </>
          )}
        </div>

        <footer className="border-t border-linha bg-cartao px-6 py-4">
          {oferta.url && (
            <a
              href={oferta.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-full bg-urucum px-6 py-3 text-center font-semibold text-white transition-opacity hover:opacity-90"
            >
              Ver oferta no Yubb
            </a>
          )}
          <button
            type="button"
            onClick={onFechar}
            className="mt-2 block w-full rounded-full border border-linha px-6 py-3 text-center text-sm font-medium hover:border-musgo"
          >
            Voltar à lista
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque = false,
  atenuar = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  atenuar?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-3">
      <dt className={`text-sm ${destaque ? "font-semibold" : "text-musgo"}`}>{rotulo}</dt>
      <dd
        className={`num text-sm ${
          destaque ? "text-base font-semibold text-selva" : atenuar ? "text-musgo" : ""
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
