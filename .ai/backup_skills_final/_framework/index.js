/**
 * Taste-Skill Framework — Main API
 * Universal skill management and discovery system
 */

const path = require('path');
const SkillLoader = require('./skill-loader');
const SkillFinder = require('./skill-finder');
const SkillValidator = require('./skill-validator');

class TasteSkillFramework {
  constructor(skillsBasePath = path.resolve(__dirname, '..')) {
    this.skillsBasePath = skillsBasePath;
    this.loader = new SkillLoader(skillsBasePath);
    this.finder = null;
    this.validator = new SkillValidator();
    this.skills = new Map();
    this.initialized = false;
  }

  /**
   * Initialize framework - load all skills
   */
  initialize() {
    console.log('🔄 Initializing Taste-Skill Framework...');

    try {
      this.skills = this.loader.loadAllSkills();
      this.finder = new SkillFinder(this.skills);
      this.initialized = true;

      console.log(`✅ Framework initialized with ${this.skills.size} skills`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to initialize: ${error.message}`);
      return false;
    }
  }

  /**
   * Get a skill by name
   */
  getSkill(skillName) {
    return this.skills.get(skillName);
  }

  /**
   * List all available skills
   */
  listSkills(filter = null) {
    const list = [];

    for (const [name, skill] of this.skills) {
      // Apply filter if provided
      if (filter) {
        if (
          filter.category &&
          skill.category !== filter.category
        ) {
          continue;
        }

        if (filter.tags) {
          const hasAllTags = filter.tags.every(tag => skill.tags.includes(tag));
          if (!hasAllTags) continue;
        }
      }

      list.push({
        name,
        version: skill.version,
        category: skill.category,
        description: skill.description,
        tags: skill.tags,
        executionTime: skill.execution_time?.typical_seconds,
      });
    }

    return list;
  }

  /**
   * Find skills for a task
   */
  findSkillsForTask(taskDescription, options = {}) {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.findSkillsForTask(taskDescription, options);
  }

  /**
   * Find skills by category
   */
  findByCategory(category) {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.findByCategory(category);
  }

  /**
   * Find skills by tags
   */
  findByTags(tags) {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.findByTags(tags);
  }

  /**
   * Get all available categories
   */
  getCategories() {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.getCategories();
  }

  /**
   * Validate a skill definition
   */
  validateSkill(skillData) {
    return this.validator.validateSkill(skillData);
  }

  /**
   * Reload a specific skill
   */
  reloadSkill(skillName) {
    try {
      const skill = this.loader.loadSkill(skillName);
      this.skills.set(skillName, skill);
      return true;
    } catch (error) {
      console.error(`Failed to reload skill: ${error.message}`);
      return false;
    }
  }

  /**
   * Get statistics about all skills
   */
  getStats() {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.getStats();
  }

  /**
   * Find complementary skills
   */
  findComplementary(skillName) {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.findComplementarySkills(skillName);
  }

  /**
   * Get skill dependency chain
   */
  getSkillChain(skillName) {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.getSkillChain(skillName);
  }

  /**
   * Find offline-capable skills
   */
  findOfflineSkills() {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.findOfflineSkills();
  }

  /**
   * Create skill recommendation for a workflow
   */
  recommendSkillsForWorkflow(phases) {
    // phases = [{ name: 'Phase 1', description: '...' }, ...]
    const recommendations = {};

    for (const phase of phases) {
      const skills = this.findSkillsForTask(phase.description, {
        maxResults: 3,
      });

      recommendations[phase.name] = skills.map(s => ({
        name: s.name,
        relevance: (s.score * 100).toFixed(0) + '%',
        reason: s.reason,
      }));
    }

    return recommendations;
  }

  /**
   * Check if skill is available
   */
  hasSkill(skillName) {
    return this.skills.has(skillName);
  }

  /**
   * Get skill by multiple names
   */
  getSkills(skillNames) {
    const results = {};

    for (const name of skillNames) {
      const skill = this.skills.get(name);
      if (skill) {
        results[name] = skill;
      }
    }

    return results;
  }

  /**
   * Export skill (for sharing)
   */
  exportSkill(skillName) {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill ${skillName} not found`);
    }

    return JSON.stringify(skill, null, 2);
  }

  /**
   * Find fast skills (execution time < threshold)
   */
  findFastSkills(maxSeconds = 60) {
    const fast = [];

    for (const [name, skill] of this.skills) {
      if (skill.execution_time?.typical_seconds <= maxSeconds) {
        fast.push({ name, skill });
      }
    }

    return fast;
  }

  /**
   * Find low-resource skills
   */
  findLowResourceSkills() {
    if (!this.finder) {
      throw new Error('Framework not initialized. Call initialize() first.');
    }

    return this.finder.findByResources('low');
  }

  /**
   * Get skill description
   */
  describeSkill(skillName) {
    const skill = this.skills.get(skillName);
    if (!skill) {
      throw new Error(`Skill ${skillName} not found`);
    }

    return {
      name: skill.name,
      description: skill.description,
      category: skill.category,
      when_to_use: skill.when_to_use,
      when_not_to_use: skill.when_not_to_use,
      tags: skill.tags,
      execution_time: skill.execution_time,
      resources: skill.resources,
      examples: skill.examples,
    };
  }

  /**
   * Suggest workflow skills
   */
  suggestWorkflow(objective) {
    // Simple workflow suggestion based on objective
    const taskTypes = {
      'write|code|implement': 'development',
      'test|testing': 'testing',
      'security|audit|vulnerability': 'security',
      'document|doc': 'documentation',
      'deploy|release': 'deployment',
      'analyze|analysis': 'analysis',
      'research|investigate': 'research',
      'design|architecture': 'architecture',
      'review|quality': 'code-quality',
      'database|data': 'database',
      'api|endpoint': 'api',
      'frontend|ui': 'frontend',
      'backend|server': 'backend',
      'devops|infrastructure': 'infrastructure',
    };

    let category = 'development'; // default

    for (const [keywords, cat] of Object.entries(taskTypes)) {
      const keywordList = keywords.split('|');
      if (keywordList.some(kw => objective.toLowerCase().includes(kw))) {
        category = cat;
        break;
      }
    }

    return this.findByCategory(category);
  }
}

// Export for use
module.exports = TasteSkillFramework;

// Example usage
if (require.main === module) {
  const framework = new TasteSkillFramework();

  if (framework.initialize()) {
    console.log('\n📊 Framework Statistics:');
    const stats = framework.getStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n🔍 Available Categories:');
    const categories = framework.getCategories();
    categories.forEach(cat => console.log(`  - ${cat}`));

    console.log('\n🎯 Example: Finding skills for "write tests"');
    const skills = framework.findSkillsForTask('write unit tests', {
      maxResults: 3,
    });
    skills.forEach(s => {
      console.log(`  - ${s.name} (relevance: ${(s.score * 100).toFixed(0)}%)`);
      console.log(`    Reason: ${s.reason.join(', ')}`);
    });
  }
}
