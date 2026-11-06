> Scope: reference guidance and illustrative designs. External tools, MCP servers and commands mentioned below are not installed or registered by this kit. Verify prerequisites and implementation before use. Current runtime contracts: [ARCHITECTURE](ARCHITECTURE.md), [API_REFERENCE](API_REFERENCE.md). Reviewed scope: 2026-11-03.

# Performance Tuning

Guia completo de otimização de performance para o AI Development System.

---

## 🎯 Benchmarks de Baseline

| Operação | Esperado | Crítico |
|----------|----------|---------|
| Workflow paralelo (10 tasks) | 100-150ms | <500ms |
| Memory search (50k records) | 50-80ms | <200ms |
| Skill execution | 10-20ms | <100ms |
| Event ingest | 5-10ms | <50ms |
| API request (GET) | 20-50ms | <200ms |

---

## 📊 Profiling

### Node.js Built-in Profiler

```bash
# Gerar perfil
node --prof app.js
# Deixar rodando 30 segundos
# Pressionar Ctrl+C

# Processar resultado
node --prof-process isolate-*.log > profile.txt
cat profile.txt | head -50
```

### Clinic.js (Recomendado)

```bash
npm install -g clinic

# Doctor (recomendação automática)
clinic doctor -- npm start

# Flamegraph
clinic flamegraph -- npm start

# Bubbleprof (I/O analysis)
clinic bubbleprof -- npm start
```

---

## ⚡ Otimizações Core

### 1. Caching Strategy

**In-Memory Cache (L1)**
```typescript
class MemoryCache {
  private cache = new Map();
  private ttls = new Map();

  set(key: string, value: any, ttl: number = 300000) {
    this.cache.set(key, value);
    
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key));
    }
    
    const timeout = setTimeout(() => {
      this.cache.delete(key);
      this.ttls.delete(key);
    }, ttl);
    
    this.ttls.set(key, timeout);
  }

  get(key: string) {
    return this.cache.get(key);
  }
}
```

**Redis Cache (L2)**
```typescript
// Setup com pool
const redisPool = redis.createPool({
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Multi-tenant key strategy
const key = `${tenantId}:${feature}:${id}`;

// Batch operations
const pipeline = client.pipeline();
pipeline.get(key1);
pipeline.get(key2);
pipeline.get(key3);
const results = await pipeline.exec();

// TTL strategy
await redis.setex(key, 3600, value);  // 1 hour
```

---

### 2. Database Optimization

**Connection Pooling**
```typescript
const pool = new Pool({
  max: 20,                    // Máximo de conexões
  min: 5,                     // Mínimo
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  queryTimeoutMillis: 10000,
});
```

**Index Strategy**
```sql
-- Most used queries
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);
CREATE INDEX idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_events_source_type ON events(source, type);

-- Composite indices
CREATE INDEX idx_user_session 
  ON sessions(user_id, created_at DESC);

-- Partial index for active records
CREATE INDEX idx_workflows_active 
  ON workflows(created_at DESC) 
  WHERE status != 'archived';
```

**Query Optimization**
```typescript
// ❌ N+1 Problem
const workflows = await db.query('SELECT * FROM workflows');
for (const w of workflows) {
  w.tasks = await db.query('SELECT * FROM tasks WHERE workflow_id = ?', w.id);
}
// 1 + N queries

// ✅ Eager loading
const workflows = await db.query(`
  SELECT w.*, t.* 
  FROM workflows w
  LEFT JOIN tasks t ON w.id = t.workflow_id
  ORDER BY w.id
`);
const grouped = groupBy(workflows, 'id');

// ✅ Batch loading
const tasksByWorkflow = await db.query(`
  SELECT workflow_id, * 
  FROM tasks 
  WHERE workflow_id IN (?)
`, [workflowIds]);
```

---

### 3. API Response Optimization

**Compression**
```typescript
import compression from 'compression';

app.use(compression({
  level: 6,              // 1-9, default 6
  threshold: 1024,       // Comprimir se > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Resultado: 100KB → 15KB (85% redução)
```

**Pagination**
```typescript
// ❌ Trazer tudo
SELECT * FROM workflows;

// ✅ Paginar
SELECT * FROM workflows
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

// ✅ Cursor-based (mais eficiente)
SELECT * FROM workflows
WHERE created_at < $cursor
ORDER BY created_at DESC
LIMIT 21;  // +1 para detectar mais
```

**Field Selection**
```typescript
// ❌ Trazer todos os campos
SELECT * FROM workflows;

// ✅ Trazer apenas necessários
SELECT id, name, status, created_at 
FROM workflows;

// ✅ Via GraphQL
query {
  workflows {
    id
    name
    status
  }
}
```

---

### 4. Elasticsearch Optimization

**Bulk Indexing**
```typescript
const bulk = [];
for (const item of items) {
  bulk.push({ index: { _index: 'memories' } });
  bulk.push(item);
}

// Em vez de N requests individuais
await es.bulk({ body: bulk });

// Performance: 1000 docs em 50ms (vs 5000ms individual)
```

**Query Optimization**
```typescript
// ❌ Busca lenta
GET /memories/_search
{
  "query": {
    "match": { "content": "JWT authentication" }
  }
}

// ✅ Com filter (cached)
GET /memories/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "content": "JWT" } }
      ],
      "filter": [
        { "term": { "type": "implementation" } }
      ]
    }
  }
}

// ✅ Com aggregations
GET /memories/_search
{
  "aggs": {
    "by_type": { "terms": { "field": "type" } }
  },
  "size": 0
}
```

---

### 5. Memory Management

**Avoid Memory Leaks**
```typescript
// ❌ Leak
const listeners = [];
event.on('data', (data) => {
  listeners.push(data);  // Crescimento infinito
});

// ✅ Limpar
const listeners = [];
event.on('data', (data) => {
  listeners.push(data);
  if (listeners.length > 1000) {
    listeners.shift();  // FIFO
  }
});

// ✅ Melhor: usar estrutura de dados com limite
const lru = new LRU({ max: 1000 });

// ❌ Listener leak
obj.on('event', handler);
// Nunca remover

// ✅ Remover listener
obj.once('event', handler);
// Ou
obj.removeListener('event', handler);
```

**Streaming para Grandes Datasets**
```typescript
// ❌ Trazer tudo em memória
const workflows = await db.query('SELECT * FROM workflows');
const json = JSON.stringify(workflows);

// ✅ Usar streams
const stream = fs.createReadStream('data.json');
stream.pipe(res);

// ✅ Com banco de dados
const query = db.query('SELECT * FROM workflows');
query.stream().pipe(res);
```

---

## 🔥 Hotspot Optimization

### Workflow Execution

```typescript
// Problema: Orchestrator lento
// Solução 1: Aumentar paralelismo
strategy: 'parallel',  // em vez de 'sequential'

// Solução 2: Limitar concorrência
maxConcurrency: 5,  // não deixar explodir

// Solução 3: Timeout agressivo
timeout: 10000,  // falhar rápido se travar

// Benchmark
const start = Date.now();
const result = await orchestrator.executeWorkflow(config);
const duration = Date.now() - start;
console.log(`Workflow took ${duration}ms`);
```

### Memory Search

```typescript
// Problema: Search lento em 100k+ records

// Solução 1: Adicionar índices
CREATE INDEX idx_type ON memories(type);
CREATE INDEX idx_embedding ON memories USING ivfflat (embedding);

// Solução 2: Usar filtros antes da busca
await memory.search({
  query: 'JWT',
  filters: { type: 'implementation' },  // Reduz dataset
  limit: 5,
  similarity: 0.7
});

// Solução 3: Pré-computar embeddings
// Armazenar durante store, não durante search

// Benchmark
console.time('search');
const results = await memory.search(...);
console.timeEnd('search');
```

---

## 🚀 Production Optimization

### Node.js Flags

```bash
# Aumentar heap (para aplicações com muita memória)
NODE_OPTIONS="--max-old-space-size=4096"

# Ativar experimental loader
NODE_OPTIONS="--loader ./esm-loader.mjs"

# Zero garbage collection pause
# (experimental, pode usar mais memória)
NODE_OPTIONS="--enable-source-maps"

# Ideal para produção
NODE_OPTIONS="--max-old-space-size=4096 --enable-source-maps"
```

### Clustering

```typescript
import cluster from 'cluster';
import os from 'os';

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  
  // Criar worker por CPU
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  // Restart se morrer
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Worker process
  app.listen(3000);
}

// Resultado: 4 cores → 4x throughput
```

### Load Balancing

```nginx
# nginx.conf
upstream api {
  server api1:3000 weight=1;
  server api2:3000 weight=1;
  server api3:3000 weight=1;
}

server {
  listen 80;
  location / {
    proxy_pass http://api;
    proxy_set_header Connection "upgrade";
  }
}
```

---

## 📈 Benchmarking

### Autocannon

```bash
npm install -g autocannon

# Simple
autocannon http://localhost:3000

# Customizado
autocannon \
  --connections 100 \
  --duration 30 \
  --pipelining 10 \
  http://localhost:3000/api/endpoint

# Result:
# Requests/sec: 1500+
# Latency p99: 50ms
```

### k6 (Load Testing)

```javascript
// load-test.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:3000/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
  });
}
```

```bash
k6 run load-test.js
```

---

## ✅ Checklist de Performance

- [ ] Indices criados em queries frequentes
- [ ] Caching implementado em L1 + L2
- [ ] Compression ativada
- [ ] Pagination em listas
- [ ] N+1 queries eliminadas
- [ ] Memory leaks testados
- [ ] Clustering ativado
- [ ] Load balancing configurado
- [ ] Benchmarks executados
- [ ] Alertas de performance configurados

---

## 📊 Monitoramento Contínuo

```typescript
// Auto-monitor slowness
setInterval(() => {
  const metrics = getMetrics();
  
  if (metrics.avgLatency > 200) {
    alert('API slow: ' + metrics.avgLatency + 'ms');
  }
  
  if (metrics.memoryUsage > 0.9) {
    alert('Memory high: ' + (metrics.memoryUsage * 100) + '%');
  }
  
  if (metrics.errorRate > 0.05) {
    alert('Error rate high: ' + (metrics.errorRate * 100) + '%');
  }
}, 60000);
```

---

## 🔗 Próximos Passos

- [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md) - Se houver problemas
- [ARCHITECTURE.md](ARCHITECTURE.md) - Entender design
- [API_REFERENCE.md](API_REFERENCE.md) - Referência completa
