"use client";

import { useMemo, useRef, useState } from "react";
import {
  Comparacao,
  CORES_SERIES,
  COR_POUPANCA,
  COR_INVESTIDO,
  Serie,
} from "@/lib/comparar";
import { fmtBRL } from "@/lib/api";

const LARGURA = 860;
const ALTURA = 360;
const M = { topo: 30, dir: 150, baixo: 36, esq: 58 };

// Degraus do IR regressivo em dias → posição no eixo de meses
const DEGRAUS_IR = [
  { dias: 180, rotulo: "IR 20%" },
  { dias: 360, rotulo: "IR 17,5%" },
  { dias: 720, rotulo: "IR 15%" },
];

function corDaSerie(s: Serie, idx: number, series: Serie[]): string {
  if (s.tipo === "POUPANCA") return COR_POUPANCA;
  const produtos = series.filter((x) => x.tipo !== "POUPANCA");
  return CORES_SERIES[produtos.indexOf(s) % CORES_SERIES.length];
}

/** Valor compacto para eixos: 1.500 → "1,5 mil"; 2.000.000 → "2 mi".
 *  `faixa` = amplitude do eixo; em faixas curtas mantém precisão para não repetir rótulos. */
function fmtCompacto(v: number, faixa = Infinity): string {
  if (Math.abs(v) >= 1_000_000)
    return `${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: faixa < 4_000_000 ? 2 : 1 })} mi`;
  if (Math.abs(v) >= 1_000 && faixa >= 4_000)
    return `${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: faixa < 40_000 ? 1 : 0 })} mil`;
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function fmtMes(m: number, horizonte: number): string {
  if (horizonte > 36) {
    const anos = m / 12;
    return `${anos.toLocaleString("pt-BR", { maximumFractionDigits: anos < 1 ? 1 : 0 })}a`;
  }
  return `${m}m`;
}

export default function GraficoComparacao({ dados }: { dados: Comparacao }) {
  const [hoverMes, setHoverMes] = useState<number | null>(null);
  const [verTabela, setVerTabela] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const { series, meses_max } = dados;
  const temAporte = dados.aporte_mensal > 0;

  const escalas = useMemo(() => {
    const valores = series.flatMap((s) => s.pontos.map((p) => p.valor));
    const min = Math.min(dados.valor_inicial, ...valores);
    const max = Math.max(...valores);
    const folga = (max - min) * 0.06 || 1;
    const y0 = min >= 0 ? Math.max(0, min - folga) : min - folga;
    const y1 = max + folga;
    const x = (mes: number) =>
      M.esq + ((mes - 1) / Math.max(meses_max - 1, 1)) * (LARGURA - M.esq - M.dir);
    const y = (v: number) => M.topo + (1 - (v - y0) / (y1 - y0)) * (ALTURA - M.topo - M.baixo);
    return { x, y, y0, y1 };
  }, [series, meses_max, dados.valor_inicial]);

  const linhas = useMemo(
    () =>
      series.map((s) => ({
        serie: s,
        d: s.pontos
          .map((p, i) => `${i === 0 ? "M" : "L"}${escalas.x(p.mes).toFixed(1)},${escalas.y(p.valor).toFixed(1)}`)
          .join(""),
      })),
    [series, escalas],
  );

  // Linha de referência: total que saiu do bolso (mesma p/ todas as séries)
  const linhaInvestido = useMemo(() => {
    if (!temAporte) return null;
    return series[0].pontos
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${escalas.x(p.mes).toFixed(1)},${escalas.y(p.investido).toFixed(1)}`,
      )
      .join("");
  }, [series, escalas, temAporte]);

  const gridY = useMemo(() => {
    const passos = 4;
    return Array.from({ length: passos + 1 }, (_, i) => {
      const v = escalas.y0 + ((escalas.y1 - escalas.y0) * i) / passos;
      return { v, py: escalas.y(v) };
    });
  }, [escalas]);

  const ticksX = useMemo(() => {
    if (meses_max > 36) {
      // Horizonte longo: ticks em anos cheios
      const alvos = [0.25, 0.5, 0.75, 1].map((f) =>
        Math.min(meses_max, Math.max(12, Math.round((f * meses_max) / 12) * 12)),
      );
      return [...new Set(alvos)];
    }
    const alvos = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.max(1, Math.round(1 + f * (meses_max - 1))));
    return [...new Set(alvos)];
  }, [meses_max]);

  const aoMover = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * LARGURA;
    const frac = (px - M.esq) / (LARGURA - M.esq - M.dir);
    const mes = Math.round(1 + frac * (meses_max - 1));
    setHoverMes(mes >= 1 && mes <= meses_max ? mes : null);
  };

  // Degraus de IR só quando são legíveis (em horizontes longos viram ruído à esquerda)
  const degrausVisiveis =
    meses_max <= 60 ? DEGRAUS_IR.filter((d) => d.dias < meses_max * 30.44) : [];

  const passoTabela = meses_max > 120 ? 12 : meses_max > 48 ? 6 : 3;

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="eyebrow">
          Valor líquido de {fmtBRL(dados.valor_inicial)}
          {temAporte && <> + {fmtBRL(dados.aporte_mensal)}/mês</>} mês a mês
        </figcaption>
        <button
          type="button"
          onClick={() => setVerTabela(!verTabela)}
          className="eyebrow underline decoration-linha underline-offset-4 hover:decoration-musgo"
          aria-pressed={verTabela}
        >
          {verTabela ? "ver gráfico" : "ver tabela"}
        </button>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1" aria-hidden={verTabela}>
        {series.map((s, i) => (
          <li key={s.rotulo} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: corDaSerie(s, i, series) }}
            />
            {s.rotulo}
            {s.isento_ir && s.tipo !== "POUPANCA" && (
              <span className="text-musgo">· isento IR</span>
            )}
          </li>
        ))}
        {temAporte && (
          <li className="flex items-center gap-1.5 text-xs text-musgo">
            <span
              className="inline-block h-0 w-4 border-t-2 border-dotted"
              style={{ borderColor: COR_INVESTIDO }}
            />
            só o que você depositou
          </li>
        )}
      </ul>

      {verTabela ? (
        <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-linha">
          <table className="w-full text-sm">
            <thead className="sticky top-0">
              <tr className="border-b border-linha bg-cartao text-left">
                <th className="px-3 py-2 font-medium">{meses_max > 36 ? "Tempo" : "Mês"}</th>
                {temAporte && <th className="px-3 py-2 font-medium text-musgo">Investido</th>}
                {series.map((s) => (
                  <th key={s.rotulo} className="px-3 py-2 font-medium">
                    {s.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series[0].pontos
                .filter((p) => p.mes % passoTabela === 0 || p.mes === 1)
                .map((p) => (
                  <tr key={p.mes} className="border-b border-linha/60 last:border-0">
                    <td className="num px-3 py-1.5">{fmtMes(p.mes, meses_max)}</td>
                    {temAporte && (
                      <td className="num px-3 py-1.5 text-musgo">{fmtBRL(p.investido)}</td>
                    )}
                    {series.map((s) => (
                      <td key={s.rotulo} className="num px-3 py-1.5">
                        {fmtBRL(s.pontos[p.mes - 1].valor)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${LARGURA} ${ALTURA}`}
          className="mt-2 w-full"
          role="img"
          aria-label={`Evolução do valor líquido em ${meses_max} meses para ${series.map((s) => s.rotulo).join(", ")}`}
          onMouseMove={aoMover}
          onMouseLeave={() => setHoverMes(null)}
        >
          {gridY.map((g) => (
            <g key={g.py}>
              <line x1={M.esq} x2={LARGURA - M.dir} y1={g.py} y2={g.py} stroke="#e6e9e3" strokeWidth="1" />
              <text x={M.esq - 8} y={g.py + 3.5} textAnchor="end" fontSize="11" fill="#626d63" className="num">
                {fmtCompacto(g.v, escalas.y1 - escalas.y0)}
              </text>
            </g>
          ))}

          {degrausVisiveis.map((d) => {
            const mes = d.dias / 30.44 + 0.02;
            const px = escalas.x(Math.min(mes, meses_max));
            return (
              <g key={d.dias}>
                <line x1={px} x2={px} y1={M.topo - 4} y2={ALTURA - M.baixo} stroke="#9aa69d" strokeWidth="1" strokeDasharray="3 4" />
                <text x={px} y={M.topo - 10} textAnchor="middle" fontSize="10" fill="#626d63" className="num">
                  {d.rotulo}
                </text>
              </g>
            );
          })}

          {ticksX.map((m) => (
            <text key={m} x={escalas.x(m)} y={ALTURA - M.baixo + 18} textAnchor="middle" fontSize="11" fill="#626d63" className="num">
              {fmtMes(m, meses_max)}
            </text>
          ))}

          {linhaInvestido && (
            <path
              d={linhaInvestido}
              fill="none"
              stroke={COR_INVESTIDO}
              strokeWidth="1.5"
              strokeDasharray="2 4"
              strokeLinecap="round"
            />
          )}

          {linhas.map(({ serie, d }, i) => (
            <path
              key={serie.rotulo}
              d={d}
              fill="none"
              stroke={corDaSerie(serie, i, series)}
              strokeWidth="2.25"
              strokeDasharray={serie.tipo === "POUPANCA" ? "5 4" : undefined}
              strokeLinejoin="round"
            />
          ))}

          {linhas.map(({ serie }, i) => {
            const ultimo = serie.pontos[serie.pontos.length - 1];
            const py = escalas.y(ultimo.valor);
            return (
              <g key={`fim-${serie.rotulo}`}>
                <circle cx={escalas.x(ultimo.mes)} cy={py} r="3.5" fill={corDaSerie(serie, i, series)} stroke="#fafbf8" strokeWidth="1.5" />
                <text x={escalas.x(ultimo.mes) + 8} y={py + 3.5} fontSize="11" fontWeight="600" fill="#10160f" className="num">
                  {fmtBRL(ultimo.valor)}
                </text>
              </g>
            );
          })}

          {hoverMes !== null && (
            <g pointerEvents="none">
              <line x1={escalas.x(hoverMes)} x2={escalas.x(hoverMes)} y1={M.topo} y2={ALTURA - M.baixo} stroke="#10160f" strokeWidth="1" opacity="0.5" />
              {series.map((s, i) => {
                const p = s.pontos[hoverMes - 1];
                return (
                  <circle key={s.rotulo} cx={escalas.x(hoverMes)} cy={escalas.y(p.valor)} r="4" fill={corDaSerie(s, i, series)} stroke="#fafbf8" strokeWidth="1.5" />
                );
              })}
              {(() => {
                const px = escalas.x(hoverMes);
                const larguraTip = 196;
                const flip = px > LARGURA - M.dir - larguraTip - 20;
                const tx = flip ? px - larguraTip - 10 : px + 10;
                const linhasTip = series.length + (temAporte ? 1 : 0);
                const alturaTip = 24 + linhasTip * 17;
                const pInv = series[0].pontos[hoverMes - 1];
                return (
                  <g transform={`translate(${tx}, ${M.topo + 6})`}>
                    <rect width={larguraTip} height={alturaTip} rx="8" fill="#ffffff" stroke="#e6e9e3" />
                    <text x="10" y="16" fontSize="10.5" fontWeight="600" fill="#626d63" className="num">
                      {meses_max > 36
                        ? `${fmtMes(hoverMes, meses_max)} · mês ${hoverMes}`
                        : `mês ${hoverMes} · ${pInv.dias} dias`}
                    </text>
                    {series.map((s, i) => {
                      const p = s.pontos[hoverMes - 1];
                      const rendeu = p.valor - p.investido;
                      return (
                        <g key={s.rotulo} transform={`translate(10, ${30 + i * 17})`}>
                          <circle cx="4" cy="-3.5" r="3.5" fill={corDaSerie(s, i, series)} />
                          <text x="13" y="0" fontSize="11" fill="#10160f" className="num">
                            {fmtBRL(p.valor)}
                            {temAporte && (
                              <tspan fill="#626d63"> (+{fmtCompacto(rendeu)})</tspan>
                            )}
                          </text>
                        </g>
                      );
                    })}
                    {temAporte && (
                      <g transform={`translate(10, ${30 + series.length * 17})`}>
                        <text x="13" y="0" fontSize="10.5" fill="#626d63" className="num">
                          depositado: {fmtBRL(pInv.investido)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })()}
            </g>
          )}
        </svg>
      )}
    </figure>
  );
}
