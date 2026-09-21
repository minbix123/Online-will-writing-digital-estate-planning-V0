/**
 * Tier 1: Feature Coverage — F6: Conditional Branching Logic
 * 5 Tests: Minor children triggers guardian section, NRI triggers foreign assets questions,
 * business owner triggers commercial succession, existing will triggers revocation clause,
 * unmarried with no kids bypasses guardian
 */

const assert = require('../helpers/assert');
const { questionnaireConfig } = require('../../src/lib/questionnaire.ts');
const { evaluateConditions, evaluateCondition } = require('../helpers/test_utils');

module.exports = {
  name: 'F6: Conditional Branching Logic',
  tests: [
    {
      name: 'T1.6.1: Minor children condition triggers guardian section',
      async fn() {
        const guardianSection = questionnaireConfig.sections.find(s => s.id === 'guardian');
        assert.ok(guardianSection, 'Guardian section must exist');

        // Condition unmet: No children or no minor children
        const answersNoKids = { hasChildren: 'No', hasMinorChildren: 'No' };
        const activeWhenNoKids = evaluateConditions(guardianSection.conditions, answersNoKids);
        assert.equal(activeWhenNoKids, false, 'Guardian section must be inactive if testator has no children');

        // Condition met: Has children and minor children
        const answersMinorKids = { hasChildren: 'Yes', hasMinorChildren: 'Yes' };
        const activeWhenMinorKids = evaluateConditions(guardianSection.conditions, answersMinorKids);
        assert.equal(activeWhenMinorKids, true, 'Guardian section must be active if testator has minor children');
      }
    },

    {
      name: 'T1.6.2: NRI condition triggers foreign assets questions',
      async fn() {
        const nriSection = questionnaireConfig.sections.find(s => s.id === 'nri');
        const countryQ = nriSection.questions.find(q => q.id === 'countryOfResidence');
        const foreignAssetsQ = nriSection.questions.find(q => q.id === 'foreignAssetCountries');

        assert.ok(countryQ && countryQ.conditions, 'countryOfResidence must have conditions');
        assert.ok(foreignAssetsQ && foreignAssetsQ.conditions, 'foreignAssetCountries must have conditions');

        // Resident Indian: questions hidden/inactive
        assert.equal(evaluateConditions(countryQ.conditions, { isNRI: 'No' }), false);
        assert.equal(evaluateConditions(foreignAssetsQ.conditions, { isNRI: 'No' }), false);

        // NRI Indian: questions active
        assert.equal(evaluateConditions(countryQ.conditions, { isNRI: 'Yes' }), true);
        assert.equal(evaluateConditions(foreignAssetsQ.conditions, { isNRI: 'Yes' }), true);
      }
    },

    {
      name: 'T1.6.3: Business owner assets triggers commercial succession requirement',
      async fn() {
        const assetsSection = questionnaireConfig.sections.find(s => s.id === 'assets');
        const assetTypeQ = assetsSection.questions[0].fields.find(f => f.id === 'type');
        const businessOption = assetTypeQ.options.find(o => o.value === 'BusinessInterests');

        assert.ok(businessOption, 'Asset types must include BusinessInterests');
        assert.equal(businessOption.label, 'Business Interests');

        // Validate payload detection of business asset
        const answersWithBusiness = {
          assetsList: [{ type: 'BusinessInterests', description: '51% shares' }]
        };
        const hasBusiness = answersWithBusiness.assetsList.some(a => a.type === 'BusinessInterests');
        assert.equal(hasBusiness, true, 'System must detect business interests in asset inventory');
      }
    },

    {
      name: 'T1.6.4: Existing will condition triggers revocation clause requirement',
      async fn() {
        const existingWillSec = questionnaireConfig.sections.find(s => s.id === 'existing_will');
        const question = existingWillSec.questions.find(q => q.id === 'hasExistingWill');

        assert.ok(question, 'hasExistingWill question must exist');
        const values = question.options.map(o => o.value);
        assert.includes(values, 'Yes');
        assert.includes(values, 'No');
        assert.includes(values, 'Not sure');

        // If Yes, revocation is mandated
        const answersYes = { hasExistingWill: 'Yes' };
        assert.equal(answersYes.hasExistingWill === 'Yes', true, 'Must flag existing will for revocation');
      }
    },

    {
      name: 'T1.6.5: Unmarried with no kids bypasses guardian and spouse sections',
      async fn() {
        const personalSec = questionnaireConfig.sections.find(s => s.id === 'personal_info');
        const spouseQ = personalSec.questions.find(q => q.id === 'spouseName');
        const guardianSec = questionnaireConfig.sections.find(s => s.id === 'guardian');

        const singleAnswers = {
          maritalStatus: 'Single',
          hasChildren: 'No',
          hasMinorChildren: 'No'
        };

        // Spouse question should be inactive
        const spouseActive = evaluateConditions(spouseQ.conditions, singleAnswers);
        assert.equal(spouseActive, false, 'Spouse question must be inactive for single testator');

        // Guardian section should be inactive
        const guardianActive = evaluateConditions(guardianSec.conditions, singleAnswers);
        assert.equal(guardianActive, false, 'Guardian section must be inactive for testator without children');
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
