const fs = require('fs');
const path = require('path');

const skillsDir = 'skills';
const skills = fs.readdirSync(skillsDir).filter(f => {
  const stat = fs.statSync(path.join(skillsDir, f));
  return stat.isDirectory() && f !== '_framework';
});

const yamlTemplate = (name) => `---
name: ${name}
version: 1.0.0
category: development
tags:
  - workflow
  - ai-kit
when_to_use: ${name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
      description: Execution result
execution_time:
  min_seconds: 5
  max_seconds: 600
  typical_seconds: 30
---

`;

skills.forEach(skill => {
  const file = path.join(skillsDir, skill, 'SKILL.md');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.startsWith('---')) {
      // Prepend YAML frontmatter
      const body = content.trim().startsWith('#') ? content : '# ' + skill + '\n\n' + content;
      fs.writeFileSync(file, yamlTemplate(skill) + body);
      console.log('Fixed: ' + skill);
    } else if (content.includes('---\n---') && content.split('\n').length < 10) {
      // Empty YAML frontmatter
      console.log('Empty frontmatter: ' + skill);
    }
  }
});

console.log('Done!');
