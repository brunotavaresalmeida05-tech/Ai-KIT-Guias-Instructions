# Recipe #19: DevOps & Deployment

Complete DevOps strategy com CI/CD, containerization, orchestration e monitoring.

---

## 🎯 Objetivos

- ✅ Automated CI/CD pipeline
- ✅ Docker containerization
- ✅ Kubernetes orchestration
- ✅ Blue-green deployment
- ✅ Monitoring & alerting
- ✅ Disaster recovery

---

## 📋 Stack

| Componente | Tool |
|-----------|------|
| CI/CD | GitHub Actions / GitLab CI |
| Containerization | Docker |
| Orchestration | Kubernetes |
| Container Registry | Docker Hub / ECR |
| Monitoring | Prometheus + Grafana |
| Logging | ELK Stack |
| Tracing | Jaeger |

---

## 🔨 Dockerfile

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar arquivos
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Build
RUN npm ci --only=production && \
    npm run build

# Runtime
FROM node:18-alpine

WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node healthcheck.js || exit 1

# Copiar built app
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs .env.production .env

# Security
USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**Build & Push**
```bash
# Build image
docker build -t myapp:1.0.0 .

# Tag for registry
docker tag myapp:1.0.0 docker.io/username/myapp:1.0.0

# Push to registry
docker push docker.io/username/myapp:1.0.0

# Verify
docker run -p 3000:3000 myapp:1.0.0
```

---

## 🐳 Docker Compose (Production)

```yaml
version: '3.9'

services:
  api:
    image: myapp:${VERSION}
    container_name: api-prod
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://user:${DB_PASS}@postgres:5432/prod
      REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    networks:
      - backend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    container_name: postgres-prod
    restart: always
    environment:
      POSTGRES_DB: prod
      POSTGRES_PASSWORD: ${DB_PASS}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: redis-prod
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - backend
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    container_name: nginx-prod
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    networks:
      - backend
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:

networks:
  backend:
    driver: bridge
```

---

## ☸️ Kubernetes Deployment

**Namespace & ConfigMap**
```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
data:
  NODE_ENV: production
  LOG_LEVEL: info
  API_PORT: "3000"
```

**Deployment**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
        version: "1.0.0"
    spec:
      # Security context
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsReadOnlyRootFilesystem: true
      
      containers:
      - name: api
        image: docker.io/username/myapp:1.0.0
        imagePullPolicy: IfNotPresent
        
        ports:
        - containerPort: 3000
          name: http
          protocol: TCP
        
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        
        # Resource limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        # Volume mounts
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: logs
          mountPath: /app/logs
      
      volumes:
      - name: tmp
        emptyDir: {}
      - name: logs
        emptyDir: {}
      
      # Pod disruption budget
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - api
              topologyKey: kubernetes.io/hostname
```

**Service & Ingress**
```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 80
```

**Deploy to K8s**
```bash
# Apply namespace first
kubectl apply -f namespace.yaml

# Create secrets
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_URL='postgresql://...' \
  -n production

# Deploy
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml

# Verify
kubectl get pods -n production
kubectl get svc -n production
kubectl logs -f deployment/api -n production

# Scale
kubectl scale deployment api --replicas=5 -n production
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install deps
      run: npm ci
    
    - name: Lint
      run: npm run lint
    
    - name: Build
      run: npm run build
    
    - name: Test
      run: npm test -- --coverage
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Set version
      run: echo "VERSION=$(git rev-parse --short HEAD)" >> $GITHUB_ENV
    
    - name: Build image
      run: docker build -t myapp:${{ env.VERSION }} .
    
    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker tag myapp:${{ env.VERSION }} username/myapp:${{ env.VERSION }}
        docker tag myapp:${{ env.VERSION }} username/myapp:latest
        docker push username/myapp:${{ env.VERSION }}
        docker push username/myapp:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to K8s
      run: |
        mkdir -p $HOME/.kube
        echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config
        
        kubectl set image deployment/api \
          api=username/myapp:${{ github.sha }} \
          -n production
        
        kubectl rollout status deployment/api -n production
```

---

## 🚀 Blue-Green Deployment

```bash
#!/bin/bash
# deploy-blue-green.sh

CURRENT=$(kubectl get service api -o jsonpath='{.spec.selector.version}' -n production)
NEW="v2"

echo "Current: $CURRENT"
echo "New: $NEW"

# Deploy nova versão
kubectl set image deployment/api-$NEW api=myapp:$NEW -n production
kubectl rollout status deployment/api-$NEW -n production

# Switch traffic
kubectl patch service api -n production \
  -p '{"spec":{"selector":{"version":"'$NEW'"}}}'

echo "Deployment complete!"

# Rollback se necessário
# kubectl patch service api -n production \
#   -p '{"spec":{"selector":{"version":"'$CURRENT'"}}}'
```

---

## 📊 Monitoring & Alerting

**Prometheus Rules**
```yaml
# prometheus-rules.yaml
groups:
- name: api
  interval: 30s
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate (5xx)"
      
  - alert: HighLatency
    expr: histogram_quantile(0.99, http_request_duration_seconds) > 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency (p99 > 1s)"
      
  - alert: HighMemory
    expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Memory usage > 90%"
```

---

## 🔒 Security Checklist

- [ ] HTTPS/TLS configurado
- [ ] Secrets em env variables (não hardcoded)
- [ ] Rate limiting ativo
- [ ] CORS configurado
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Security headers (CSP, HSTS, etc)
- [ ] Authentication & authorization
- [ ] Logging & monitoring ativo
- [ ] Regular backups
- [ ] Disaster recovery plan
- [ ] Security scanning (dependências)

---

## 🔗 Próximos Passos

1. [Recipe #20: Production Checklist](recipe-20-production-checklist.md)
2. [PERFORMANCE_TUNING.md](../docs/PERFORMANCE_TUNING.md)
3. [ARCHITECTURE.md](../docs/ARCHITECTURE.md)
