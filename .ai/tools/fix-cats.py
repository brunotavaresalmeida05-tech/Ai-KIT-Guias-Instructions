#!/usr/bin/env python3
import os
import re

category_map = {
    'architecture-first': 'architecture',
    'agent-orchestration': 'analysis',
    'continuous-loop': 'analysis',
    'ci-cd-release': 'deployment',
    'code-review': 'testing',
    'context-router': 'analysis',
    'debugging-loop': 'testing',
    'deploy-manager': 'deployment',
    'devops-secops': 'security',
    'documentation-builder': 'documentation',
    'engineering-workflow': 'development',
    'guild-member-eval': 'testing',
    'harness-optimizer': 'development',
    'implementation-assistant': 'development',
    'implementation-plan': 'analysis',
    'pm-analyst': 'analysis',
    'prompt-builder': 'development',
    'qa-testing': 'testing',
    're-engineering': 'security',
    'refactor-guardrail': 'development',
    'research-agent': 'research',
    'research-primary': 'research',
    'security-audit': 'security',
    'security-review': 'security',
    'skill-creator': 'development',
    'spec-viva': 'analysis',
    'tdd-workflow': 'testing',
    'technical-writer': 'documentation',
    'test-generator': 'testing',
    'agent-orchestration': 'analysis',
    'continuous-loop': 'analysis'
}

for skill, category in category_map.items():
    file = f"skills/{skill}/SKILL.md"
    if os.path.exists(file):
        with open(file, 'r') as f:
            content = f.read()
        
        # Add category after name line if not present
        if f'category: {category}' not in content:
            # Find the line after name
            lines = content.split('\n')
            new_lines = []
            for i, line in enumerate(lines):
                new_lines.append(line)
                if line.strip() == f'name: {skill}':
                    new_lines.append(f'category: {category}')
            content = '\n'.join(new_lines)
            
            with open(file, 'w') as f:
                f.write(content)
            print(f"Added category {category} to {skill}")

print("Done!")
