const fs = require('fs');
const path = require('path');

const skillsDir = 'skills';
const skills = fs.readdirSync(skillsDir).filter(f => {
  const stat = fs.statSync(path.join(skillsDir, f));
  return stat.isDirectory() && f !== '_framework';
});

// Minimal valid YAML template
const makeYaml = (name) => `---
name: ${name}
version: 1.0.0
mode: instruction
description: ${name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} workflow
tags:
  - workflow
  - ai-kit
when_to_use: Execute when ${name.replace(/-/g, ' ')}.
input:
  type: object
  properties:
    task:
      type: string
      description: Task to execute
output:
  type: object
  properties:
    result:
      type: object
      description: Result of execution
execution_time:
  min_seconds: 5
  max_seconds: 600
  typical_seconds: 30
---

`;

let fixed = 0;
skills.forEach(skill => {
  const file = path.join(skillsDir, skill, 'SKILL.md');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if valid YAML frontmatter exists
    if (content.startsWith('---')) {
      const endMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
      if (!endMatch) {
        // Invalid YAML, replace it
        const body = content.replace(/^---[\s\S]*?^---\n?/m, '').trim();
        fs.writeFileSync(file, makeYaml(skill) + body + '\n');
        fixed++;
        console.log('Fixed: ' + skill);
      }
    } else {
      // No YAML frontmatter
      fs.writeFileSync(file, makeYaml(skill) + content);
      fixed++;
      console.log('Added template to: ' + skill);
    }
  }
});

console.log(`\nTotal skills fixed: ${fixed}`);
