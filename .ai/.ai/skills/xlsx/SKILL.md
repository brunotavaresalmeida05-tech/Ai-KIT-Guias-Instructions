---
name: xlsx
category: development
version: 1.0.0
description: >
  Criacao e manipulacao de planilhas Excel (XLSX).
  Baseado em Anthropics/skills xlsx.
tags:
  - spreadsheet
  - xlsx
  - excel
  - data
  - analysis
when_to_use: |
  Use quando:
  - Criar planilhas de dados
  - Processar datasets tabulares
  - Gerar relatorios financeiros
  - Aplicar formatacao
  - Exportar dados
input:
  type: object
  properties:
    action:
      type: string
      enum: [create, add-data, format, formula, export]
      description: Acao a executar
    data:
      type: object
      description: Dados tabulares
    columns:
      type: array
      items:
        type: object
      description: Definicao de colunas
    formulas:
      type: array
      items:
        type: string
      description: Fórmulas a aplicar
output:
  type: object
  properties:
    xlsx_path:
      type: string
      description: Caminho do arquivo criado
    sheets_count:
      type: integer
      description: Numero de sheets
    row_count:
      type: integer
      description: Linhas processadas
execution_time:
  min_seconds: 2
  max_seconds: 60
  typical_seconds: 10
---

# XLSX

Criacao e manipulacao de planilhas Excel.

## QUANDO USAR

- Criar planilhas de dados
- Processar datasets tabulares
- Gerar relatorios financeiros
- Aplicar formatacao
- Exportar dados

## ACOES

### create
Nova planilha com headers

### add-data
Adicionar dados

### format
Aplicar estilos

### formula
Calcular com Excel formulas

### export
Salvar como XLSX

## SAIDA ESPERADA

Arquivo XLSX completo com dados e formatacao.
