#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(kubectl config current-context)" != "kind-ai-kit-dev" ]]; then
  echo "Select the local kind-ai-kit-dev context first." >&2
  exit 1
fi
if [[ ! -f secret.local.yaml ]] || grep -q '<your-\|<generate-' secret.local.yaml; then
  echo "Create ignored secret.local.yaml from secret.yaml and replace every placeholder." >&2
  exit 1
fi
docker build -t ai-kit-api:dev ..
kind load docker-image ai-kit-api:dev --name ai-kit-dev
kubectl apply -f namespace.yaml
kubectl apply -f secret.local.yaml
kubectl apply -f configmap.yaml
kubectl apply -f postgres-configmap.yaml
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f postgres-service.yaml
kubectl rollout status statefulset/ai-kit-postgres -n ai-kit --timeout=120s
kubectl apply -f ai-kit-deployment.yaml
kubectl set image deployment/ai-kit-api ai-kit-api=ai-kit-api:dev -n ai-kit
kubectl apply -f ai-kit-service.yaml
kubectl rollout status deployment/ai-kit-api -n ai-kit --timeout=120s
echo 'Use kubectl port-forward service/ai-kit-api 3000:80 -n ai-kit for local access.'
