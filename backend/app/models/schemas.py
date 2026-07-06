from enum import Enum

from pydantic import BaseModel, Field


class TipoInvestimento(str, Enum):
    CDB = "CDB"
    LCI = "LCI"
    LCA = "LCA"
    TESOURO_SELIC = "TESOURO_SELIC"
    TESOURO_PREFIXADO = "TESOURO_PREFIXADO"
    TESOURO_IPCA = "TESOURO_IPCA"


class Indexador(str, Enum):
    CDI = "CDI"          # percentual do CDI (ex: 110% CDI)
    PREFIXADO = "PRE"    # taxa fixa a.a.
    IPCA = "IPCA"        # IPCA + taxa a.a.


class Liquidez(str, Enum):
    DIARIA = "DIARIA"
    NO_VENCIMENTO = "NO_VENCIMENTO"


class SimulacaoRequest(BaseModel):
    valor: float = Field(..., gt=0, description="Valor investido em R$")
    prazo_dias: int = Field(..., gt=0, description="Prazo em dias corridos")
    tipo: TipoInvestimento
    indexador: Indexador
    taxa: float = Field(
        ...,
        gt=0,
        description="Se CDI: % do CDI (ex: 110). Se PRE: taxa a.a. (ex: 12.5). Se IPCA: taxa real a.a. (ex: 6.2)",
    )


class SimulacaoResponse(BaseModel):
    valor_investido: float
    prazo_dias: int
    tipo: TipoInvestimento
    indexador: Indexador
    taxa: float
    taxa_referencia: dict
    rendimento_bruto: float
    iof: float
    aliquota_ir: float
    imposto_renda: float
    rendimento_liquido: float
    valor_final: float
    rentabilidade_liquida_pct: float
    rentabilidade_liquida_aa_pct: float
    isento_ir: bool


class TaxasResponse(BaseModel):
    cdi_aa: float
    selic_aa: float
    ipca_12m: float
    atualizado_em: str
