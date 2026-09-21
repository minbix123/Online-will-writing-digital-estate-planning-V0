/**
 * Tier 1: Feature Coverage — F7: Deterministic Legal Workflow Engine
 * 5 Tests: GUARDIAN_REQUIRED rule evaluation, NRI flag evaluation, BUSINESS_INTEREST flag evaluation,
 * EXISTING_WILL flag evaluation, lawyer review requirement determination
 */

const assert = require('../helpers/assert');
const { LegalWorkflowEngine } = require('../../src/server/legal-workflows/index.ts');

module.exports = {
  name: 'F7: Deterministic Legal Workflow Engine',
  tests: [
    {
      name: 'T1.7.1: GUARDIAN_REQUIRED rule evaluation for minor children',
      async fn() {
        const result = await LegalWorkflowEngine.evaluate({
          maritalStatus: 'Married',
          hasChildren: 'Yes',
          hasMinorChildren: 'Yes',
          isNRI: 'No'
        });

        assert.ok(result.flags, 'Evaluation must return flags array');
        assert.includes(result.flags, 'GUARDIAN_REQUIRED', 'Must include GUARDIAN_REQUIRED flag for minor children');
        assert.includes(result.flags, 'STANDARD', 'Must always include base STANDARD flag');
      }
    },

    {
      name: 'T1.7.2: NRI and FOREIGN_ASSETS flag evaluation',
      async fn() {
        const result = await LegalWorkflowEngine.evaluate({
          isNRI: 'Yes',
          countryOfResidence: 'UAE',
          foreignAssetCountries: 'Dubai'
        });

        assert.includes(result.flags, 'NRI', 'Must include NRI flag');
        assert.includes(result.flags, 'FOREIGN_ASSETS', 'Must include FOREIGN_ASSETS flag');
        assert.includes(result.flags, 'LEGAL_REVIEW_REQUIRED', 'NRI estate must mandate legal review');
        assert.equal(result.requiresLawyerReview, true, 'requiresLawyerReview must be true for NRI');
      }
    },

    {
      name: 'T1.7.3: BUSINESS_INTEREST flag evaluation for commercial assets',
      async fn() {
        const result = await LegalWorkflowEngine.evaluate({
          assetsList: [
            { type: 'BankAccount', description: 'Savings A/c' },
            { type: 'BusinessInterests', description: '51% Private Limited Shares' }
          ]
        });

        assert.includes(result.flags, 'BUSINESS_INTEREST', 'Must include BUSINESS_INTEREST flag');
        assert.includes(result.flags, 'LEGAL_REVIEW_REQUIRED', 'Business succession must mandate legal review');
        assert.equal(result.requiresLawyerReview, true, 'requiresLawyerReview must be true');
      }
    },

    {
      name: 'T1.7.4: EXISTING_WILL flag evaluation for prior estate documents',
      async fn() {
        // Explicit Yes
        const resYes = await LegalWorkflowEngine.evaluate({ hasExistingWill: 'Yes' });
        assert.includes(resYes.flags, 'EXISTING_WILL', 'Must include EXISTING_WILL flag for existing will');
        assert.equal(resYes.requiresLawyerReview, true, 'Existing will mandates lawyer review');

        // Not sure
        const resNotSure = await LegalWorkflowEngine.evaluate({ hasExistingWill: 'Not sure' });
        assert.includes(resNotSure.flags, 'EXISTING_WILL', 'Must include EXISTING_WILL flag for uncertain will status');
        assert.equal(resNotSure.requiresLawyerReview, true);
      }
    },

    {
      name: 'T1.7.5: Lawyer review requirement determination',
      async fn() {
        // Standard Simple Indian Estate (No lawyer review needed)
        const simpleResult = await LegalWorkflowEngine.evaluate({
          maritalStatus: 'Married',
          hasChildren: 'No',
          isNRI: 'No',
          hasExistingWill: 'No',
          assetsList: [{ type: 'BankAccount' }, { type: 'Property' }]
        });

        assert.equal(simpleResult.requiresLawyerReview, false, 'Standard simple estate should NOT require lawyer review');
        assert.deepEqual(simpleResult.flags, ['STANDARD'], 'Only STANDARD flag should be assigned');

        // Complex Estate with multiple triggers
        const complexResult = await LegalWorkflowEngine.evaluate({
          maritalStatus: 'Other',
          isNRI: 'Yes',
          hasExistingWill: 'Yes'
        });

        assert.equal(complexResult.requiresLawyerReview, true, 'Complex estate must require lawyer review');
        assert.includes(complexResult.flags, 'LEGAL_REVIEW_REQUIRED');
        assert.includes(complexResult.flags, 'MANUAL_CONSULTATION_REQUIRED');
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
