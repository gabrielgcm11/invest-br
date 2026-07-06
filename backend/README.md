# invest-br — backend

API FastAPI para simulação e comparação de renda fixa.

## Rodar

```bash
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Docs interativas: http://localhost:8000/docs

## Endpoints

| Método | Rota          | Descrição                                  |
|--------|---------------|--------------------------------------------|
| GET    | /health       | Healthcheck                                |
| GET    | /api/taxas    | CDI, Selic e IPCA 12m atuais (BCB)         |
| POST   | /api/simular  | Simula rendimento líquido de um produto    |

### Exemplo de simulação

```json
POST /api/simular
{
  "valor": 1000,
  "prazo_dias": 365,
  "tipo": "CDB",
  "indexador": "CDI",
  "taxa": 110
}
```
