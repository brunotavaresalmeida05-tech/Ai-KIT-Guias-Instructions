---
name: pdf
category: development
version: 1.0.0
description: >
  Manipulacao de documentos PDF - criacao, edicao, extracao, conversao.
  Baseado em Anthropics/skills pdf.
tags:
  - pdf
  - document
  - conversion
  - extraction
  - editing
when_to_use: |
  Use quando:
  - Criar documentos PDF
  - Extrair texto de PDF
  - Converter PDF para outros formatos
  - Editar metadados de PDF
  - Unir ou dividir PDFs
input:
  type: object
  properties:
    action:
      type: string
      enum: [create, extract, convert, merge, split, edit]
      description: Acao a executar
    source_files:
      type: array
      items:
        type: string
      description: Arquivos de origem
    output_path:
      type: string
      description: Caminho de saida
    format:
      type: string
      enum: [text, html, json, images, pdf]
      description: Formato de conversao
output:
  type: object
  properties:
    files_created:
      type: array
      items:
        type: string
      description: Arquivos criados
    content:
      type: string
      description: Conteudo extraído ou resultado
    metadata:
      type: object
      description: Metadados do PDF
execution_time:
  min_seconds: 2
  max_seconds: 120
  typical_seconds: 15
---

# PDF

Manipulacao de documentos PDF.

## QUANDO USAR

- Criar documentos PDF
- Extrair texto de PDF
- Converter PDF para outros formatos
- Editar metadados de PDF
- Unir ou dividir PDFs

## ACOES

### create
Gerar PDF a partir de conteudo

### extract
Extrair texto ou imagens

### convert
Converter entre formatos

### merge
Unir multiplos PDFs

### split
Dividir PDF em paginas

### edit
Modificar metadados

## SAIDA ESPERADA

Arquivo PDF processado, conteudo extraido, metadados.
