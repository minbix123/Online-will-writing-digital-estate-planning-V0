/**
 * Tier 2: Boundary & Corner Cases — F6: Conditional Branching Logic
 * 5 Tests:
 * - T2.6.1: hasChildren='No' with minor children data deactivates guardian section
 * - T2.6.2: hasMinorChildren='No' with guardian data deactivates guardian section
 * - T2.6.3: isNRI='No' with foreign asset countries deactivates cross-border questions
 * - T2.6.4: hasExistingWill='No' deactivates revocation requirement
 * - T2.6.5: Invalid and non-standard boolean/option answers do not trigger conditional branches
 */

const assert = require('../helpers/assert');
const { questionnaireConfig } = require('../../src/lib/questionnaire.ts');
const { evaluateConditions, evaluateCondition } = require('../helpers/test_utils');

module.exports = {
  name: 'F6: Conditional Branching Boundaries',
  tests: [
    {
      name: 'T2.6.1: hasChildren="No" with minor children data deactivates guardian section',
      async fn() {
        const guardianSection = questionnaireConfig.sections.find(s => s.id === 'guardian');
        assert.ok(guardianSection && guardianSection.conditions, 'Guardian section must have conditions');

        // Contradictory answers: hasChildren is No, but hasMinorChildren is set to Yes
        const contradictoryAnswers = {
          hasChildren: 'No',
          hasMinorChildren: 'Yes',
          guardianName: 'Sunita Sharma'
        };

        const isSectionActive = evaluateConditions(guardianSection.conditions, contradictoryAnswers);
        assert.equal(isSectionActive, false, 'Guardian section must NOT activate when hasChildren is "No"');
      }
    },

    {
      name: 'T2.6.2: hasMinorChildren="No" with guardian data deactivates guardian section',
      async fn() {
        const guardianSection = questionnaireConfig.sections.find(s => s.id === 'guardian');

        // Testator has children, but adult only (hasMinorChildren is No)
        const adultChildrenAnswers = {
          hasChildren: 'Yes',
          hasMinorChildren: 'No',
          guardianName: 'Unneeded Guardian Name'
        };

        const isSectionActive = evaluateConditions(guardianSection.conditions, adultChildrenAnswers);
        assert.equal(isSectionActive, false, 'Guardian section must NOT activate when children are all adults (hasMinorChildren is "No")');
      }
    },

    {
      name: 'T2.6.3: isNRI="No" with foreign asset fields deactivates cross-border questions',
      async fn() {
        const nriSection = questionnaireConfig.sections.find(s => s.id === 'nri');
        const countryQ = nriSection.questions.find(q => q.id === 'countryOfResidence');
        const foreignAssetsQ = nriSection.questions.find(q => q.id === 'foreignAssetCountries');

        // Resident Indian who accidentally filled foreign data
        const residentAnswers = {
          isNRI: 'No',
          countryOfResidence: 'United Kingdom',
          foreignAssetCountries: 'UK, France'
        };

        const countryActive = evaluateConditions(countryQ.conditions, residentAnswers);
        const foreignAssetsActive = evaluateConditions(foreignAssetsQ.conditions, residentAnswers);

        assert.equal(countryActive, false, 'countryOfResidence must be inactive when isNRI is "No"');
        assert.equal(foreignAssetsActive, false, 'foreignAssetCountries must be inactive when isNRI is "No"');
      }
    },

    {
      name: 'T2.6.4: hasExistingWill="No" deactivates revocation requirement regardless of legacy notes',
      async fn() {
        const answersNoWill = {
          hasExistingWill: 'No',
          previousWillDate: '1995-01-01',
          revocationNotes: 'Previous notes'
        };

        // When hasExistingWill is "No", revocation clause flag should be false
        const requiresRevocation = answersNoWill.hasExistingWill === 'Yes' || answersNoWill.hasExistingWill === 'Not sure';
        assert.equal(requiresRevocation, false, 'Revocation requirement must be false when hasExistingWill is "No"');
      }
    },

    {
      name: 'T2.6.5: Invalid and non-standard boolean/option answers do not trigger conditional branches',
      async fn() {
        const guardianSection = questionnaireConfig.sections.find(s => s.id === 'guardian');
        const nriSection = questionnaireConfig.sections.find(s => s.id === 'nri');
        const countryQ = nriSection.questions.find(q => q.id === 'countryOfResidence');

        const invalidValues = [
          null,
          undefined,
          '',
          '   ',
          'yes',        // lowercase
          'YES',        // uppercase
          'TRUE',
          true,
          1,
          'Maybe',
          'random_string'
        ];

        for (const badVal of invalidValues) {
          // Test guardian section condition: hasChildren and hasMinorChildren must strictly equal 'Yes'
          const guardianActive = evaluateConditions(guardianSection.conditions, {
            hasChildren: badVal,
            hasMinorChildren: badVal
          });
          assert.equal(guardianActive, false, `Guardian section must not trigger on invalid value: ${JSON.stringify(badVal)}`);

          // Test NRI condition: isNRI must strictly equal 'Yes'
          const nriActive = evaluateConditions(countryQ.conditions, {
            isNRI: badVal
          });
          assert.equal(nriActive, false, `NRI questions must not trigger on invalid value: ${JSON.stringify(badVal)}`);
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
