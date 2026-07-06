from fastapi import APIRouter, HTTPException

from app.models.schemas import SimulacaoRequest, SimulacaoResponse
from app.services import bcb, calculator

router = APIRouter(prefix="/api/simular", tags=["simulacao"])


@router.post("", response_model=SimulacaoResponse)
async def simular(req: SimulacaoRequest):
    try:
        cdi = await bcb.get_cdi_aa()
        ipca = await bcb.get_ipca_12m()
    except bcb.BCBError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return calculator.simular(req, cdi_aa=cdi, ipca_12m=ipca)
