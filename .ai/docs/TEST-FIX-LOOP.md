# Test-Fix Loop - Ciclo Automático de Correção

## Overview
Self-correcting test agent that runs tests, diagnoses failures, fixes code, and revalidates until all tests pass.

## Architecture

```
Projeto/
├── src/                 # Código fonte
├── tests/               # Testes
├── package.json         # Configuração
├── .git/                # Versionamento (obrigatório)
└── .ai/skills/test-fix-loop/  # Script de loop
    ├── runner.py        # Executor de comandos
    ├── analyzer.py      # Analisador de erros
    ├── fixer.py         # Corretor de código
    └── loop.py          # Controlador do ciclo
```

## The Cycle

```
┌─────────────┐
│ 1. Preparar │  npm install, ler config
└──────┬──────┘
       ▼
┌─────────────┐
│ 2. Testar   │  npm test, npm run build
└──────┬──────┘
       ▼
 Passou?─SIM─► ✓ CONCLUÍDO
       │NÃO
       ▼
┌─────────────┐
│ 3. Diagnosticar │ Ler error, localizar arquivos
└──────┬──────┘
       ▼
┌─────────────┐
│ 4. Corrigir │ Aplicar correção mínima
└──────┬──────┘
       ▼
 Volta para "3. Testar"
```

## Usage

### Via CLI
```bash
# Executar ciclo com npm test
ai-kit test-fix-loop --command "npm test"

# Build + test
ai-kit test-fix-loop --command "npm run build && npm test" --max-attempts 5
```

### Via Skill
```yaml
test-fix-loop:
  command: "npm test"
  max_attempts: 10
  git_integration: true
  stop_on_error: true
```

## Safety Rules

1. **Git Required** - Must use Git for rollbacks
2. **Max Attempts** - Limit to 10 cycles per error
3. **Never Delete Tests** - Never remove failing tests to pass
4. **Never Disable Security** - Keep validation/security active
5. **Human Intervention** - Stop for credentials/produção/deploy

## Critical Errors (Stop Immediately)

- ✅ Credentials/keys in code
- ✅ Production access required  
- ✅ Automatic deployment
- ✅ Data deletion needed
- ✅ Dependency replacement with risk

## Output Files

### audit-result.json
```json
{
  "attempts": 3,
  "corrections": [
    {"file": "src/auth.js", "line": 24, "change": "Added null check"},
    {"file": "src/utils.js", "line": 45, "change": "Fixed type coercion"}
  ],
  "final_status": "passed",
  "log": "..."
}
```

## Integration with AI-KIT

### Superpowers Workflow
```
1. brainstorming
2. writing-plans
3. subagent-driven-development
4. test-driven-development
5. test-fix-loop  ← NEW!
6. requesting-code-review
7. finishing-a-development-branch
```

### CI/CD Pipeline
```yaml
jobs:
  test-and-fix:
    runs: ai-kit test-fix-loop --command "npm test"
    if: failure
    max_attempts: 5
```

## Example Session

```
Attempt 1: npm test → FAIL
Error: TypeError: Cannot read property 'token' of undefined at auth.js:24

Analyzing...
File: src/services/auth.js
Line: 24
Context: const token = user.token

Correction: Add null check before accessing user.token

Attempt 2: npm test → PASS
Status: ✅ Fixed in 2 attempts
```

## Components

### runner.py - Command Executor
- Runs shell commands
- Captures stdout/stderr/exit code
- Timeout handling

### analyzer.py - Error Analyzer
- Parses stack traces
- Identifies affected files
- Classifies error types

### fixer.py - Code Fixer
- Applies minimal corrections
- Uses AST for safe changes
- Generates diff

### loop.py - Controller
- Manages cycle state
- Git integration
- Progress reporting

## Configuration

```python
# .aictl.yaml
project:
  build_command: "npm run build"
  test_command: "npm test"
  start_command: "npm start"
  
safety:
  max_attempts: 10
  stop_on_credential_exposure: true
  git_required: true
  
patterns:
  success: ["✓|PASS|Tests: 0 failures"]
  failure: ["FAIL|Error|TypeError|Exception"]
```

## Status

- ✅ Protocol design complete
- ✅ Skill defined
- ✅ Integration planned
- ⏳ Script implementation pending
END
echo "TEST-FIX-LOOP.md created"
