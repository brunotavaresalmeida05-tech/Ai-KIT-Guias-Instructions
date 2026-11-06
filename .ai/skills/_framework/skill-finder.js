/**
 * Taste-Skill Finder
 * Intelligently discover and recommend skills for a given task
 */

class SkillFinder {
  constructor(skillsMap) {
    this.skills = skillsMap; // Map of skill_name -> skill_metadata
    this.cache = new Map();
  }

  /**
   * Find best skills for a task using keyword matching and context
   */
  findSkillsForTask(taskDescription, options = {}) {
    const {
      maxResults = 5,
      minRelevance = 0.2,
      category = null,
      excludeSkills = [],
    } = options;

    // Parse task description into keywords
    const keywords = this.extractKeywords(taskDescription);

    // Score all skills
    const scoredSkills = [];

    for (const [skillName, skill] of this.skills) {
      // Skip excluded skills
      if (excludeSkills.includes(skillName)) continue;

      // Filter by category if specified
      if (category && skill.category !== category) continue;

      // Calculate relevance score
      const score = this.calculateRelevance(skill, keywords, taskDescription);

      if (score >= minRelevance) {
        scoredSkills.push({
          name: skillName,
          skill,
          score,
          reason: this.explainScore(skill, keywords),
        });
      }
    }

    // Sort by score descending
    scoredSkills.sort((a, b) => b.score - a.score);

    // Return top results
    return scoredSkills.slice(0, maxResults);
  }

  /**
   * Extract keywords from task description
   */
  extractKeywords(description) {
    // Remove common words
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'be', 'been', 'being',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    ]);

    const keywords = description
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !stopwords.has(word));

    return new Set(keywords);
  }

  /**
   * Calculate relevance score (0-1)
   */
  calculateRelevance(skill, keywords, description) {
    let score = 0;

    // 1. Exact name match (high weight)
    if (keywords.has(skill.name.replace(/-/g, ''))) {
      score += 0.4;
    }

    // 2. Tags matching (medium weight)
    const tagMatches = skill.tags.filter(tag =>
      keywords.has(tag.replace(/-/g, ''))
    ).length;
    score += (tagMatches / Math.max(skill.tags.length, 1)) * 0.3;

    // 3. Description matching (medium weight)
    const descLower = skill.description.toLowerCase();
    const matchingKeywords = Array.from(keywords).filter(kw =>
      descLower.includes(kw)
    ).length;
    score += (matchingKeywords / keywords.size) * 0.2;

    // 4. When-to-use matching (low weight)
    const whenToUseLower = skill.when_to_use.toLowerCase();
    const whenMatches = Array.from(keywords).filter(kw =>
      whenToUseLower.includes(kw)
    ).length;
    score += (whenMatches / keywords.size) * 0.1;

    // Normalize to 0-1
    return Math.min(score, 1.0);
  }

  /**
   * Explain why a skill was recommended
   */
  explainScore(skill, keywords) {
    const reasons = [];

    // Check name match
    if (keywords.has(skill.name.replace(/-/g, ''))) {
      reasons.push('Exact skill name match');
    }

    // Check tag matches
    const tagMatches = skill.tags.filter(tag =>
      keywords.has(tag.replace(/-/g, ''))
    );
    if (tagMatches.length > 0) {
      reasons.push(`Tags match: ${tagMatches.join(', ')}`);
    }

    // Check description matches
    const descLower = skill.description.toLowerCase();
    const descMatches = Array.from(keywords).filter(kw =>
      descLower.includes(kw)
    );
    if (descMatches.length > 0) {
      reasons.push(`Description mentions: ${descMatches.join(', ')}`);
    }

    return reasons;
  }

  /**
   * Find skills in a specific category
   */
  findByCategory(category) {
    const results = [];

    for (const [skillName, skill] of this.skills) {
      if (skill.category === category) {
        results.push({ name: skillName, skill });
      }
    }

    return results;
  }

  /**
   * Find skills by multiple tags (AND logic)
   */
  findByTags(tags) {
    const results = [];

    for (const [skillName, skill] of this.skills) {
      const hasAllTags = tags.every(tag => skill.tags.includes(tag));

      if (hasAllTags) {
        results.push({ name: skillName, skill });
      }
    }

    return results;
  }

  /**
   * Find skills that depend on given skill
   */
  findDependents(skillName) {
    const dependents = [];

    for (const [name, skill] of this.skills) {
      if (skill.dependencies && skill.dependencies.includes(skillName)) {
        dependents.push({ name, skill });
      }
    }

    return dependents;
  }

  /**
   * Find skill chain (this skill + dependencies)
   */
  getSkillChain(skillName) {
    const chain = [];
    const visited = new Set();

    const traverse = (name) => {
      if (visited.has(name)) return;
      visited.add(name);

      const skill = this.skills.get(name);
      if (!skill) return;

      chain.push({ name, skill });

      // Add dependencies
      if (skill.dependencies) {
        for (const dep of skill.dependencies) {
          traverse(dep);
        }
      }
    };

    traverse(skillName);
    return chain;
  }

  /**
   * Get skills by execution time range
   */
  findByExecutionTime(minSeconds, maxSeconds) {
    const results = [];

    for (const [skillName, skill] of this.skills) {
      if (!skill.execution_time) continue;

      const { typical_seconds } = skill.execution_time;

      if (typical_seconds >= minSeconds && typical_seconds <= maxSeconds) {
        results.push({ name: skillName, skill });
      }
    }

    return results;
  }

  /**
   * Get skills by resource requirements
   */
  findByResources(cpu = null, memory = null) {
    const results = [];

    for (const [skillName, skill] of this.skills) {
      if (!skill.resources) continue;

      let matches = true;

      if (cpu && skill.resources.cpu !== cpu) matches = false;
      if (memory && skill.resources.memory_mb > memory) matches = false;

      if (matches) {
        results.push({ name: skillName, skill });
      }
    }

    return results;
  }

  /**
   * Get skills requiring no external network
   */
  findOfflineSkills() {
    const results = [];

    for (const [skillName, skill] of this.skills) {
      if (!skill.resources || !skill.resources.network) {
        results.push({ name: skillName, skill });
      }
    }

    return results;
  }

  /**
   * Get all available categories
   */
  getCategories() {
    const categories = new Set();

    for (const skill of this.skills.values()) {
      if (skill.category) {
        categories.add(skill.category);
      }
    }

    return Array.from(categories).sort();
  }

  /**
   * Get statistics about skills
   */
  getStats() {
    const stats = {
      totalSkills: this.skills.size,
      byCategory: {},
      avgExecutionTime: 0,
      byResourceLevel: {
        low: 0,
        medium: 0,
        high: 0,
      },
    };

    let totalExecutionTime = 0;
    let executionTimeCount = 0;

    for (const skill of this.skills.values()) {
      // Category count
      if (skill.category) {
        stats.byCategory[skill.category] =
          (stats.byCategory[skill.category] || 0) + 1;
      }

      // Execution time
      if (skill.execution_time) {
        totalExecutionTime += skill.execution_time.typical_seconds;
        executionTimeCount++;
      }

      // Resource level
      if (skill.resources && skill.resources.cpu) {
        stats.byResourceLevel[skill.resources.cpu]++;
      }
    }

    stats.avgExecutionTime =
      executionTimeCount > 0 ? totalExecutionTime / executionTimeCount : 0;

    return stats;
  }

  /**
   * Find skills that work well together
   */
  findComplementarySkills(skillName) {
    const skill = this.skills.get(skillName);
    if (!skill) return [];

    const complementary = [];

    // Find skills that depend on this one
    for (const [name, otherSkill] of this.skills) {
      if (name === skillName) continue;

      // Check if they share tags
      const sharedTags = skill.tags.filter(tag =>
        otherSkill.tags.includes(tag)
      );

      // Check if they're in same category
      const sameCategory = skill.category === otherSkill.category;

      // Check if one depends on the other
      const isDependency =
        skill.dependencies?.includes(name) ||
        otherSkill.dependencies?.includes(skillName);

      if (sharedTags.length > 0 || sameCategory || isDependency) {
        complementary.push({
          name,
          skill: otherSkill,
          reason: {
            sharedTags: sharedTags.length,
            sameCategory,
            isDependency,
          },
        });
      }
    }

    // Sort by relevance
    complementary.sort((a, b) => {
      const scoreA =
        a.reason.sharedTags * 2 + (a.reason.sameCategory ? 1 : 0) +
        (a.reason.isDependency ? 5 : 0);
      const scoreB =
        b.reason.sharedTags * 2 + (b.reason.sameCategory ? 1 : 0) +
        (b.reason.isDependency ? 5 : 0);
      return scoreB - scoreA;
    });

    return complementary;
  }
}

module.exports = SkillFinder;
