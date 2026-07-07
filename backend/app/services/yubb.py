"""Scraper do Yubb — ofertas reais de renda fixa (CDB, LCI, LCA...).

O Yubb renderiza os resultados no servidor. O Cloudflare do site bloqueia
o fingerprint TLS de clientes Python (httpx/requests → 403), mas aceita o
curl do sistema — por isso o fetch é feito via subprocess curl.
"""

import asyncio
import re
import time
import unicodedata
from datetime import date
from urllib.parse import urlencode

from bs4 import BeautifulSoup

SEARCH_URL = "https://yubb.com.br/investimentos/renda-fixa"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)

_CACHE_TTL_SECONDS = 1800
_cache: dict[str, tuple[float, list[dict]]] = {}


class YubbError(Exception):
    pass


async def _curl_get(url: str) -> tuple[int, str]:
    """GET via curl do sistema — o Cloudflare do Yubb aceita o TLS do curl."""
    proc = await asyncio.create_subprocess_exec(
        "curl", "-s", "-L", "--max-time", "30",
        "-w", "\n%{http_code}",
        "-H", f"User-Agent: {USER_AGENT}",
        "-H", "Accept: text/html,application/xhtml+xml",
        "-H", "Accept-Language: pt-BR,pt;q=0.9",
        url,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.DEVNULL,
    )
    stdout, _ = await proc.communicate()
    if proc.returncode != 0:
        raise YubbError(f"curl falhou (exit {proc.returncode})")
    body, _, status = stdout.decode("utf-8", errors="replace").rpartition("\n")
    return int(status.strip() or 0), body


def _slug(texto: str) -> str:
    """Normaliza para comparação: minúsculas, sem acento."""
    nfkd = unicodedata.normalize("NFKD", texto)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def _parse_moeda(texto: str) -> float | None:
    m = re.search(r"([\d.]+),(\d{2})", texto)
    if not m:
        return None
    return float(m.group(1).replace(".", "") + "." + m.group(2))


def _parse_card(article) -> dict | None:
    dados: dict = {}

    titulo = article.select_one("h3 strong")
    dados["nome"] = titulo.get_text(strip=True) if titulo else None

    badge = article.select_one("h4.badge")
    dados["tipo"] = badge.get_text(strip=True) if badge else None

    fgc = article.select_one(".certification__tag")
    dados["fgc"] = bool(fgc and "FGC" in fgc.get_text())

    liquido = article.select_one(".results__netReturn big")
    dados["valor_liquido_estimado"] = (
        _parse_moeda(liquido.get_text()) if liquido else None
    )

    bruto = article.select_one(".results__grossYield big")
    dados["rentabilidade"] = bruto.get_text(" ", strip=True) if bruto else None

    for row in article.select("section table tr"):
        th = row.find("th")
        td = row.find("td")
        if not th or not td:
            continue
        chave = _slug(th.get_text())
        valor = td.get_text(strip=True)
        if "rentabilidade liquida" in chave:
            m = re.search(r"([\d.]+),(\d+)", valor)
            dados["rentabilidade_liquida_aa_pct"] = (
                float(m.group(1).replace(".", "") + "." + m.group(2)) if m else None
            )
        elif "investimento minimo" in chave:
            dados["investimento_minimo"] = _parse_moeda(valor)
        elif "prazo de resgate" in chave:
            dados["vencimento"] = valor
        elif "distribuidor" in chave:
            dados["distribuidor"] = valor
        elif "emissor" in chave:
            dados["emissor"] = valor

    link = article.select_one("a[href*='/investimentos/']")
    dados["url"] = f"https://yubb.com.br{link['href']}" if link else None

    if not dados.get("nome") or not dados.get("emissor"):
        return None
    return dados


def parse_html(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    ofertas = []
    for article in soup.select("article.investmentCard"):
        card = _parse_card(article)
        if card:
            ofertas.append(card)
    return ofertas


async def buscar_ofertas(
    principal: float = 1000.0,
    meses: int = 12,
    tipo: str | None = None,
    paginas: int = 3,
) -> list[dict]:
    """Busca ofertas reais no Yubb. `tipo`: cdb, lci, lca ou None (todos)."""
    cache_key = f"{principal}:{meses}:{tipo}:{paginas}"
    now = time.monotonic()
    if cache_key in _cache:
        ts, data = _cache[cache_key]
        if now - ts < _CACHE_TTL_SECONDS:
            return data

    ofertas: list[dict] = []
    for page in range(1, paginas + 1):
        params = {
            "investment_type": tipo or "renda-fixa",
            "months": meses,
            "principal": f"{principal:.1f}",
            "show_initial_loading": "false",
            "sort_by": "net_return",
            "page": page,
        }
        status, html = await _curl_get(f"{SEARCH_URL}?{urlencode(params)}")
        if status != 200:
            if page == 1:
                raise YubbError(f"Yubb retornou HTTP {status}")
            break
        cards = parse_html(html)
        if not cards:
            break
        ofertas.extend(cards)

    # Dedup: a mesma oferta pode repetir entre páginas
    vistos: set[str] = set()
    unicos = []
    for o in ofertas:
        chave = o.get("url") or f"{o['nome']}|{o.get('distribuidor')}|{o.get('vencimento')}"
        if chave not in vistos:
            vistos.add(chave)
            unicos.append(o)
    ofertas = unicos

    _cache[cache_key] = (now, ofertas)
    return ofertas


def _dias_ate(vencimento: str | None) -> int | None:
    """Dias corridos até um vencimento 'dd/mm/aaaa'."""
    if not vencimento:
        return None
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", vencimento)
    if not m:
        return None
    alvo = date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
    return (alvo - date.today()).days


# Faixas de prazo consultadas no Yubb para cobrir "até N meses"
_FAIXAS_MESES = [1, 2, 3, 6, 9, 12, 18, 24, 36, 48, 60]


async def buscar_ofertas_ate(
    principal: float = 1000.0,
    meses_max: int = 12,
    tipo: str | None = None,
    paginas: int = 3,
) -> list[dict]:
    """Ofertas com vencimento em ATÉ `meses_max` meses.

    O Yubb só busca por prazo exato (months=N), então consultamos várias
    faixas em paralelo, juntamos e filtramos pelo vencimento real.
    """
    faixas = sorted({m for m in _FAIXAS_MESES if m < meses_max} | {meses_max})
    resultados = await asyncio.gather(
        *(buscar_ofertas(principal, m, tipo, paginas) for m in faixas),
        return_exceptions=True,
    )

    ofertas: list[dict] = []
    erros = [r for r in resultados if isinstance(r, BaseException)]
    for r in resultados:
        if not isinstance(r, BaseException):
            ofertas.extend(r)
    if not ofertas and erros:
        raise erros[0] if isinstance(erros[0], YubbError) else YubbError(str(erros[0]))

    # Dedup entre faixas + filtro pelo vencimento real (tolerância de 20 dias)
    limite_dias = round(meses_max * 30.44) + 20
    vistos: set[str] = set()
    unicos = []
    for o in ofertas:
        chave = o.get("url") or f"{o['nome']}|{o.get('distribuidor')}|{o.get('vencimento')}"
        if chave in vistos:
            continue
        vistos.add(chave)
        dias = _dias_ate(o.get("vencimento"))
        if dias is not None and dias > limite_dias:
            continue
        o["dias_ate_vencimento"] = dias
        unicos.append(o)
    return unicos


def filtrar_por_emissor(ofertas: list[dict], emissor: str) -> list[dict]:
    alvo = _slug(emissor)
    return [
        o for o in ofertas
        if alvo in _slug(o.get("emissor", "")) or alvo in _slug(o.get("distribuidor", ""))
    ]
