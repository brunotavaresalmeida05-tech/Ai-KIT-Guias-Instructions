#!/usr/bin/env node
/**
 * update-index.mjs - Update INDEX.md with new skills
 * Usage: node scripts/update-index.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = path.join('..', 'INDEX.md');
const NEW_ENTRIES = [
  '- [agent-orchestration](skills/agent-orchestration/SKILL.md) - Multi-agent coordination with council and GAN patterns',
  '- [continuous-loop](skills/continuous-loop/SKILL.md) - Autonomous workflow loops for optimization and improvement'
];

const readAndValidate = async () => {
  const content = fs.readFileSync(INDEX_PATH, 'utf-8');
  
  // Check if already updated
  if (content.includes('agent-orchestration')) {
    console.log('INDEX.md already contains new skills');
    return;
  }
  
  // Add new entries before Optional resources section
  const updated = content.replace(
    '## Optional resources',
    NEW_ENTRIES.join('\n') + '\n\n## Optional resources'
  );
  
  fs.writeFileSync(INDEX_PATH, updated);
  console.log('✅ INDEX.md updated with new skills');
};

readAndValidate().catch(console.error);
