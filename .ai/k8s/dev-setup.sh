#!/bin/bash
set -e

echo "=== Setup de Ambiente Local Kubernetes ==="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar Docker
echo "🔍 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado. Instale o Docker Desktop.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker não está rodando. Inicie o Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker está rodando${NC}"

# Verificar Kind
if ! command -v kind &> /dev/null; then
    echo "📦 Instalando Kind..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install kind
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        curl -Lo kind-windows-amd64.exe https://kind.sigs.k8s.io/dl/v0.20.0/kind-windows-amd64.exe
        mv kind-windows-amd64.exe /usr/local/bin/kind.exe
    else
        curl -Lo /usr/local/bin/kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
        chmod +x /usr/local/bin/kind
    fi
fi
echo -e "${GREEN}✓ Kind instalado${NC}"

# Verificar kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}⚠ kubectl não encontrado. Usando o do Docker Desktop.${NC}"
fi
echo -e "${GREEN}✓ kubectl disponível${NC}"

echo ""
echo "🚀 Criando cluster Kind..."

# Remover cluster existente
kind delete cluster --name ai-kit-dev 2>/dev/null || true

# Criar config do Kind
cat > kind-config.yaml <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  image: kindest/node:v1.28.0@sha256:51a1434a5397193442902f7bd9c50c037886a9047fa09672504d905e9407b8b1
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF

kind create cluster --name ai-kit-dev --config kind-config.yaml
echo -e "${GREEN}✓ Cluster criado${NC}"

# Configurar contexto
kubectl config use-context kind-ai-kit-dev
echo -e "${GREEN}✓ Contexto configurado${NC}"

# Instalar ingress controller
echo "📦 Instalando NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=120s
echo -e "${GREEN}✓ Ingress Controller instalado${NC}"

# Remover config temporária
rm -f kind-config.yaml

echo ""
echo -e "${GREEN}✅ Cluster Kind criado com sucesso!${NC}"
echo ""
echo "Próximos comandos:"
echo "  kubectl get nodes"
echo "  kubectl get pods -n ai-kit"
echo ""