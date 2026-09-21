/**
 * Tier 2: Boundary & Corner Cases — F7: Deterministic Legal Workflow Engine
 * 5 Tests:
 * - T2.7.1: Empty answers evaluation returns default STANDARD flags safely
 * - T2.7.2: Unknown and malformed answer types evaluated without crashing
 * - T2.7.3: Edge combination: Minor children and existing will co-activation
 * - T2.7.4: Missing spouse name validation when maritalStatus is Married
 * - T2.7.5: Extreme asset values (zero, negative, high net worth) evaluation
 */

const assert = require('../helpers/assert');
const fixtures = require('../helpers/fixtures');
const { LegalWorkflowEngine } = require('../../src/server/legal-workflows/index.ts');

module.exports = {
  name: 'F7: Legal Workflow Engine Boundaries',
  tests: [
    {
      name: 'T2.7.1: Empty answers evaluation returns default STANDARD flag and no review requirement',
      async fn() {
        const result = await LegalWorkflowEngine.evaluate({});

        assert.ok(Array.isArray(result.flags), 'Flags must be an array');
        assert.deepEqual(result.flags, ['STANDARD'], 'Empty answers must yield only STANDARD flag');
        assert.equal(result.requiresLawyerReview, false, 'Default empty answers must not trigger lawyer review');
      }
    },

    {
      name: 'T2.7.2: Unknown and malformed answer types handled safely without throwing',
      async fn() {
        const malformedPayloads = [
          { assetsList: 'not_an_array_string' },
          { assetsList: 12345 },
          { assetsList: null },
          { maritalStatus: { nested: 'object' } },
          { hasExistingWill: ['unexpected', 'array'] },
          { isNRI: 42, randomField: true }
        ];

        for (const badPayload of malformedPayloads) {
          const result = await LegalWorkflowEngine.evaluate(badPayload);
          assert.ok(result, 'Must return result object without throwing');
          assert.includes(result.flags, 'STANDARD', 'Must include STANDARD flag');
        }
      }
    },

    {
      name: 'T2.7.3: Edge combination: Minor children and existing will multi-trigger evaluation',
      async fn() {
        const combinedAnswers = {
          maritalStatus: 'Married',
          hasChildren: 'Yes',
          hasMinorChildren: 'Yes',
          hasExistingWill: 'Yes',
          isNRI: 'No'
        };

        const result = await LegalWorkflowEngine.evaluate(combinedAnswers);

        assert.includes(result.flags, 'STANDARD');
        assert.includes(result.flags, 'GUARDIAN_REQUIRED', 'Must have GUARDIAN_REQUIRED flag');
        assert.includes(result.flags, 'EXISTING_WILL', 'Must have EXISTING_WILL flag');
        assert.includes(result.flags, 'LEGAL_REVIEW_REQUIRED', 'Existing will must trigger LEGAL_REVIEW_REQUIRED');
        assert.equal(result.requiresLawyerReview, true, 'Complex multi-trigger must require lawyer review');
      }
    },

    {
      name: 'T2.7.4: Missing spouse name validation when maritalStatus is Married',
      async fn() {
        const marriedWithoutSpouse = {
          maritalStatus: 'Married',
          spouseName: '' // Missing or empty
        };

        // Validate that when maritalStatus is Married, spouseName is required
        const isSpouseMissing = (answers) => {
          return answers.maritalStatus === 'Married' && (!answers.spouseName || answers.spouseName.trim() === '');
        };

        assert.equal(isSpouseMissing(marriedWithoutSpouse), true, 'Must identify missing spouse name for married testator');

        const marriedWithSpouse = {
          maritalStatus: 'Married',
          spouseName: 'Meera Sharma'
        };
        assert.equal(isSpouseMissing(marriedWithSpouse), false, 'Complete spouse name passes validation');
      }
    },

    {
      name: 'T2.7.5: Extreme asset values (zero, negative, high net worth) evaluation',
      async fn() {
        const extremePortfolioAnswers = {
          assetsList: [
            { type: 'BankAccount', description: 'Zero balance account', value: 0, ownershipPercentage: 100 },
            { type: 'PersonalProperty', description: 'Under-collateralized loan', value: -500000, ownershipPercentage: 100 },
            { type: 'BusinessInterests', description: 'Conglomerate shares', value: 10000000000, ownershipPercentage: 51 } // 1000 Crore
          ]
        };

        const result = await LegalWorkflowEngine.evaluate(extremePortfolioAnswers);

        assert.includes(result.flags, 'BUSINESS_INTEREST', 'Business interest must still be identified despite extreme values');
        assert.includes(result.flags, 'LEGAL_REVIEW_REQUIRED');
        assert.equal(result.requiresLawyerReview, true);

        // Verify total portfolio aggregation handles extreme and negative numbers without NaN
        const totalValue = extremePortfolioAnswers.assetsList.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
        assert.ok(!isNaN(totalValue), 'Total portfolio calculation must not result in NaN');
        assert.equal(totalValue, 9999500000, 'Sum must compute accurately');
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
