# invest-br

Gestor de investimentos em renda fixa para o mercado brasileiro.

## Funcionalidades

- Comparação de CDB, LCI, LCA e Tesouro Direto
- Dados reais via BCB API e Yubb
- Filtro por banco/corretora (Inter, Nubank, XP, BTG...)
- Cálculo de rendimento líquido com IR regressivo e IOF
- Recomendação por perfil (liquidez, prazo, retorno)

## Estrutura

```
invest-br/
├── backend/    # FastAPI + Python
├── frontend/   # Next.js
└── docs/       # Documentação
```

## Stack

- **Backend:** Python 3.11+, FastAPI, httpx, BeautifulSoup
- **Frontend:** Next.js 16, TypeScript, Tailwind CSS v4
- **Dados:** BCB API (oficial), Yubb (scraping)

## Rodar localmente

```bash
# Backend (porta 8000)
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/uvicorn app.main:app --port 8000

# Frontend (porta 3000)
cd frontend
npm install
npm run dev
```

Abra http://localhost:3000.
