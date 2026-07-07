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


def _valor_final(
    p: ProdutoComparacao, montante: float, dias: int, cdi_aa: float, ipca_12m: float
):
    req = SimulacaoRequest(
        valor=montante, prazo_dias=dias, tipo=p.tipo, indexador=p.indexador, taxa=p.taxa
    )
    return calculator.simular(req, cdi_aa=cdi_aa, ipca_12m=ipca_12m)


def _serie_produto(
    p: ProdutoComparacao,
    valor: float,
    meses_max: int,
    cdi_aa: float,
    ipca_12m: float,
    aporte: float = 0.0,
) -> dict:
    # Cada aporte tem seu próprio relógio de IR/IOF: um aporte feito no mês k,
    # avaliado no mês m, rendeu (m - k) meses. Pré-computa o valor líquido de
    # um aporte mantido por d meses e acumula via soma de prefixos.
    aportes_acum = [0.0] * (meses_max + 1)  # aportes_acum[m] = Σ aportes avaliados no mês m
    if aporte > 0:
        liquido_por_meses = [aporte]  # d = 0: aporte recém-feito, sem rendimento
        for d in range(1, meses_max):
            r = _valor_final(p, aporte, round(d * DIAS_POR_MES), cdi_aa, ipca_12m)
            liquido_por_meses.append(r.valor_final)
        soma = 0.0
        for m in range(1, meses_max + 1):
            soma += liquido_por_meses[m - 1]
            aportes_acum[m] = soma

    pontos = []
    for mes in range(1, meses_max + 1):
        dias = round(mes * DIAS_POR_MES)
        r = _valor_final(p, valor, dias, cdi_aa, ipca_12m)
        pontos.append(
            {
                "mes": mes,
                "dias": dias,
                "valor": round(r.valor_final + aportes_acum[mes], 2),
                "investido": round(valor + mes * aporte, 2),
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


def _serie_poupanca(
    valor: float, meses_max: int, selic_aa: float, tr_mensal: float, aporte: float = 0.0
) -> dict:
    """Poupança: Selic > 8,5% a.a. → 0,5% a.m. + TR; senão 70% da Selic + TR."""
    if selic_aa > 8.5:
        base_mensal = 0.005
    else:
        base_mensal = (1 + 0.70 * selic_aa / 100) ** (1 / 12) - 1
    fator_mensal = (1 + base_mensal) * (1 + tr_mensal / 100)

    pontos = []
    acumulado = valor
    for mes in range(1, meses_max + 1):
        acumulado = acumulado * fator_mensal + aporte
        rentab_aa = (fator_mensal**12 - 1) * 100
        pontos.append(
            {
                "mes": mes,
                "dias": round(mes * DIAS_POR_MES),
                "valor": round(acumulado, 2),
                "investido": round(valor + mes * aporte, 2),
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
    aporte_mensal: float = 0.0,
) -> dict:
    series = [
        _serie_produto(p, valor, meses_max, cdi_aa, ipca_12m, aporte_mensal) for p in produtos
    ]
    if incluir_poupanca:
        series.append(_serie_poupanca(valor, meses_max, selic_aa, tr_mensal, aporte_mensal))

    equivalencias = [
        {"rotulo": p.rotulo, "faixas": equivalencia_cdb(p.taxa)}
        for p in produtos
        if p.tipo in calculator.ISENTOS_IR and p.indexador == Indexador.CDI
    ]

    return {
        "valor_inicial": valor,
        "aporte_mensal": aporte_mensal,
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
