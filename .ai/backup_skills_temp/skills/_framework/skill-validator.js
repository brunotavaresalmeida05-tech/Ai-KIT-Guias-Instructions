/**
 * Taste-Skill Validator
 * Validate skill definitions against schema and best practices
 */

const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');

class SkillValidator {
  constructor(schemaPath = path.join(__dirname, 'skill-schema.json')) {
    this.ajv = new Ajv({ allErrors: true, verbose: true, strict: false });
    this.schema = this.loadSchema(schemaPath);
    this.validate = this.ajv.compile(this.schema);
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Load JSON schema
   */
  loadSchema(path) {
    try {
      const content = fs.readFileSync(path, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to load schema: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate skill object
   */
  validateSkill(skillData) {
    this.errors = [];
    this.warnings = [];

    // Validate against JSON schema
    const isValid = this.validate(skillData);

    if (!isValid) {
      this.errors.push({
        type: 'schema',
        errors: this.validate.errors,
      });
    }

    // Validate best practices (errors vs. warnings are kept separate)
    this.validateBestPractices(skillData);

    // Validate examples
    this.validateExamples(skillData);

    // Validate dependencies
    this.validateDependencies(skillData);

    // Validate execution time
    this.validateExecutionTime(skillData);

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: [...this.warnings, ...this.getWarnings(skillData)],
    };
  }

  /**
   * Record a best-practice warning
   */
  addWarning(field, message) {
    this.warnings.push({ type: 'warning', field, message });
  }

  /**
   * Best practices validation
   */
  validateBestPractices(skillData) {
    // Check description length
    if (skillData.description && skillData.description.length < 20) {
      this.addWarning('description', 'Description should be more detailed (min 20 chars)');
    }

    // Check if examples exist
    if (!skillData.examples || skillData.examples.length === 0) {
      this.addWarning('examples', 'Skill should have at least one example');
    }

    // Check if success criteria exist
    if (!skillData.success_criteria || skillData.success_criteria.length === 0) {
      this.addWarning('success_criteria', 'Skill should define success criteria');
    }

    // Check if error handling is defined
    if (!skillData.error_handling || skillData.error_handling.length === 0) {
      this.addWarning('error_handling', 'Skill should document common errors');
    }

    // Check for meaningful tags
    if (!skillData.tags || skillData.tags.length < 2) {
      this.addWarning('tags', 'Skill should have at least 2 descriptive tags');
    }

    // Check skill name format
    if (skillData.name && !this.isValidSkillName(skillData.name)) {
      this.errors.push({
        type: 'error',
        field: 'name',
        message: 'Skill name must be kebab-case and contain only letters, numbers, and hyphens',
      });
    }

    // Check version format
    if (skillData.version && !this.isValidVersion(skillData.version)) {
      this.errors.push({
        type: 'error',
        field: 'version',
        message: 'Version must be semantic (e.g., 1.0.0)',
      });
    }
  }

  /**
   * Validate examples
   */
  validateExamples(skillData) {
    if (!skillData.examples) return;

    for (const example of skillData.examples) {
      // Validate example has required fields
      if (!example.name) {
        this.addWarning('examples', 'Example must have a name');
      }

      if (!example.input) {
        this.addWarning('examples', `Example "${example.name}" must have input`);
      }

      // Validate example input matches input schema
      if (example.input && skillData.input) {
        const inputValid = this.validateAgainstSchema(
          example.input,
          skillData.input
        );
        if (!inputValid) {
          this.addWarning(
            'examples',
            `Example "${example.name}" input doesn't match input schema`
          );
        }
      }
    }
  }

  /**
   * Validate dependencies exist
   */
  validateDependencies(skillData) {
    if (!skillData.dependencies || skillData.dependencies.length === 0) {
      return;
    }

    // Just verify dependencies are strings
    for (const dep of skillData.dependencies) {
      if (typeof dep !== 'string') {
        this.errors.push({
          type: 'error',
          field: 'dependencies',
          message: `Dependency must be string, got ${typeof dep}`,
        });
      }

      // Warn about circular dependencies (basic check)
      if (dep === skillData.name) {
        this.errors.push({
          type: 'error',
          field: 'dependencies',
          message: 'Skill cannot depend on itself',
        });
      }
    }
  }

  /**
   * Validate execution time
   */
  validateExecutionTime(skillData) {
    if (!skillData.execution_time) return;

    const { min_seconds, max_seconds, typical_seconds } =
      skillData.execution_time;

    // Check ranges
    if (max_seconds < min_seconds) {
      this.errors.push({
        type: 'error',
        field: 'execution_time',
        message: 'max_seconds must be >= min_seconds',
      });
    }

    if (typical_seconds < min_seconds || typical_seconds > max_seconds) {
      this.errors.push({
        type: 'error',
        field: 'execution_time',
        message: 'typical_seconds must be between min and max',
      });
    }
  }

  /**
   * Check if skill name is valid
   */
  isValidSkillName(name) {
    return /^[a-z0-9-]+$/.test(name);
  }

  /**
   * Check if version is semantic
   */
  isValidVersion(version) {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  /**
   * Validate value against JSON schema
   */
  validateAgainstSchema(value, schema) {
    const validator = this.ajv.compile(schema);
    return validator(value);
  }

  /**
   * Get warnings (non-critical issues)
   */
  getWarnings(skillData) {
    const warnings = [];

    // Check if skill has author
    if (!skillData.author) {
      warnings.push('Consider adding author information');
    }

    // Check if skill has changelog
    if (!skillData.changelog || skillData.changelog.length === 0) {
      warnings.push('Consider adding version history (changelog)');
    }

    // Check if skill has notes
    if (!skillData.notes) {
      warnings.push('Consider adding tips and best practices (notes)');
    }

    // Check if skill is properly categorized
    const validCategories = [
      'development',
      'testing',
      'security',
      'documentation',
      'deployment',
      'analysis',
      'research',
      'architecture',
      'code-quality',
      'devops',
      'database',
      'api',
      'frontend',
      'backend',
      'infrastructure',
    ];

    if (skillData.category && !validCategories.includes(skillData.category)) {
      warnings.push(
        `Consider using standard category. Valid: ${validCategories.join(', ')}`
      );
    }

    return warnings;
  }

  /**
   * Format validation results for display
   */
  formatResults(validationResult) {
    let output = '';

    if (validationResult.valid) {
      output += '✅ Skill is valid\n';
    } else {
      output += '❌ Skill has errors:\n\n';

      for (const error of validationResult.errors) {
        if (error.type === 'schema') {
          output += 'Schema Errors:\n';
          for (const schemaError of error.errors) {
            output += `  - ${schemaError.instancePath || 'root'}: ${schemaError.message}\n`;
          }
        } else {
          output += `  - [${error.type}] ${error.field}: ${error.message}\n`;
        }
      }
    }

    if (validationResult.warnings.length > 0) {
      output += '\n⚠️ Warnings:\n';
      for (const warning of validationResult.warnings) {
        output += `  - ${warning.message || warning}\n`;
      }
    }

    return output;
  }
}

module.exports = SkillValidator;
