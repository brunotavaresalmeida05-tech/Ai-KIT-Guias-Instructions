# Graphify Integration

## Overview
Integration of Graphify-Labs/graphify - Knowledge graph generation using AST parsing and Leiden algorithm.

## Capabilities
- AST-based code analysis
- Knowledge graph generation
- Network partitioning with Leiden algorithm
- Multi-format output (GraphML, JSON, CSV, DOT)

## Skills Added
- graphify-integration - Generate knowledge graphs from source code

## Technical Details
- Parses Python, JavaScript, TypeScript code
- Extracts symbols, functions, classes, imports
- Builds relationship graph (dependencies, calls, inheritance)
- Applies community detection for graph partitioning

## Usage
```yaml
graphify-integration:
  project_path: "./src"
  language: "python"
  output_format: "graphml"
  partition: true
```

## Status
Skills: 1 new
