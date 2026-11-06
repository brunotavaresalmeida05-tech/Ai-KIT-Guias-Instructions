# Kubernetes templates

These manifests require environment-specific configuration and cluster validation.
They are not a verified production deployment. Prefer the local runtime Quickstart
unless Kubernetes is a requirement of your project.

For an existing local Kind cluster named `ai-kit-dev`, select its context, copy
`secret.yaml` to ignored `secret.local.yaml`, replace all placeholders (API_KEY must
be a random secret of at least 32 characters), and run `bash dev-deploy.sh`.
The script builds the runtime Dockerfile, deploys PostgreSQL with pgvector, then
 the API. It does not install tools or publish an image.

The runtime uses PostgreSQL here. Redis, HPA and ingress are optional templates;
the local script does not apply them. Before production, configure an immutable
image, TLS/domain, secret manager, backups and restore, resource limits, network
policies and externally verified exposure. The runtime does not trust forwarded
client addresses by default. Rate limiting is per process, so a multi-replica
deployment needs an external limiter.

The ingress example references a domain, certificate issuer and client TLS secret
that must exist in your cluster. Do not apply it unchanged. Never put real credentials
in tracked secret.yaml. See ../docs/SECURITY.md for the application boundary.

Last updated: 2026-11-03.
