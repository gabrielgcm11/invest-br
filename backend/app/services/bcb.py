"""Cliente para a API de séries temporais do Banco Central (SGS)."""

import time
from datetime import datetime, timezone

import httpx

BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/{n}?formato=json"

SGS_CDI_ANUAL = 4389   # Taxa DI anualizada base 252 (% a.a.)
SGS_SELIC_META = 432   # Meta Selic definida pelo Copom (% a.a.)
SGS_IPCA_MENSAL = 433  # IPCA variação mensal (%)
SGS_TR_MENSAL = 226    # Taxa Referencial (TR) mensal (%)

_CACHE_TTL_SECONDS = 3600
_cache: dict[str, tuple[float, object]] = {}


class BCBError(Exception):
    pass


async def _fetch_serie(codigo: int, n: int = 1) -> list[dict]:
    key = f"{codigo}:{n}"
    now = time.monotonic()
    if key in _cache:
        ts, data = _cache[key]
        if now - ts < _CACHE_TTL_SECONDS:
            return data  # type: ignore[return-value]

    url = BASE_URL.format(codigo=codigo, n=n)
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
    if resp.status_code != 200:
        raise BCBError(f"BCB SGS {codigo} retornou HTTP {resp.status_code}")
    data = resp.json()
    if not data:
        raise BCBError(f"BCB SGS {codigo} retornou vazio")
    _cache[key] = (now, data)
    return data


async def get_cdi_aa() -> float:
    data = await _fetch_serie(SGS_CDI_ANUAL)
    return float(data[-1]["valor"])


async def get_selic_aa() -> float:
    data = await _fetch_serie(SGS_SELIC_META)
    return float(data[-1]["valor"])


async def get_ipca_12m() -> float:
    data = await _fetch_serie(SGS_IPCA_MENSAL, n=12)
    acumulado = 1.0
    for item in data:
        acumulado *= 1 + float(item["valor"]) / 100
    return round((acumulado - 1) * 100, 2)


async def get_tr_mensal() -> float:
    data = await _fetch_serie(SGS_TR_MENSAL)
    return float(data[-1]["valor"])


async def get_taxas() -> dict:
    return {
        "cdi_aa": await get_cdi_aa(),
        "selic_aa": await get_selic_aa(),
        "ipca_12m": await get_ipca_12m(),
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
    }
