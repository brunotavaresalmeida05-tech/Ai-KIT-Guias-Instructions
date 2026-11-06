---
name: slack-gif-creator
category: development
version: 1.0.0
description: >
  Criador de GIFs animados para mensagens do Slack.
  Baseado em Anthropics/skills slack-gif-creator.
tags:
  - gif
  - slack
  - animation
  - meme
  - social
when_to_use: |
  Use quando:
  - Criar GIFs para Slack
  - Gerar animacoes de texto
  - Criar memes
  - Visualizar dados animados
  - Mensagem divertida/criativa
input:
  type: object
  properties:
    frames:
      type: integer
      description: Numero de frames
    duration:
      type: integer
      description: Duracao total em segundos
    text:
      type: string
      description: Texto a animar
    style:
      type: string
      enum: [typewriter, fade, slide, bounce]
      description: Estilo de animacao
    output:
      type: string
      description: Texto ou imagem a animar
output:
  type: object
  properties:
    gif_path:
      type: string
      description: Caminho do GIF criado
    frames_created:
      type: integer
      description: Numero de frames gerados
    file_size:
      type: integer
      description: Tamanho do arquivo em bytes
execution_time:
  min_seconds: 5
  max_seconds: 60
  typical_seconds: 15
---

# SLACK GIF CREATOR

Criador de GIFs animados para Slack.

## QUANDO USAR

- Criar GIFs para Slack
- Gerar animacoes de texto
- Criar memes
- Visualizar dados animados
- Mensagem divertida/criativa

## ESTILOS DE ANIMACAO

### typewriter
Efeito de digitacao

### fade
Transicao de opacidade

### slide
Deslizar elementos

### bounce
Salto/explosao

## SAIDA ESPERADO

GIF animado pronto para upload no Slack.
