---
name: internal-comms
category: communication
version: 1.0.0
description: >
  Comunicacao interna - memorandos, correos, status updates, meeting notes.
  Baseado em Anthropics/skills internal-comms.
tags:
  - communication
  - internal
  - email
  - memo
  - meeting
  - status
when_to_use: |
  Use quando:
  - Escrever memorandos internos
  - Compor correos profissionais
  - Documentar reuniões
  - Criar status updates
  - Comunicar decisões
input:
  type: object
  properties:
    type:
      type: string
      enum: [memo, email, status-update, meeting-notes, decision-doc]
      description: Tipo de comunicacao
    audience:
      type: string
      description: Destinatarios
    subject:
      type: string
      description: Assunto ou titulo
    content:
      type: string
      description: Conteudo principal
output:
  type: object
  properties:
    document_path:
      type: string
      description: Caminho do documento criado
    format:
      type: string
      description: Formato final (markdown, text)
    preview:
      type: string
      description: Vista previa
execution_time:
  min_seconds: 1
  max_seconds: 30
  typical_seconds: 5
---

# INTERNAL COMMS

Comunicacao interna eficaz.

## QUANDO USAR

- Escrever memorandos internos
- Compor correos profissionais
- Documentar reuniões
- Criar status updates
- Comunicar decisões

## TIPOS

### memo
Memorando oficial

### email
Correo eletronico

### status-update
Atualizacao de status

### meeting-notes
Anotacoes de reuniao

### decision-doc
Documento de decisao

## SAIDA ESPERADA

Documento de comunicacao formatado.
