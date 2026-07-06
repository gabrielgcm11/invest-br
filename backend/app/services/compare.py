"""Comparação de produtos mês a mês: tributados vs isentos vs poupança."""

from app.models.schemas import (
    Indexador,
    ProdutoComparacao,
    SimulacaoRequest,
    TipoInvestimento,
)
from app.services import calculator

DIAS_POR_MES = 30.44

# Faixas do IR regressivo: (limite em dias, alíquota %)
FAIXAS_IR = [(180, 22.5), (360, 20.0), (720, 17.5), (None, 15.0)]


def _serie_produto(
    p: ProdutoComparacao, valor: float, meses_max: int, cdi_aa: float, ipca_12m: float
) -> dict:
    pontos = []
    for mes in range(1, meses_max + 1):
        dias = round(mes * DIAS_POR_MES)
        req = SimulacaoRequest(
            valor=valor, prazo_dias=dias, tipo=p.tipo, indexador=p.indexador, taxa=p.taxa
        )
        r = calculator.simular(req, cdi_aa=cdi_aa, ipca_12m=ipca_12m)
        pontos.append(
            {
                "mes": mes,
                "dias": dias,
                "valor": r.valor_final,
                "aliquota_ir": r.aliquota_ir,
                "rentabilidade_aa": r.rentabilidade_liquida_aa_pct,
            }
        )
    return {
        "rotulo": p.rotulo,
        "tipo": p.tipo.value,
        "isento_ir": p.tipo in calculator.ISENTOS_IR,
        "pontos": pontos,
    }


def _serie_poupanca(valor: float, meses_max: int, selic_aa: float, tr_mensal: float) -> dict:
    """Poupança: Selic > 8,5% a.a. → 0,5% a.m. + TR; senão 70% da Selic + TR."""
    if selic_aa > 8.5:
        base_mensal = 0.005
    else:
        base_mensal = (1 + 0.70 * selic_aa / 100) ** (1 / 12) - 1
    fator_mensal = (1 + base_mensal) * (1 + tr_mensal / 100)

    pontos = []
    acumulado = valor
    for mes in range(1, meses_max + 1):
        acumulado *= fator_mensal
        rentab_aa = (fator_mensal**12 - 1) * 100
        pontos.append(
            {
                "mes": mes,
                "dias": round(mes * DIAS_POR_MES),
                "valor": round(acumulado, 2),
                "aliquota_ir": 0.0,
                "rentabilidade_aa": round(rentab_aa, 2),
            }
        )
    return {"rotulo": "Poupança", "tipo": "POUPANCA", "isento_ir": True, "pontos": pontos}


def equivalencia_cdb(taxa_isenta: float) -> list[dict]:
    """Quanto um CDB (% CDI) precisa pagar para empatar com um isento a X% do CDI."""
    faixas = []
    for limite, aliquota in FAIXAS_IR:
        faixas.append(
            {
                "ate_dias": limite,
                "aliquota_ir": aliquota,
                "cdb_equivalente": round(taxa_isenta / (1 - aliquota / 100), 1),
            }
        )
    return faixas


def comparar(
    produtos: list[ProdutoComparacao],
    valor: float,
    meses_max: int,
    cdi_aa: float,
    ipca_12m: float,
    selic_aa: float,
    tr_mensal: float,
    incluir_poupanca: bool,
) -> dict:
    series = [_serie_produto(p, valor, meses_max, cdi_aa, ipca_12m) for p in produtos]
    if incluir_poupanca:
        series.append(_serie_poupanca(valor, meses_max, selic_aa, tr_mensal))

    equivalencias = [
        {"rotulo": p.rotulo, "faixas": equivalencia_cdb(p.taxa)}
        for p in produtos
        if p.tipo in calculator.ISENTOS_IR and p.indexador == Indexador.CDI
    ]

    return {
        "valor_inicial": valor,
        "meses_max": meses_max,
        "series": series,
        "equivalencias": equivalencias,
        "taxas_referencia": {
            "cdi_aa": cdi_aa,
            "selic_aa": selic_aa,
            "ipca_12m": ipca_12m,
            "tr_mensal": tr_mensal,
        },
    }
