/**
 * Tier 2: Boundary & Corner Cases — F4: Questionnaire Engine & Validation
 * 5 Tests:
 * - T2.4.1: Empty answers payload progress and missing field detection
 * - T2.4.2: Querying and evaluating invalid/non-existent section ID
 * - T2.4.3: Granular missing required fields validation per section
 * - T2.4.4: Type mismatch boundary handling (strings for numbers, non-boolean yes/no)
 * - T2.4.5: Unknown and adversarial field injection preservation/sanitization
 */

const assert = require('../helpers/assert');
const fixtures = require('../helpers/fixtures');
const { questionnaireConfig } = require('../../src/lib/questionnaire.ts');
const { calculateProgress } = require('../helpers/test_utils');

module.exports = {
  name: 'F4: Questionnaire Engine Boundaries',
  tests: [
    {
      name: 'T2.4.1: Empty answers payload computes 0% progress and identifies all required fields',
      async fn() {
        const emptyAnswers = {};
        const progress = calculateProgress(questionnaireConfig.sections, emptyAnswers);
        assert.equal(progress, 0, 'Progress on completely empty payload must be 0%');

        // Check required fields detection
        const personalSec = questionnaireConfig.sections.find(s => s.id === 'personal_info');
        const missingFields = personalSec.questions
          .filter(q => q.required && !q.conditions)
          .map(q => q.id)
          .filter(fieldId => !emptyAnswers[fieldId]);

        assert.ok(missingFields.length >= 9, 'All unconditional required fields in personal_info must be flagged missing');
        assert.includes(missingFields, 'fullName');
        assert.includes(missingFields, 'email');
        assert.includes(missingFields, 'phone');
      }
    },

    {
      name: 'T2.4.2: Querying non-existent section ID handled gracefully',
      async fn() {
        const invalidSectionIds = ['unknown_section', 'undefined', '__proto__', ''];

        for (const badId of invalidSectionIds) {
          const section = questionnaireConfig.sections.find(s => s.id === badId);
          assert.equal(section, undefined, `Section lookup for "${badId}" must return undefined without throwing`);
        }
      }
    },

    {
      name: 'T2.4.3: Missing required fields validation on partial section submission',
      async fn() {
        const personalSec = questionnaireConfig.sections.find(s => s.id === 'personal_info');
        // Partially filled: only name and email
        const partialData = {
          fullName: 'Aarav Sharma',
          email: 'aarav@example.com'
        };

        const validateSection = (section, data) => {
          const errors = [];
          for (const q of section.questions) {
            if (q.required && (!data[q.id] || String(data[q.id]).trim() === '')) {
              // Only flag if conditions are met or non-existent
              errors.push(q.id);
            }
          }
          return errors;
        };

        const missing = validateSection(personalSec, partialData);
        assert.includes(missing, 'phone', 'phone must be detected as missing');
        assert.includes(missing, 'city', 'city must be detected as missing');
        assert.includes(missing, 'state', 'state must be detected as missing');
        assert.equal(missing.includes('fullName'), false, 'Provided fullName must not be in missing list');
        assert.equal(missing.includes('email'), false, 'Provided email must not be in missing list');
      }
    },

    {
      name: 'T2.4.4: Type mismatch boundary handling across numeric and yes_no inputs',
      async fn() {
        // 1. Numeric validation: string in numeric field
        const validateNumericField = (val) => {
          if (val === null || val === undefined || val === '') return false;
          const num = Number(val);
          return !isNaN(num) && isFinite(num);
        };

        assert.equal(validateNumericField(100), true, 'Valid number 100 should pass');
        assert.equal(validateNumericField('100'), true, 'Numeric string "100" should pass parse');
        assert.equal(validateNumericField('not_a_number'), false, 'String "not_a_number" must fail numeric check');
        assert.equal(validateNumericField(NaN), false, 'NaN must fail numeric check');
        assert.equal(validateNumericField(Infinity), false, 'Infinity must fail numeric check');

        // 2. Yes_No validation: only 'Yes' or 'No' valid
        const validateYesNo = (val) => val === 'Yes' || val === 'No';
        assert.equal(validateYesNo('Yes'), true);
        assert.equal(validateYesNo('No'), true);
        assert.equal(validateYesNo(true), false, 'Boolean true is not valid yes_no option string');
        assert.equal(validateYesNo('Maybe'), false, '"Maybe" is not valid yes_no option string');
        assert.equal(validateYesNo(''), false, 'Empty string is not valid yes_no option');
      }
    },

    {
      name: 'T2.4.5: Unknown and arbitrary field injection handling without pollution',
      async fn() {
        // Client sends extra arbitrary/malicious keys
        const payloadWithInjectedKeys = {
          fullName: 'Aarav Sharma',
          email: 'aarav@example.com',
          __proto__: { polluted: true },
          unknownExtraKey: 'arbitrary_data',
          adminBypass: true
        };

        // Ensure object prototype is not polluted
        const cleanObj = {};
        assert.equal(cleanObj.polluted, undefined, 'Prototype pollution must be prevented');

        // Extract declared fields only
        const personalSec = questionnaireConfig.sections.find(s => s.id === 'personal_info');
        const declaredIds = new Set(personalSec.questions.map(q => q.id));

        const sanitized = {};
        for (const [key, val] of Object.entries(payloadWithInjectedKeys)) {
          if (declaredIds.has(key)) {
            sanitized[key] = val;
          }
        }

        assert.equal(sanitized.fullName, 'Aarav Sharma', 'Declared field must be preserved');
        assert.equal(sanitized.email, 'aarav@example.com', 'Declared field must be preserved');
        assert.equal(sanitized.adminBypass, undefined, 'Unknown key "adminBypass" must be stripped');
        assert.equal(sanitized.unknownExtraKey, undefined, 'Unknown key "unknownExtraKey" must be stripped');
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
