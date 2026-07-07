from fastapi import APIRouter, HTTPException, Query

from app.services import yubb

router = APIRouter(prefix="/api/ofertas", tags=["ofertas"])

TIPOS_VALIDOS = {"cdb", "lci", "lca"}


@router.get("")
async def listar_ofertas(
    valor: float = Query(1000.0, gt=0, description="Valor a investir em R$"),
    prazo_meses: int = Query(12, gt=0, le=120, description="Vencimento em ATÉ N meses"),
    tipo: str | None = Query(None, description="cdb, lci ou lca (vazio = todos)"),
    emissor: str | None = Query(None, description="Filtra por banco emissor ou distribuidor (ex: inter)"),
    paginas: int = Query(3, ge=1, le=10, description="Páginas do Yubb a varrer (12 ofertas/página)"),
):
    if tipo and tipo.lower() not in TIPOS_VALIDOS:
        raise HTTPException(status_code=422, detail=f"tipo deve ser um de {sorted(TIPOS_VALIDOS)}")
    try:
        ofertas = await yubb.buscar_ofertas_ate(
            principal=valor,
            meses_max=prazo_meses,
            tipo=tipo.lower() if tipo else None,
            paginas=paginas,
        )
    except yubb.YubbError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if emissor:
        ofertas = yubb.filtrar_por_emissor(ofertas, emissor)

    return {"total": len(ofertas), "ofertas": ofertas}
