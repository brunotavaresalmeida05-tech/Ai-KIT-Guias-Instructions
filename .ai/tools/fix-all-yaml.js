const fs = require('fs');
const path = require('path');

const skillsDir = 'skills';
const skills = fs.readdirSync(skillsDir).filter(f => {
  const stat = fs.statSync(path.join(skillsDir, f));
  return stat.isDirectory() && f !== '_framework';
});

function makeYaml(name) {
  return `---
name: ${name}
version: 1.0.0
mode: instruction
description: ${name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} workflow
tags:
  - workflow
  - ai-kit
when_to_use: Execute when ${name.replace(/-/g, ' ')} is needed.
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
}

let fixed = 0;
skills.forEach(skill => {
  const file = path.join(skillsDir, skill, 'SKILL.md');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Find the end of the YAML frontmatter
    const yamlEndMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    
    if (yamlEndMatch) {
      const body = content.slice(yamlEndMatch[0].length).trim();
      const newContent = makeYaml(skill) + body + '\n';
      fs.writeFileSync(file, newContent);
      fixed++;
      console.log('Fixed: ' + skill);
    } else {
      console.log('No YAML frontmatter found: ' + skill);
    }
  }
});

console.log(`\nTotal skills fixed: ${fixed}`);
