#!/bin/bash

echo "=== Debug do Ambiente Kubernetes ==="
echo ""

# Verificar contexto
echo "📍 Contexto atual: $(kubectl config current-context)"
echo ""

# Verificar cluster
echo "🖥️  Nodes:"
kubectl get nodes -o wide
echo ""

# Verificar namespaces
echo "📦 Namespaces:"
kubectl get namespaces
echo ""

# Verificar pods do projeto
echo "🐳 Pods do ai-kit:"
kubectl get pods -n ai-kit -o wide
echo ""

# Verificar serviços
echo "🌐 Serviços:"
kubectl get svc -n ai-kit
echo ""

# Verificar eventos recentes
echo "📋 Últimos eventos:"
kubectl get events -n ai-kit --sort-by='.lastTimestamp' | tail -20
echo ""

# Verificar logs de pods com problemas
echo "📄 Logs dos pods (últimos 20 linhas):"
for pod in $(kubectl get pods -n ai-kit -o jsonpath='{.items[*].metadata.name}'); do
    echo "--- $pod ---"
    kubectl logs $pod -n ai-kit --tail=20 2>&1 || echo "Sem logs disponíveis"
    echo ""
done

# Verificar status de rollout
echo "📈 Rollout status:"
kubectl rollout status deployment/ai-kit-api -n ai-kit
echo ""

# Verificar ingress
echo "🔗 Ingress:"
kubectl get ingress -n ai-kit
echo ""

# Verificar HPA
echo "⚡ HPA:"
kubectl get hpa -n ai-kit
echo ""

# Verificar PV/PVC
echo "💾 Volumes:"
kubectl get pv,pvc -n ai-kit
echo ""

echo "=== Comandos úteis ==="
echo "kubectl logs -f <pod> -n ai-kit"
echo "kubectl exec -it <pod> -n ai-kit -- /bin/sh"
echo "kubectl describe pod <pod> -n ai-kit"
echo "kubectl port-forward svc/ai-kit-api -n ai-kit 8080:80"