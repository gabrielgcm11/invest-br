from app.models.schemas import Indexador, ProdutoComparacao, TipoInvestimento
from app.services.compare import comparar, equivalencia_cdb

CDI = 14.15
IPCA = 4.72
SELIC = 14.25
TR = 0.17


def _produtos():
    return [
        ProdutoComparacao(rotulo="CDB 100% CDI", tipo=TipoInvestimento.CDB, indexador=Indexador.CDI, taxa=100),
        ProdutoComparacao(rotulo="LCA 91% CDI", tipo=TipoInvestimento.LCA, indexador=Indexador.CDI, taxa=91),
    ]


def _resultado(meses=24):
    return comparar(
        produtos=_produtos(), valor=1000, meses_max=meses,
        cdi_aa=CDI, ipca_12m=IPCA, selic_aa=SELIC, tr_mensal=TR,
        incluir_poupanca=True,
    )


def test_series_tem_produtos_e_poupanca():
    r = _resultado()
    rotulos = [s["rotulo"] for s in r["series"]]
    assert rotulos == ["CDB 100% CDI", "LCA 91% CDI", "Poupança"]
    assert all(len(s["pontos"]) == 24 for s in r["series"])


def test_lca_91_vence_cdb_100_em_todas_as_faixas():
    # 91 isento > 100 × (1 − IR) em qualquer faixa (pior caso: 100 × 0,85 = 85)
    r = _resultado()
    cdb, lca = r["series"][0], r["series"][1]
    for p_cdb, p_lca in zip(cdb["pontos"], lca["pontos"]):
        assert p_lca["valor"] > p_cdb["valor"]


def test_poupanca_perde_de_ambos():
    r = _resultado()
    poupanca = r["series"][2]
    cdb = r["series"][0]
    assert poupanca["pontos"][-1]["valor"] < cdb["pontos"][-1]["valor"]


def test_poupanca_regra_selic_alta():
    # Selic 14,25% > 8,5% → 0,5% a.m. + TR → ~6,2% a.a. + TR
    r = _resultado(meses=12)
    poupanca = r["series"][2]["pontos"][-1]
    assert 1060 < poupanca["valor"] < 1100


def test_degraus_ir_na_serie_do_cdb():
    r = _resultado()
    aliquotas = {p["aliquota_ir"] for p in r["series"][0]["pontos"]}
    assert aliquotas == {22.5, 20.0, 17.5, 15.0}


def test_equivalencia_cdb():
    faixas = equivalencia_cdb(91)
    assert faixas[0]["cdb_equivalente"] == 117.4  # 91 / 0,775
    assert faixas[-1]["cdb_equivalente"] == 107.1  # 91 / 0,85


def test_equivalencias_so_para_isentos():
    r = _resultado()
    assert [e["rotulo"] for e in r["equivalencias"]] == ["LCA 91% CDI"]
