"use client";

import { useEffect, useRef, useState } from "react";
import {
  Comparacao,
  ProdutoComparacao,
  comparar,
  CORES_SERIES,
} from "@/lib/comparar";
import { fmtBRL } from "@/lib/api";
import GraficoComparacao from "./GraficoComparacao";

const PRESETS: { rotulo: string; produtos: ProdutoComparacao[] }[] = [
  {
    rotulo: "CDB 100% vs LCA 91%",
    produtos: [
      { rotulo: "CDB 100% CDI", tipo: "CDB", indexador: "CDI", taxa: 100 },
      { rotulo: "LCA 91% CDI", tipo: "LCA", indexador: "CDI", taxa: 91 },
    ],
  },
  {
    rotulo: "Liquidez diária vs prazo",
    produtos: [
      { rotulo: "CDB 100% CDI", tipo: "CDB", indexador: "CDI", taxa: 100 },
      { rotulo: "CDB 110% CDI", tipo: "CDB", indexador: "CDI", taxa: 110 },
    ],
  },
];

function rotuloAuto(p: Omit<ProdutoComparacao, "rotulo">): string {
  const sufixo =
    p.indexador === "CDI" ? "% CDI" : p.indexador === "PRE" ? "% a.a." : "% + IPCA";
  return `${p.tipo} ${String(p.taxa).replace(".", ",")}${sufixo}`;
}

export default function Comparador({ valorInicial }: { valorInicial: number }) {
  const [valor, setValor] = useState(valorInicial);
  const [mesesMax, setMesesMax] = useState(24);
  const [incluirPoupanca, setIncluirPoupanca] = useState(true);
  const [produtos, setProdutos] = useState<ProdutoComparacao[]>(PRESETS[0].produtos);
  const [dados, setDados] = useState<Comparacao | null>(null);
  const [erro, setErro] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setErro(false);
      comparar({ valor: valor || 1000, mesesMax, produtos, incluirPoupanca })
        .then(setDados)
        .catch(() => setErro(true));
    }, 500);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [valor, mesesMax, produtos, incluirPoupanca]);

  const atualizar = (i: number, mudanca: Partial<ProdutoComparacao>) => {
    setProdutos((atual) =>
      atual.map((p, j) => {
        if (j !== i) return p;
        const novo = { ...p, ...mudanca };
        return { ...novo, rotulo: rotuloAuto(novo) };
      }),
    );
  };

  const veredito = (() => {
    if (!dados) return null;
    const produtosSerie = dados.series.filter((s) => s.tipo !== "POUPANCA");
    if (produtosSerie.length < 2) return null;
    const ordenados = [...produtosSerie].sort(
      (a, b) => b.pontos[b.pontos.length - 1].valor - a.pontos[a.pontos.length - 1].valor,
    );
    const [melhor, segundo] = ordenados;
    const diferenca =
      melhor.pontos[melhor.pontos.length - 1].valor -
      segundo.pontos[segundo.pontos.length - 1].valor;
    let cruzamento: number | null = null;
    for (let m = 0; m < dados.meses_max; m++) {
      const lider = melhor.pontos[m].valor >= segundo.pontos[m].valor;
      if (m === 0 && lider) break;
      if (lider) {
        cruzamento = m + 1;
        break;
      }
    }
    return { melhor, segundo, diferenca, cruzamento };
  })();

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-5 rounded-2xl border border-linha bg-cartao p-5">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.rotulo}
                type="button"
                onClick={() => setProdutos(preset.produtos)}
                className="rounded-full border border-linha px-3 py-1 text-xs font-medium hover:border-musgo"
              >
                {preset.rotulo}
              </button>
            ))}
          </div>

          {produtos.map((p, i) => (
            <fieldset key={i} className="rounded-xl border border-linha p-3">
              <legend className="flex items-center gap-2 px-1 text-xs font-semibold">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: CORES_SERIES[i % CORES_SERIES.length] }}
                />
                {p.rotulo}
                {produtos.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remover ${p.rotulo}`}
                    onClick={() => setProdutos(produtos.filter((_, j) => j !== i))}
                    className="ml-1 text-musgo hover:text-tinta"
                  >
                    ×
                  </button>
                )}
              </legend>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <select
                  value={p.tipo}
                  onChange={(e) => atualizar(i, { tipo: e.target.value as ProdutoComparacao["tipo"] })}
                  className="rounded-lg border border-linha bg-transparent px-2 py-1.5 text-sm"
                  aria-label="Tipo do produto"
                >
                  <option>CDB</option>
                  <option>LCI</option>
                  <option>LCA</option>
                </select>
                <input
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={p.taxa}
                  onChange={(e) => atualizar(i, { taxa: Number(e.target.value) })}
                  className="num rounded-lg border border-linha bg-transparent px-2 py-1.5 text-sm"
                  aria-label="Taxa"
                />
                <select
                  value={p.indexador}
                  onChange={(e) =>
                    atualizar(i, { indexador: e.target.value as ProdutoComparacao["indexador"] })
                  }
                  className="rounded-lg border border-linha bg-transparent px-2 py-1.5 text-sm"
                  aria-label="Indexador"
                >
                  <option value="CDI">% CDI</option>
                  <option value="PRE">% a.a.</option>
                  <option value="IPCA">IPCA +</option>
                </select>
              </div>
              {["LCI", "LCA"].includes(p.tipo) && (
                <p className="mt-2 text-[11px] text-musgo">Isento de IR e IOF.</p>
              )}
            </fieldset>
          ))}

          {produtos.length < 4 && (
            <button
              type="button"
              onClick={() =>
                setProdutos([
                  ...produtos,
                  { rotulo: rotuloAuto({ tipo: "CDB", indexador: "CDI", taxa: 105 }), tipo: "CDB", indexador: "CDI", taxa: 105 },
                ])
              }
              className="rounded-xl border border-dashed border-linha py-2 text-sm font-medium text-musgo hover:border-musgo hover:text-tinta"
            >
              + adicionar produto
            </button>
          )}

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Valor investido</span>
            <div className="flex items-baseline gap-1 border-b-2 border-tinta pb-1">
              <span className="num text-sm text-musgo">R$</span>
              <input
                type="number"
                min={1}
                step={100}
                value={valor}
                onChange={(e) => setValor(Number(e.target.value))}
                className="num w-full bg-transparent text-xl font-semibold outline-none"
              />
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="eyebrow">Horizonte: {mesesMax} meses</span>
            <input
              type="range"
              min={3}
              max={60}
              value={mesesMax}
              onChange={(e) => setMesesMax(Number(e.target.value))}
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={incluirPoupanca}
              onChange={(e) => setIncluirPoupanca(e.target.checked)}
              className="h-4 w-4 accent-tinta"
            />
            Mostrar poupança como referência
          </label>
        </div>

        <div className="flex flex-col gap-5">
          {erro && (
            <div className="rounded-2xl border border-dashed border-urucum/50 bg-urucum-claro p-8 text-center">
              <p className="display">Não foi possível comparar. A API está rodando?</p>
            </div>
          )}

          {!erro && dados && veredito && (
            <div className="rounded-2xl border border-linha bg-cartao p-5">
              <p className="eyebrow">Veredito no seu horizonte</p>
              <p className="mt-2 text-lg leading-snug">
                <strong className="display">{veredito.melhor.rotulo}</strong> termina com{" "}
                <strong className="num text-selva">{fmtBRL(veredito.diferenca)}</strong> a mais
                que {veredito.segundo.rotulo} em {mesesMax} meses.
                {veredito.cruzamento && veredito.cruzamento > 1 && (
                  <> A liderança vira no mês {veredito.cruzamento} — antes disso, {veredito.segundo.rotulo} paga mais.</>
                )}
              </p>
              {dados.equivalencias.length > 0 && (
                <p className="mt-3 border-t border-linha pt-3 text-sm text-musgo">
                  Para empatar com {dados.equivalencias[0].rotulo}, um CDB precisa pagar{" "}
                  {dados.equivalencias[0].faixas
                    .map((f) =>
                      f.ate_dias
                        ? `${String(f.cdb_equivalente).replace(".", ",")}% até ${Math.round(f.ate_dias / 30.44)}m`
                        : `${String(f.cdb_equivalente).replace(".", ",")}% acima de 2 anos`,
                    )
                    .join(" · ")}{" "}
                  do CDI.
                </p>
              )}
            </div>
          )}

          {!erro && dados && (
            <div className="rounded-2xl border border-linha bg-cartao p-5">
              <GraficoComparacao dados={dados} />
            </div>
          )}

          {!erro && !dados && (
            <div className="h-96 animate-pulse rounded-2xl bg-linha/50" />
          )}
        </div>
      </div>
    </section>
  );
}
