/**
 * Taste-Skill Loader
 * Load and parse skill definitions from YAML/JSON files
 */

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

class SkillLoader {
  constructor(skillsBasePath = path.resolve(__dirname, '..')) {
    this.basePath = skillsBasePath;
    this.cache = new Map();
  }

  /**
   * Load a skill by name
   */
  loadSkill(skillName) {
    // Check cache first
    if (this.cache.has(skillName)) {
      return this.cache.get(skillName);
    }

    const skillPath = path.join(this.basePath, skillName, 'SKILL.md');

    try {
      if (!fs.existsSync(skillPath)) {
        throw new Error(`Skill file not found: ${skillPath}`);
      }

      const content = fs.readFileSync(skillPath, 'utf8');
      const skill = this.parseMDSkill(content);

      // Cache the skill
      this.cache.set(skillName, skill);

      return skill;
    } catch (error) {
      throw new Error(`Failed to load skill '${skillName}': ${error.message}`);
    }
  }

  /**
   * Load all skills from directory
   */
  loadAllSkills() {
    const skills = new Map();

    try {
      const skillDirs = fs.readdirSync(this.basePath);

      for (const dir of skillDirs) {
        if (dir.startsWith('_')) continue; // Skip framework files

        try {
          const skill = this.loadSkill(dir);
          skills.set(dir, skill);
        } catch (error) {
          console.warn(`⚠️ Failed to load skill '${dir}': ${error.message}`);
        }
      }

      return skills;
    } catch (error) {
      throw new Error(`Failed to load skills directory: ${error.message}`);
    }
  }

  /**
   * Parse Markdown skill file with YAML frontmatter
   */
  parseMDSkill(content) {
    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    if (!frontmatterMatch) {
      throw new Error('Skill file must have YAML frontmatter');
    }

    const yamlContent = frontmatterMatch[1];
    const bodyContent = content.substring(frontmatterMatch[0].length);

    try {
      const metadata = yaml.load(yamlContent);

      return {
        name: metadata.name,
        version: metadata.version,
        category: metadata.category,
        author: metadata.author || 'Unknown',
        created: metadata.created,
        updated: metadata.updated,
        description: metadata.description,
        tags: metadata.tags || [],
        when_to_use: metadata.when_to_use,
        when_not_to_use: metadata.when_not_to_use,
        requirements: metadata.requirements || [],
        input: metadata.input,
        output: metadata.output,
        execution_time: metadata.execution_time,
        resources: metadata.resources || {},
        dependencies: metadata.dependencies || [],
        success_criteria: metadata.success_criteria || [],
        error_handling: metadata.error_handling || [],
        examples: metadata.examples || [],
        integrations: metadata.integrations || [],
        related_skills: metadata.related_skills || [],
        notes: metadata.notes,
        changelog: metadata.changelog || [],
        body: bodyContent.trim(),
      };
    } catch (error) {
      throw new Error(`Invalid YAML frontmatter: ${error.message}`);
    }
  }

  /**
   * Load skill from JSON
   */
  loadSkillJSON(jsonPath) {
    try {
      const content = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load JSON skill: ${error.message}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cached skills
   */
  getCachedSkills() {
    return Array.from(this.cache.keys());
  }
}

module.exports = SkillLoader;
