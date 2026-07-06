"""Cálculo de rendimento líquido: IOF regressivo + IR regressivo."""

from app.models.schemas import (
    Indexador,
    SimulacaoRequest,
    SimulacaoResponse,
    TipoInvestimento,
)

# Tabela IOF regressiva sobre o rendimento (dia 1 ao 29; dia 30+ = 0%)
IOF_TABELA = [
    96, 93, 90, 86, 83, 80, 76, 73, 70, 66,
    63, 60, 56, 53, 50, 46, 43, 40, 36, 33,
    30, 26, 23, 20, 16, 13, 10, 6, 3, 0,
]

ISENTOS_IR = {TipoInvestimento.LCI, TipoInvestimento.LCA}


def aliquota_ir(prazo_dias: int) -> float:
    if prazo_dias <= 180:
        return 22.5
    if prazo_dias <= 360:
        return 20.0
    if prazo_dias <= 720:
        return 17.5
    return 15.0


def aliquota_iof(prazo_dias: int) -> float:
    if prazo_dias >= 30:
        return 0.0
    return float(IOF_TABELA[prazo_dias - 1])


def taxa_efetiva_aa(req: SimulacaoRequest, cdi_aa: float, ipca_12m: float) -> float:
    """Taxa nominal anual efetiva conforme o indexador."""
    if req.indexador == Indexador.CDI:
        return cdi_aa * (req.taxa / 100)
    if req.indexador == Indexador.PREFIXADO:
        return req.taxa
    # IPCA+: composição da inflação com a taxa real
    return ((1 + ipca_12m / 100) * (1 + req.taxa / 100) - 1) * 100


def simular(req: SimulacaoRequest, cdi_aa: float, ipca_12m: float) -> SimulacaoResponse:
    taxa_aa = taxa_efetiva_aa(req, cdi_aa, ipca_12m)

    # Dias úteis aproximados (base 252)
    dias_uteis = req.prazo_dias * 252 / 365
    fator = (1 + taxa_aa / 100) ** (dias_uteis / 252)
    rendimento_bruto = req.valor * (fator - 1)

    iof_pct = aliquota_iof(req.prazo_dias)
    iof = rendimento_bruto * iof_pct / 100
    base_ir = rendimento_bruto - iof

    isento = req.tipo in ISENTOS_IR
    ir_pct = 0.0 if isento else aliquota_ir(req.prazo_dias)
    ir = base_ir * ir_pct / 100

    liquido = rendimento_bruto - iof - ir
    valor_final = req.valor + liquido
    rent_pct = liquido / req.valor * 100
    rent_aa = ((1 + rent_pct / 100) ** (365 / req.prazo_dias) - 1) * 100

    return SimulacaoResponse(
        valor_investido=round(req.valor, 2),
        prazo_dias=req.prazo_dias,
        tipo=req.tipo,
        indexador=req.indexador,
        taxa=req.taxa,
        taxa_referencia={"cdi_aa": cdi_aa, "ipca_12m": ipca_12m, "taxa_efetiva_aa": round(taxa_aa, 2)},
        rendimento_bruto=round(rendimento_bruto, 2),
        iof=round(iof, 2),
        aliquota_ir=ir_pct,
        imposto_renda=round(ir, 2),
        rendimento_liquido=round(liquido, 2),
        valor_final=round(valor_final, 2),
        rentabilidade_liquida_pct=round(rent_pct, 2),
        rentabilidade_liquida_aa_pct=round(rent_aa, 2),
        isento_ir=isento,
    )
