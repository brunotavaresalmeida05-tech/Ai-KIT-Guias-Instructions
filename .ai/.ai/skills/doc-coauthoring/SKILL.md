---
name: doc-coauthoring
category: development
version: 1.0.0
description: >
  Co-autoria de documentos com estrutura, revisao e controle de versao.
  Baseado em Anthropics/skills doc-coauthoring.
tags:
  - document
  - coauthoring
  - editing
  - version-control
  - collaboration
when_to_use: |
  Use quando:
  - Escrever documentos colaborativos
  - Revisar e sugerir mudancas
  - Manter controle de versao
  - Estruturar documentacao tecnica
input:
  type: object
  properties:
    document_path:
      type: string
      description: Caminho do documento
    action:
      type: string
      enum: [create, edit, review, suggest, version]
      description: Acao a executar
    content:
      type: string
      description: Conteudo ou mudancas
    format:
      type: string
      enum: [markdown, docx, pdf, text]
      description: Formato do documento
output:
  type: object
  properties:
    document_updated:
      type: boolean
      description: Se documento foi atualizado
    version:
      type: string
      description: Nova versao
    suggestions:
      type: array
      items:
        type: string
      description: Sugestoes de melhoria
execution_time:
  min_seconds: 2
  max_seconds: 60
  typical_seconds: 10
---

# DOC COAUTHORING

Co-autoria de documentos com estrutura e revisao.

## QUANDO USAR

- Escrever documentos colaborativos
- Revisar e sugerir mudancas
- Manter controle de versao
- Estruturar documentacao tecnica

## ACOES SUPORTADAS

### create
Criar novo documento com estrutura

### edit
Editar documento existente

### review
Revisar documento e gerar feedback

### suggest
Sugerir melhorias sem aplicar

### version
Criar nova versao com changelog

## SAIDA ESPERADA

Documento atualizado, versao, sugestoes de melhoria.
