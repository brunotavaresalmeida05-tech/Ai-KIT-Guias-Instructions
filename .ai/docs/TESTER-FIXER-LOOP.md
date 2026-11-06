# Tester-Fixer Loop - Ciclo Completo de Teste-Correção

## Overview
Self-correcting development agent that runs tests, diagnoses failures, fixes code with minimal changes, and revalidates until all tests pass.

## The Cycle

```
┌────────────────┐
│ 1. Preparar     │ npm install, setup env
└────────┬────────┘
         ▼
┌────────────────┐
│ 2. Construir    │ npm run build, compile
└────────┬────────┘
         ▼
┌────────────────┐
│ 3. Testar       │ npm test, npm start
└────────┬────────┘
         ▼
    Passou? ──SIM─► ✓ APROVADO
         │NÃO
         ▼
┌──────────────────────┐
│ 4. Diagnosticar     │ Ler log, stack trace
└────────┬──────────────┘
         ▼
┌────────────────┐
│ 5. Corrigir     │ Alteração mínima
└────────┬────────┘
         ▼
┌────────────────┐
│ 6. Revalidar    │ Testar novamente
└────────┬────────┘
         ▼
      Repetir
```

## Componentes

| Componente | Função |
|------------|--------|
| **Executor** | Roda npm install, build, test, start |
| **Coletor** | Captura logs, erros, stack traces |
| **Analisador** | Interpreta falha, localiza causa |
| **Corretor** | Edita código com mudança mínima |
| **Git** | Branch/commit + rollback |
| **Limites** | Max 10 tentativas, não destrutivo |

## Configuração

```bash
# Máximo 10 tentativas por erro
.MAX_ATTEMPTS = 10

# Stop on critical errors
.STOP_ON_CREDENTIALS = true

# Never delete tests to pass
.RESPECT_TESTS = true
```

## Rules

1. ✅ Máximo 10 tentativas por erro
2. ✅ Branch separado para alterações
3. ✅ Commit antes/depois de cada correção
4. ✅ Nunca delete testes
5. ✅ Nunca desative segurança/validação
6. ✅ Nunca use produção/segredos reais
7. ✅ Mostre diff antes de aplicar

## Workflow recomendado

### 1. Preparar ambiente de teste
```bash
# Criar branch de trabalho
git checkout -b fix/test-issue

# Instalar dependências
npm ci

# Usar .env.test
cp .env.example .env.test
```

### 2. Rodar build
```bash
npm run build
# Se falhar → diagnosticar → corrigir → revalidar
```

### 3. Rodar testes
```bash
npm test
# Se falhar → ver log → identificar causa → corrigir
```

### 4. Rodar sistema
```bash
npm start &
# Testar fluxos: login → listar → criar → deletar
# Parar com: kill $PID
```

### 5. Diagnosticar falha
```
FALHA: TypeError: Cannot read property 'token' of undefined
ARQUIVO: src/services/auth.js:24
CAUSA: user não validado
CORREÇÃO: if (!user) return res.status(401).json({error: 'Unauthorized'})
```

### 6. Revalidar
```bash
npm test                    # Testar novamente
npm run build               # Garantir build
npm test                    # Suite completa
```

## Relatório Gerado

```json
{
  "status": "approved",
  "attempts": 2,
  "commands_executed": ["npm ci", "npm run build", "npm test"],
  "errors_found": [
    {
      "file": "src/services/auth.js",
      "line": 24,
      "error": "TypeError: Cannot read property 'token'",
      "cause": "Missing null check",
      "correction": "Added user validation before token access"
    }
  ],
  "files_changed": ["src/services/auth.js"],
  "tests_passed": true,
  "pending_issues": []
}
```

## Integração CI

```yaml
# .github/workflows/test-fix.yml
name: Test-Fix Loop
on: [push, pull_request]

jobs:
  test-fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Fail if tests fail
        run: |
          if [ $?.code -ne 0 ]; then
            echo "::error::Tests failed - see logs"
            exit 1
          fi
```

## Uso no AI-KIT

```yaml
# Via skill
test-fix-loop:
  command: "npm test"
  max_attempts: 10
  git_integration: true
  stop_on_error: true

# Via CLI
$ ai-kit test-fix-loop --command "npm test"
```
