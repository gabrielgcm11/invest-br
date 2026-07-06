from fastapi import APIRouter, HTTPException

from app.models.schemas import TaxasResponse
from app.services import bcb

router = APIRouter(prefix="/api/taxas", tags=["taxas"])


@router.get("", response_model=TaxasResponse)
async def taxas_atuais():
    try:
        return await bcb.get_taxas()
    except bcb.BCBError as e:
        raise HTTPException(status_code=502, detail=str(e))
