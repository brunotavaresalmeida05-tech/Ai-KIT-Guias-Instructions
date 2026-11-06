/**
 * Multi-Agent Orchestration Example
 * Demonstrates using agent-orchestration and continuous-loop skills
 */

import { invokeSkill } from '../src/skills/orchestrator';

async function multiAgentArchitectureReview() {
  console.log('=== Multi-Agent Architecture Review ===\n');
  
  // Phase 1: Council for architecture review
  const councilResult = await invokeSkill('agent-orchestration', {
    task: 'Review microservice architecture for e-commerce platform',
    agents: ['architect', 'security-reviewer', 'backend-specialist'],
    pattern: 'council',
    options: {
      maxIterations: 3,
      consensusThreshold: 0.8
    }
  });
  
  console.log('Council Result:', JSON.stringify(councilResult, null, 2));
  
  // Phase 2: Continuous loop for optimization
  const optimizationResult = await invokeSkill('continuous-loop', {
    task: 'optimize microservice communication',
    qualityThreshold: 0.85,
    maxIterations: 10,
    agents: ['harness-optimizer', 'performance-optimizer']
  });
  
  console.log('Optimization Result:', JSON.stringify(optimizationResult, null, 2));
  
  // Phase 3: Self-evaluation
  const evalResult = await invokeSkill('guild-member-eval', {
    agent: 'orchestrator-agent',
    task: 'multi-phase architecture optimization',
    metrics: ['accuracy', 'completeness', 'efficiency']
  });
  
  console.log('Evaluation Result:', JSON.stringify(evalResult, null, 2));
  
  return {
    council: councilResult,
    optimization: optimizationResult,
    evaluation: evalResult
  };
}

// Run if executed directly
if (require.main === module) {
  multiAgentArchitectureReview()
    .then(() => console.log('\n✅ Multi-agent orchestration complete'))
    .catch(console.error);
}

export { multiAgentArchitectureReview };
