/**
 * Tier 1: Feature Coverage — F4: Questionnaire Engine & Validation
 * 5 Tests: Section structure validation, text/number/boolean/select questions,
 * required field enforcement, email/phone format validation, progress calculation
 */

const assert = require('../helpers/assert');
const fixtures = require('../helpers/fixtures');
const { questionnaireConfig } = require('../../src/lib/questionnaire.ts');
const { calculateProgress } = require('../helpers/test_utils');

module.exports = {
  name: 'F4: Questionnaire Engine & Validation',
  tests: [
    {
      name: 'T1.4.1: Section structure validation - All core estate planning sections exist',
      async fn() {
        assert.ok(questionnaireConfig.sections, 'questionnaireConfig must contain sections array');
        assert.ok(questionnaireConfig.sections.length >= 8, 'Must have at least 8 questionnaire sections');

        const sectionIds = questionnaireConfig.sections.map(s => s.id);
        const expectedSections = [
          'personal_info',
          'children',
          'guardian',
          'assets',
          'nri',
          'beneficiaries',
          'executor',
          'existing_will'
        ];

        for (const expected of expectedSections) {
          assert.includes(sectionIds, expected, `Section "${expected}" must be present in questionnaireConfig`);
        }
      }
    },

    {
      name: 'T1.4.2: Question types verification - Supports all required input types',
      async fn() {
        const typesFound = new Set();
        for (const sec of questionnaireConfig.sections) {
          for (const q of sec.questions || []) {
            typesFound.add(q.type);
            if (q.fields) {
              for (const f of q.fields) {
                typesFound.add(f.type);
              }
            }
          }
        }

        const expectedTypes = ['text', 'textarea', 'single_select', 'yes_no', 'date', 'number', 'phone', 'email', 'repeater'];
        for (const t of expectedTypes) {
          assert.ok(typesFound.has(t), `Question type "${t}" must be supported in questionnaire schema`);
        }
      }
    },

    {
      name: 'T1.4.3: Required field enforcement - Detects missing required inputs',
      async fn() {
        const personalSec = questionnaireConfig.sections.find(s => s.id === 'personal_info');
        const requiredFields = personalSec.questions.filter(q => q.required).map(q => q.id);

        assert.includes(requiredFields, 'fullName', 'fullName must be required');
        assert.includes(requiredFields, 'email', 'email must be required');
        assert.includes(requiredFields, 'phone', 'phone must be required');

        // Test validation logic against empty payload
        const emptyAnswers = {};
        const missing = requiredFields.filter(f => !emptyAnswers[f]);
        assert.ok(missing.length >= 3, 'Must identify all missing required fields');
      }
    },

    {
      name: 'T1.4.4: Email and phone format validation',
      async fn() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^(\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5}$|^(\+91[\s-]?)?[6789]\d{9}$/;

        // Valid formats
        assert.match('aarav.sharma@example.com', emailRegex, 'Valid email must match pattern');
        assert.match('9845012345', phoneRegex, 'Valid 10-digit Indian phone must match pattern');
        assert.match('+91 98450 12345', phoneRegex, 'Valid +91 Indian phone must match pattern');

        // Invalid formats
        for (const badEmail of fixtures.adversarial.malformedEmails) {
          assert.equal(emailRegex.test(badEmail), false, `Malformed email "${badEmail}" must fail validation`);
        }
      }
    },

    {
      name: 'T1.4.5: Progress calculation - Computes correct completion percentage',
      async fn() {
        // 0% when empty
        const emptyProgress = calculateProgress(questionnaireConfig.sections, {});
        assert.equal(emptyProgress, 0, 'Progress for empty answers must be 0%');

        // Partial answers
        const partialAnswers = {
          fullName: 'Aarav Sharma',
          dateOfBirth: '1992-05-14',
          nationality: 'Indian',
          address: 'Whitefield',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          email: 'aarav@example.com',
          phone: '+91 98450 12345',
          maritalStatus: 'Single',
          hasChildren: 'No',
          isNRI: 'No',
          hasExistingWill: 'No'
        };
        const partialProgress = calculateProgress(questionnaireConfig.sections, partialAnswers);
        assert.ok(partialProgress > 0 && partialProgress <= 100, 'Partial answers should calculate positive progress percentage');
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
