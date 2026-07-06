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
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Dados:** BCB API (oficial), Yubb (scraping)
