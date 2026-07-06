"use client";

import { useEffect, useRef, useState } from "react";
import Ticker from "@/components/Ticker";
import PainelBusca, { Filtros } from "@/components/PainelBusca";
import ReguaCdi from "@/components/ReguaCdi";
import Simulador from "@/components/Simulador";
import { Oferta, Taxas, getOfertas, getTaxas } from "@/lib/api";

export default function Home() {
  const [taxas, setTaxas] = useState<Taxas | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({
    valor: 1000,
    prazoMeses: 12,
    tipo: "",
    emissor: "",
  });
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<Oferta | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getTaxas().then(setTaxas).catch(() => setTaxas(null));
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setCarregando(true);
      setErro(null);
      getOfertas({
        valor: filtros.valor || 1000,
        prazoMeses: filtros.prazoMeses,
        tipo: filtros.tipo || undefined,
        emissor: filtros.emissor.trim() || undefined,
      })
        .then((r) => setOfertas(r.ofertas))
        .catch(() => setErro("Não foi possível buscar as ofertas. A API está rodando?"))
        .finally(() => setCarregando(false));
    }, 600);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [filtros]);

  return (
    <main className="flex min-h-screen flex-col">
      <Ticker taxas={taxas} />
      <PainelBusca filtros={filtros} onChange={setFiltros} />

      {erro ? (
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <div className="rounded-2xl border border-dashed border-urucum/50 bg-urucum-claro p-10 text-center">
            <p className="display text-lg">{erro}</p>
            <p className="mt-2 text-sm text-musgo">
              Suba o backend com <code className="num">uvicorn app.main:app --port 8000</code> e
              recarregue a página.
            </p>
          </div>
        </section>
      ) : (
        <ReguaCdi
          ofertas={ofertas}
          taxas={taxas}
          carregando={carregando}
          onSelecionar={setSelecionada}
        />
      )}

      <Simulador
        key={selecionada?.url ?? selecionada?.nome ?? "vazio"}
        oferta={selecionada}
        valor={filtros.valor || 1000}
        onFechar={() => setSelecionada(null)}
      />

      <footer className="mt-auto border-t border-linha py-6">
        <p className="mx-auto max-w-6xl px-4 text-xs text-musgo sm:px-6">
          quantorende é uma ferramenta de comparação, não uma recomendação de investimento.
          Taxas oficiais do Banco Central; ofertas coletadas no Yubb.
        </p>
      </footer>
    </main>
  );
}
