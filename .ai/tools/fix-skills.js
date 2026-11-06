#!/usr/bin/env node
/**
 * Fix invalid SKILL.md files by adding missing YAML properties
 */

const fs = require('fs');
const path = require('path');

const skillFixes = {
  'tdd-workflow': {
    version: '1.1.0',
    category: 'testing',
    tags: ['testing', 'tdd', 'development', 'quality'],
    when_to_use: 'Estágio Red-Green-Refactor com disciplina.',
    input: {
      type: 'object',
      properties: {
        feature: { type: 'string', description: 'Feature to implement' },
        requirements: { type: 'string', description: 'Requirements' }
      }
    },
    output: {
      type: 'object',
      properties: {
        tests: { type: 'array', items: { type: 'string' }, description: 'Tests written' }
      }
    },
    execution_time: { min_seconds: 5, max_seconds: 300, typical_seconds: 30 }
  },
  'technical-writer': {
    version: '1.0.0',
    category: 'documentation',
    tags: ['documentation', 'writing'],
    when_to_use: 'Documentação técnica para utilizadores finais.',
    input: { type: 'object', properties: { topic: { type: 'string' } } },
    output: { type: 'object', properties: { document: { type: 'string' } } },
    execution_time: { min_seconds: 10, max_seconds: 600, typical_seconds: 60 }
  },
  'spec-viva': {
    version: '1.0.0',
    category: 'analysis',
    tags: ['specifications', 'requirements'],
    when_to_use: 'Captura e validação de requisitos iniciais.',
    input: { type: 'object', properties: { scope: { type: 'string' } } },
    output: { type: 'object', properties: { spec: { type: 'object' } } },
    execution_time: { min_seconds: 30, max_seconds: 600, typical_seconds: 120 }
  },
  'skill-creator': {
    version: '1.0.0',
    category: 'utility',
    tags: ['skill', 'devops'],
    when_to_use: 'Create new skills following the framework pattern.',
    input: { type: 'object', properties: { skillName: { type: 'string' } } },
    output: { type: 'object', properties: { skillPath: { type: 'string' } } },
    execution_time: { min_seconds: 5, max_seconds: 120, typical_seconds: 30 }
  },
  'security-review': {
    version: '1.0.0',
    category: 'security',
    tags: ['security', 'audit', 'review'],
    when_to_use: 'Security audits for code and architecture.',
    input: { type: 'object', properties: { target: { type: 'string' } } },
    output: { type: 'object', properties: { vulnerabilities: { type: 'array' } } },
    execution_time: { min_seconds: 30, max_seconds: 1800, typical_seconds: 300 }
  },
  'test-generator': {
    version: '1.0.0',
    category: 'testing',
    tags: ['testing', 'automated'],
    when_to_use: 'Generate test cases automatically.',
    input: { type: 'object', properties: { code: { type: 'string' } } },
    output: { type: 'object', properties: { tests: { type: 'array' } } },
    execution_time: { min_seconds: 10, max_seconds: 120, typical_seconds: 30 }
  }
};

Object.entries(skillFixes).forEach(([skillName, fix]) => {
  const skillPath = `skills/${skillName}/SKILL.md`;
  if (fs.existsSync(skillPath)) {
    let content = fs.readFileSync(skillPath, 'utf8');
    
    // Check if it starts with proper YAML frontmatter
    const hasFrontmatter = content.startsWith('---\n') || content.startsWith('---\r\n');
    
    if (!hasFrontmatter) {
      const yamlBlock = `---
name: ${skillName}
version: ${fix.version}
category: ${fix.category}
tags:
${fix.tags.map(t => `  - ${t}`).join('\n')}
when_to_use: ${fix.when_to_use}
input:
  type: object
  properties:
${Object.entries(fix.input.properties).map(([k, v]) => `    ${k}:\n      type: ${v.type}\n      description: ${v.description}`).join('\n')}
output:
  type: object
  properties:
${Object.entries(fix.output.properties).map(([k, v]) => `    ${k}:\n      type: ${v.type}`).join('\n')}
execution_time:
  min_seconds: ${fix.execution_time.min_seconds}
  max_seconds: ${fix.execution_time.max_seconds}
  typical_seconds: ${fix.execution_time.typical_seconds}
---

`;
      content = yamlBlock + content;
      fs.writeFileSync(skillPath, content);
      console.log(`✅ Fixed ${skillName}`);
    } else {
      console.log(`⚠️  ${skillName} has frontmatter but may be incomplete`);
    }
  }
});

console.log('Skill fix complete!');
