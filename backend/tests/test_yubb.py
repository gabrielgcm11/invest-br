from datetime import date, timedelta
from pathlib import Path

from app.services.yubb import _dias_ate, filtrar_por_emissor, parse_html

FIXTURE = Path(__file__).parent / "fixtures" / "yubb_cdb_sample.html"


def _ofertas():
    return parse_html(FIXTURE.read_text(encoding="utf-8"))


def test_parse_extrai_12_cards():
    ofertas = _ofertas()
    assert len(ofertas) == 12


def test_campos_essenciais_presentes():
    for o in _ofertas():
        assert o["nome"]
        assert o["emissor"]
        assert o["tipo"] == "CDB"
        assert o["rentabilidade_liquida_aa_pct"] is not None
        assert o["investimento_minimo"] is not None
        assert o["url"] and o["url"].startswith("https://yubb.com.br/")


def test_filtro_por_emissor_case_insensitive():
    ofertas = _ofertas()
    bs2 = filtrar_por_emissor(ofertas, "bs2")
    assert bs2
    assert all("bs2" in o["emissor"].lower() or "bs2" in o["distribuidor"].lower() for o in bs2)


def test_filtro_emissor_inexistente_retorna_vazio():
    assert filtrar_por_emissor(_ofertas(), "banco-que-nao-existe") == []


def test_dias_ate_vencimento():
    alvo = date.today() + timedelta(days=90)
    assert _dias_ate(alvo.strftime("%d/%m/%Y")) == 90
    assert _dias_ate("sem data") is None
    assert _dias_ate(None) is None
