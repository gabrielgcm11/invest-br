"use client";

import { useMemo, useRef, useState } from "react";
import { Comparacao, CORES_SERIES, COR_POUPANCA, Serie } from "@/lib/comparar";
import { fmtBRL } from "@/lib/api";

const LARGURA = 860;
const ALTURA = 340;
const M = { topo: 28, dir: 150, baixo: 34, esq: 64 };

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

export default function GraficoComparacao({ dados }: { dados: Comparacao }) {
  const [hoverMes, setHoverMes] = useState<number | null>(null);
  const [verTabela, setVerTabela] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const { series, meses_max } = dados;

  const escalas = useMemo(() => {
    const valores = series.flatMap((s) => s.pontos.map((p) => p.valor));
    const min = Math.min(dados.valor_inicial, ...valores);
    const max = Math.max(...valores);
    const folga = (max - min) * 0.06 || 1;
    const y0 = min - folga;
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

  const gridY = useMemo(() => {
    const passos = 4;
    return Array.from({ length: passos + 1 }, (_, i) => {
      const v = escalas.y0 + ((escalas.y1 - escalas.y0) * i) / passos;
      return { v, py: escalas.y(v) };
    });
  }, [escalas]);

  const aoMover = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * LARGURA;
    const frac = (px - M.esq) / (LARGURA - M.esq - M.dir);
    const mes = Math.round(1 + frac * (meses_max - 1));
    setHoverMes(mes >= 1 && mes <= meses_max ? mes : null);
  };

  const degrausVisiveis = DEGRAUS_IR.filter((d) => d.dias < meses_max * 30.44);

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="eyebrow">
          Valor líquido de {fmtBRL(dados.valor_inicial)}
          {dados.aporte_mensal > 0 && <> + {fmtBRL(dados.aporte_mensal)}/mês</>} mês a mês
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
      </ul>

      {verTabela ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-linha">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-linha bg-cartao text-left">
                <th className="px-3 py-2 font-medium">Mês</th>
                {series.map((s) => (
                  <th key={s.rotulo} className="px-3 py-2 font-medium">
                    {s.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series[0].pontos
                .filter((p) => p.mes % 3 === 0 || p.mes === 1)
                .map((p) => (
                  <tr key={p.mes} className="border-b border-linha/60 last:border-0">
                    <td className="num px-3 py-1.5">{p.mes}</td>
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
              <line x1={M.esq} x2={LARGURA - M.dir} y1={g.py} y2={g.py} stroke="#dce0d8" strokeWidth="1" />
              <text x={M.esq - 8} y={g.py + 3.5} textAnchor="end" fontSize="11" fill="#5b6b60" className="num">
                {g.v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
              </text>
            </g>
          ))}

          {degrausVisiveis.map((d) => {
            const mes = d.dias / 30.44 + 0.02;
            const px = escalas.x(Math.min(mes, meses_max));
            return (
              <g key={d.dias}>
                <line x1={px} x2={px} y1={M.topo - 4} y2={ALTURA - M.baixo} stroke="#9aa69d" strokeWidth="1" strokeDasharray="3 4" />
                <text x={px} y={M.topo - 10} textAnchor="middle" fontSize="10" fill="#5b6b60" className="num">
                  {d.rotulo}
                </text>
              </g>
            );
          })}

          {[1, Math.round(meses_max / 2), meses_max].map((m) => (
            <text key={m} x={escalas.x(m)} y={ALTURA - M.baixo + 18} textAnchor="middle" fontSize="11" fill="#5b6b60" className="num">
              {m}m
            </text>
          ))}

          {linhas.map(({ serie, d }, i) => (
            <path
              key={serie.rotulo}
              d={d}
              fill="none"
              stroke={corDaSerie(serie, i, series)}
              strokeWidth="2"
              strokeDasharray={serie.tipo === "POUPANCA" ? "5 4" : undefined}
              strokeLinejoin="round"
            />
          ))}

          {linhas.map(({ serie }, i) => {
            const ultimo = serie.pontos[serie.pontos.length - 1];
            const py = escalas.y(ultimo.valor);
            return (
              <g key={`fim-${serie.rotulo}`}>
                <circle cx={escalas.x(ultimo.mes)} cy={py} r="3.5" fill={corDaSerie(serie, i, series)} stroke="#f6f7f4" strokeWidth="1.5" />
                <text x={escalas.x(ultimo.mes) + 8} y={py + 3.5} fontSize="11" fontWeight="600" fill="#101e17" className="num">
                  {fmtBRL(ultimo.valor)}
                </text>
              </g>
            );
          })}

          {hoverMes !== null && (
            <g pointerEvents="none">
              <line x1={escalas.x(hoverMes)} x2={escalas.x(hoverMes)} y1={M.topo} y2={ALTURA - M.baixo} stroke="#101e17" strokeWidth="1" opacity="0.5" />
              {series.map((s, i) => {
                const p = s.pontos[hoverMes - 1];
                return (
                  <circle key={s.rotulo} cx={escalas.x(hoverMes)} cy={escalas.y(p.valor)} r="4" fill={corDaSerie(s, i, series)} stroke="#f6f7f4" strokeWidth="1.5" />
                );
              })}
              {(() => {
                const px = escalas.x(hoverMes);
                const flip = px > LARGURA - M.dir - 180;
                const tx = flip ? px - 178 : px + 10;
                const alturaTip = 22 + series.length * 17;
                return (
                  <g transform={`translate(${tx}, ${M.topo + 6})`}>
                    <rect width="168" height={alturaTip} rx="8" fill="#fdfefc" stroke="#dce0d8" />
                    <text x="10" y="16" fontSize="10.5" fontWeight="600" fill="#5b6b60" className="num">
                      mês {hoverMes} · {series[0].pontos[hoverMes - 1].dias} dias
                    </text>
                    {series.map((s, i) => (
                      <g key={s.rotulo} transform={`translate(10, ${28 + i * 17})`}>
                        <circle cx="4" cy="-3.5" r="3.5" fill={corDaSerie(s, i, series)} />
                        <text x="13" y="0" fontSize="11" fill="#101e17" className="num">
                          {fmtBRL(s.pontos[hoverMes - 1].valor)}
                        </text>
                      </g>
                    ))}
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
