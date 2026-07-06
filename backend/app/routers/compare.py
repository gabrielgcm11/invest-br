from fastapi import APIRouter, HTTPException

from app.models.schemas import ComparacaoRequest
from app.services import bcb, compare

router = APIRouter(prefix="/api/comparar", tags=["comparacao"])


@router.post("")
async def comparar(req: ComparacaoRequest):
    try:
        cdi = await bcb.get_cdi_aa()
        ipca = await bcb.get_ipca_12m()
        selic = await bcb.get_selic_aa()
        tr = await bcb.get_tr_mensal()
    except bcb.BCBError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return compare.comparar(
        produtos=req.produtos,
        valor=req.valor,
        meses_max=req.meses_max,
        cdi_aa=cdi,
        ipca_12m=ipca,
        selic_aa=selic,
        tr_mensal=tr,
        incluir_poupanca=req.incluir_poupanca,
    )
