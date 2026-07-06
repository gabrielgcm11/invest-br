from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import rates, simulate

app = FastAPI(
    title="invest-br API",
    description="Comparador de investimentos em renda fixa com dados reais do BCB",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rates.router)
app.include_router(simulate.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
