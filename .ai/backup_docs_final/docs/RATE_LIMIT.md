> Scope: reference guidance and illustrative designs. External tools, MCP servers and commands mentioned below are not installed or registered by this kit. Verify prerequisites and implementation before use. Current runtime contracts: [ARCHITECTURE](ARCHITECTURE.md), [API_REFERENCE](API_REFERENCE.md). Reviewed scope: 2026-11-03.

# Rate Limit Server

Serviço FastAPI para rate limiting distribuído com múltiplos algoritmos e camadas de proteção.

## Visão Geral

O Rate Limit Server fornece uma API REST para controle de taxa de requisições, protegendo diferentes camadas da aplicação:

| Camada | Algoritmo | Limite | Janela | Uso |
|--------|-----------|--------|--------|-----|
| `global` | Sliding Window | 300 req/min | 60s | Proteção de borda por IP |
| `api` | Sliding Window | 100 req/min | 60s | API autenticada por usuário |
| `ai` | Token Bucket | 10/min + burst 20 | 60s | Rotas de geração IA |
| `auth` | Sliding Window | 5/15min | 900s | Login, registro, reset senha |
| `login_ip` | Sliding Window | 5/15min | 900s | Tentativas de login por IP |
| `login_account` | Sliding Window | 5/15min | 900s | Tentativas de login por conta |

## Instalação

```bash
cd .ai/src/rate_limit
pip install fastapi uvicorn pydantic redis
```

Ou adicione ao `requirements.txt` do projeto principal.

## Executando

```bash
# Desenvolvimento
python -m src.rate_limit.server

# Produção
uvicorn src.rate_limit.server:app --host 0.0.0.0 --port 8080 --workers 4
```

## Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `RATE_LIMIT_HOST` | `0.0.0.0` | Host do servidor |
| `RATE_LIMIT_PORT` | `8080` | Porta do servidor |
| `REDIS_URL` | - | URL do Redis (opcional, usa in-memory se não definido) |
| `UPSTASH_REDIS_REST_URL` | - | URL REST do Upstash Redis (alternativa) |
| `REDIS_HOST` | `localhost` | Host do Redis |
| `REDIS_PORT` | `6379` | Porta do Redis |
| `REDIS_DB` | `0` | Database do Redis |
| `REDIS_PASSWORD` | - | Senha do Redis |
| `REDIS_SSL` | `false` | Usar SSL |

## Endpoints

### Health Check

```http
GET /health
```

Resposta:
```json
{
  "status": "healthy",
  "backend": "memory",
  "redis_connected": false,
  "limiters": ["global", "api", "ai", "auth", "login_ip", "login_account"]
}
```

### Configuração

```http
GET /config                    # Todas as configurações
GET /config/{layer}            # Configuração específica
```

Exemplo resposta:
```json
[
  {
    "layer": "ai",
    "algorithm": "token_bucket",
    "max_requests": 10,
    "window_seconds": 60,
    "burst_allowance": 10,
    "prefix": "rl:ai"
  }
]
```

### Verificação de Rate Limit

```http
POST /check
Content-Type: application/json

{
  "identifier": "user:123",
  "layer": "api",
  "cost": 1,
  "algorithm": "sliding_window",
  "max_requests": 100,
  "window_seconds": 60,
  "burst_allowance": 0
}
```

Resposta:
```json
{
  "success": true,
  "limit": 100,
  "remaining": 99,
  "reset_time": 1793660411,
  "retry_after": 0,
  "metadata": {"algorithm": "sliding_window", "weighted_count": 0},
  "headers": {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "99",
    "X-RateLimit-Reset": "1793660411"
  }
}
```

### Verificação Multi-Layer (recomendado para produção)

```http
POST /check/multi
Content-Type: application/json

{
  "checks": {
    "global": "ip:192.168.1.1",
    "api": "user:123",
    "ai": "user:123"
  },
  "cost": 1
}
```

Resposta:
```json
{
  "results": {
    "global": {"success": true, "limit": 300, "remaining": 299, ...},
    "api": {"success": true, "limit": 100, "remaining": 99, ...},
    "ai": {"success": true, "limit": 20, "remaining": 19, ...}
  },
  "allowed": true,
  "blocking_layer": null
}
```

### Status sem Consumir

```http
POST /check/status
Content-Type: application/json

{
  "identifier": "user:123",
  "layer": "api"
}
```

### Middleware Check (para integração Express/Node)

```http
POST /middleware/check
Content-Type: application/json

{
  "layer": "global",
  "identifier": "ip:192.168.1.100",
  "cost": 1
}
```

Retorna apenas headers para adicionar à resposta:
```json
{
  "allowed": true,
  "headers": {
    "X-RateLimit-Limit": "300",
    "X-RateLimit-Remaining": "299",
    "X-RateLimit-Reset": "1793660411"
  },
  "retry_after": 0,
  "limit": 300,
  "remaining": 299,
  "reset": 1793660411
}
```

### Admin

```http
# Reset de limite para um identificador
DELETE /admin/reset/{layer}/{identifier}

# Estatísticas de uso (requer Redis)
GET /admin/stats/{layer}/{identifier}
```

## Integração com Express/Node.js

```javascript
const axios = require('axios');

async function rateLimitMiddleware(req, res, next) {
  const identifier = req.ip || 'unknown';
  
  try {
    const response = await axios.post('http://localhost:8080/middleware/check', {
      layer: 'global',
      identifier: `ip:${identifier}`,
      cost: 1
    });
    
    // Adiciona headers à resposta
    Object.entries(response.data.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    if (!response.data.allowed) {
      return res.status(429).json({
        error: 'rate_limited',
        message: `Rate limit exceeded. Try again in ${response.data.retry_after} seconds.`,
        retry_after: response.data.retry_after
      });
    }
    
    next();
  } catch (error) {
    // Em caso de erro no rate limiter, permite a requisição (fail-open)
    console.error('Rate limit check failed:', error.message);
    next();
  }
}

app.use('/api', rateLimitMiddleware);
```

## Integração com Python/FastAPI

```python
from src.rate_limit import get_rate_limiter_manager, rate_limit_dependency
from fastapi import Depends, FastAPI

app = FastAPI()

# Dependency injection
@app.post("/api/ai/generate")
async def generate(request: Request, _=Depends(rate_limit_dependency("ai"))):
    return {"result": "generated content"}

# Ou uso direto
@app.post("/api/ai/chat")
async def chat(request: Request):
    manager = get_rate_limiter_manager()
    identifier = extract_user_identifier(request)  # ou request.client.host
    result = await manager.get_limiter('ai').limit(identifier)
    
    if not result.success:
        raise HTTPException(429, detail="Rate limited")
    
    return {"result": "chat response"}
```

## Algoritmos

### Token Bucket (camada `ai`)
Permite bursts controlados mantendo taxa sustentada.
- Capacidade = `max_requests + burst_allowance` (20 para AI)
- Refil = `max_requests / window_seconds` tokens/segundo
- Ideal para operações custosas de IA

### Sliding Window (camadas `global`, `api`, `auth`)
Janela deslizante suave sem picos nos limites.
- Contagem ponderada entre janela atual e anterior
- Mais preciso que fixed window

### Fixed Window (fallback)
Janela fixa simples, pode permitir bursts nas bordas.

## Backend Redis (produção)

Para produção, configure Redis para rate limiting distribuído:

```bash
export REDIS_URL="redis://localhost:6379/0"
# ou Upstash
export UPSTASH_REDIS_REST_URL="https://..."
export REDIS_PASSWORD="..."
```

O backend Redis usa:
- **Sorted Sets** para Sliding Window (timestamps como scores)
- **Hash Maps** para Token Bucket (estado do bucket)

## Testes

```bash
# Testes do servidor
cd .ai
python -m pytest tests/rate_limit/ -v

# Todos os testes Python
python -m pytest tests/ -v
```

## Monitoramento

Headers padrão retornados:
- `X-RateLimit-Limit`: Limite máximo
- `X-RateLimit-Remaining`: Requisições restantes
- `X-RateLimit-Reset`: Timestamp Unix de reset
- `Retry-After`: Segundos até próxima requisição permitida (apenas em 429)

## Métricas Prometheus (futuro)

```prometheus
# HELP rate_limit_requests_total Total de requisições verificadas
# TYPE rate_limit_requests_total counter
rate_limit_requests_total{layer="api",result="allowed"} 1234
rate_limit_requests_total{layer="ai",result="blocked"} 56

# HELP rate_limit_remaining Requisições restantes atuais
# TYPE rate_limit_remaining gauge
rate_limit_remaining{layer="api",identifier="user:123"} 89
```