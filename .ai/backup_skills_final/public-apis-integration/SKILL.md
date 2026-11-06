---
name: public-apis-integration
category: development
version: 1.0.0
description: >
  Integração com mais de 200+ APIs públicas gratuitas do repositório public-apis.
  Foco em APIs para ML/AI, processamento de texto, documentação, e ferramentas de desenvolvimento.
  Baseado em public-apis/public-apis.
tags:
  - apis
  - public
  - free
  - ml
  - ai
  - nlp
  - translation
  - image
  - text-analysis
  - integration
  - sdk
  - client
when_to_use: |
  Use quando:
  - Integrar ML/AI em aplicações
  - Processar texto com NLP
  - Traduzir conteúdo
  - Gerar imagens/vídeos com IA
  - OCR de documentos
  - Análise de sentimentos
  - Enriquecimento de dados
  - Automatizar workflows com APIs
  - Gerar relatórios com templates
  - Consultar dados abertos
input:
  type: object
  properties:
    action:
      type: string
      enum: [generate-client, call-api, integrate-sdk, validate-config]
      description: Acao a executar
    api_name:
      type: string
      description: Nome da API (ex: OpenAI, Hugging Face, Cohere, Azure)
    use_case:
      type: string
      enum: [text-generation, embedding, classification, translation, vision, audio, ocr, sentiment]
      description: Caso de uso
    language:
      type: string
      enum: [python, javascript, typescript, go, curl]
      description: Linguagem para cliente
    output_format:
      type: string
      enum: [python, javascript, typescript, curl, markdown]
      description: Formato de saida do exemplo
output:
  type: object
  properties:
    client_code:
      type: string
      description: Codigo do cliente gerado
    api_config:
      type: object
      description: Configuracao da API (base_url, auth, endpoints)
    examples:
      type: array
      items:
        type: string
      description: Exemplos de uso
    rate_limits:
      type: object
      description: Limites de taxa
execution_time:
  min_seconds: 5
  max_seconds: 60
  typical_seconds: 15
---

# PUBLIC APIS INTEGRATION

Integracao com APIs publicas gratuitas para IA e desenvolvimento.

## QUANDO USAR

- Integrar ML/AI em aplicacoes
- Processar texto com NLP
- Traduzir conteudo
- Gerar imagens/video com IA
- OCR de documentos
- Analise de sentimentos
- Enriquecimento de dados
- Automatizar workflows com APIs
- Gerar relatorios com templates
- Consultar dados abertos

## CATEGORIAS DE APIS INTEGRADAS

### Machine Learning & AI (40+ APIs)
- **Hugging Face** - Modelos open-source, inferencia
- **OpenRouter** - 300+ modelos LLM unificados
- **Cohere** - NLP, embeddings, classificacao
- **Mistral AI** - Modelos eficientes com free tier
- **Groq** - Inferencia rapida Llama/Mixtral
- **Together AI** - Open-source LLMs
- **Replicate** - Modelos Open Source
- **DeepAI** - Text, image, video processing

### Text Analysis (10+ APIs)
- **Watson NLU** - Anlise linguistica avançada
- **Google Cloud Natural** - Sentiment, entities, syntax
- **NLP Cloud** - spaCy + transformers
- **Perspective API** - Toxicidade em texto
- **Emotional Intelligence** - Emocoes em texto
- **TextAPI** - Classificacao automatica
- **Language Tool** - Correcao gramatical

### Translation (8+ APIs)
- **LibreTranslate** - Open source, 17 idiomas
- **Cloudmersive Translate** - 172 idiomas
- **Linguatools** - MT + traduçao pos-edicao
- **MyMemory** - Traducao baseada em corpus
- **Google Translate API** - Traduçao neural

### Vision & Image (12+ APIs)
- **Clarifai** - Computer Vision
- **Imagga** - Reconhecimento, busca visual
- **Cloudmersive** - Detecçao facial, NSFW
- **Azure Computer Vision** - Microsoft
- **Google Vision AI** - Google Cloud
- **Amazon Rekognition** - AWS
- **TinyPixel** - Redimensionamento inteligente
- **DeepFace** - Anlise facial (open source)

### Audio & Speech (6+ APIs)
- **Audexum** - Speech-to-text 25 idiomas
- **eidosSpeech** - 1200+ vozes TTS
- **AssemblyAI** - Transcricao e analise
- **Soniox** - Speech-to-text rapido
- **VocalMedia** - Analise vocal

### Documents & PDF (15+ APIs)
- **OCR.Space** - OCR gratuito (5000 req/mês)
- **DocConverter** - Conversao de documentos
- **PDF24** - PDF manipulacao
- **iLovePDF** - PDF conversion (250 doc/mês free)
- **APITree** - PDF para outros formatos

### Open Data & Knowledge (20+ APIs)
- **Wikipedia** - Enciclopedia gratuita
- **Wikidata** - Base de conhecimento estruturada
- **OpenAlex** - Scholarly papers and datasets
- **ArXiv** - Papers de computer science
- **Papers API** - Academic papers search

## WORKFLOWS COMUNS

### AI-Powered Document Pipeline
```
Document Input → OCR (OCR.Space) → Text Extraction → 
NLP (Watson/Google) → Translation → Summary → 
PDF Generation (iLovePDF)
```

### ML Content Processing
```
Raw Text → Embedding (Hugging Face) → Classification → 
Sentiment Analysis → Tagging → Storage
```

### Multi-language Content Pipeline
```
Source Text → Translation (LibreTranslate) → 
Summarization (OpenRouter LLM) → Tone Adjustment → 
Final Output
```

## SAIDA ESPERADA

Cliente funcional com codigos de exemplo, configuracao de auth, limites de taxa, e exemplos de uso.
