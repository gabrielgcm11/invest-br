from app.models.schemas import Indexador, SimulacaoRequest, TipoInvestimento
from app.services.calculator import aliquota_iof, aliquota_ir, simular


def test_aliquota_ir_regressiva():
    assert aliquota_ir(30) == 22.5
    assert aliquota_ir(180) == 22.5
    assert aliquota_ir(181) == 20.0
    assert aliquota_ir(360) == 20.0
    assert aliquota_ir(361) == 17.5
    assert aliquota_ir(720) == 17.5
    assert aliquota_ir(721) == 15.0


def test_aliquota_iof():
    assert aliquota_iof(1) == 96
    assert aliquota_iof(15) == 50
    assert aliquota_iof(29) == 3
    assert aliquota_iof(30) == 0
    assert aliquota_iof(365) == 0


def test_cdb_110_cdi_1_ano():
    req = SimulacaoRequest(
        valor=1000, prazo_dias=365, tipo=TipoInvestimento.CDB,
        indexador=Indexador.CDI, taxa=110,
    )
    r = simular(req, cdi_aa=13.15, ipca_12m=4.5)
    assert r.iof == 0
    assert r.aliquota_ir == 17.5
    assert not r.isento_ir
    # 110% de 13.15 = 14.465% a.a. bruto; líquido ~11.9%
    assert 110 < r.rendimento_liquido < 130
    assert r.valor_final == 1000 + r.rendimento_liquido


def test_lci_isenta_ir():
    req = SimulacaoRequest(
        valor=1000, prazo_dias=365, tipo=TipoInvestimento.LCI,
        indexador=Indexador.CDI, taxa=93,
    )
    r = simular(req, cdi_aa=13.15, ipca_12m=4.5)
    assert r.isento_ir
    assert r.imposto_renda == 0
    assert r.aliquota_ir == 0


def test_iof_em_resgate_curto():
    req = SimulacaoRequest(
        valor=1000, prazo_dias=10, tipo=TipoInvestimento.CDB,
        indexador=Indexador.CDI, taxa=100,
    )
    r = simular(req, cdi_aa=13.15, ipca_12m=4.5)
    assert r.iof > 0
    assert r.rendimento_liquido < r.rendimento_bruto
