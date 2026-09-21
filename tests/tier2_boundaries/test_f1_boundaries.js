/**
 * Tier 2: Boundary & Corner Cases — F1: Auth & Demo Accounts
 * 5 Tests:
 * - T2.1.1: Empty and null credentials rejection
 * - T2.1.2: Oversized credential strings handling (10k chars)
 * - T2.1.3: Whitespace handling and padding rejection
 * - T2.1.4: Case-sensitivity and case mismatch boundary behavior
 * - T2.1.5: Malformed email syntax validation and rejection
 */

const assert = require('../helpers/assert');
const fixtures = require('../helpers/fixtures');
const { authOptions } = require('../../src/lib/auth.ts');

const provider = authOptions.providers[0];
const authorize = provider.options?.authorize || provider.authorize;

module.exports = {
  name: 'F1: Auth & Demo Accounts Boundaries',
  tests: [
    {
      name: 'T2.1.1: Empty and null credentials return null without throwing',
      async fn() {
        // Null object
        const resNull = await authorize(null);
        assert.equal(resNull, null, 'authorize(null) must return null');

        // Undefined credentials
        const resUndef = await authorize(undefined);
        assert.equal(resUndef, null, 'authorize(undefined) must return null');

        // Empty email with valid password
        const resEmptyEmail = await authorize({ email: '', password: 'password123' });
        assert.equal(resEmptyEmail, null, 'Empty email string must be rejected');

        // Valid email with empty password
        const resEmptyPass = await authorize({ email: fixtures.demoUsers.customer.email, password: '' });
        assert.equal(resEmptyPass, null, 'Empty password string must be rejected');

        // Both empty
        const resBothEmpty = await authorize({ email: '', password: '' });
        assert.equal(resBothEmpty, null, 'Both empty credentials must be rejected');
      }
    },

    {
      name: 'T2.1.2: Oversized credential strings (10KB+) handled safely without crashing',
      async fn() {
        const hugeString = fixtures.adversarial.hugeString10k;

        // 10k character email
        const hugeEmailRes = await authorize({
          email: `${hugeString}@demo.com`,
          password: 'password123'
        });
        assert.equal(hugeEmailRes, null, 'Oversized email string must return null safely');

        // 10k character password
        const hugePassRes = await authorize({
          email: fixtures.demoUsers.customer.email,
          password: hugeString
        });
        assert.equal(hugePassRes, null, 'Oversized password string must return null safely');
      }
    },

    {
      name: 'T2.1.3: Whitespace padded credentials handling',
      async fn() {
        const validUser = fixtures.demoUsers.customer;

        // Email with leading and trailing whitespace
        const paddedEmail = `  ${validUser.email}  `;
        const resPaddedEmail = await authorize({
          email: paddedEmail,
          password: validUser.password
        });
        assert.ok(resPaddedEmail === null || resPaddedEmail.email === validUser.email, 'Untrimmed padded email must either normalize or safely reject');

        // Password with leading/trailing whitespace should NOT authenticate (passwords are sensitive to whitespace)
        const paddedPass = ` ${validUser.password} `;
        const resPaddedPass = await authorize({
          email: validUser.email,
          password: paddedPass
        });
        assert.equal(resPaddedPass, null, 'Whitespace altered password must be rejected');

        // Whitespace only
        const resSpaces = await authorize({ email: '   ', password: '   ' });
        assert.equal(resSpaces, null, 'Whitespace only credentials must be rejected');
      }
    },

    {
      name: 'T2.1.4: Email case-sensitivity boundary behavior',
      async fn() {
        const validUser = fixtures.demoUsers.customer;

        // Uppercase email
        const upperEmail = validUser.email.toUpperCase();
        const upperRes = await authorize({
          email: upperEmail,
          password: validUser.password
        });
        // In default SQLite exact match, upper case won't match lowercase record
        // Either null or matching user if normalized; must not throw error
        assert.ok(upperRes === null || upperRes.email === validUser.email, 'Case variation must either normalize or safely reject');

        // Mixed case email
        const mixedEmail = 'CuStOmEr@DeMo.CoM';
        const mixedRes = await authorize({
          email: mixedEmail,
          password: validUser.password
        });
        assert.ok(mixedRes === null || mixedRes.email === validUser.email, 'Mixed case must either normalize or safely reject');
      }
    },

    {
      name: 'T2.1.5: Malformed email syntax validation and rejection across adversarial set',
      async fn() {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        for (const badEmail of fixtures.adversarial.malformedEmails) {
          // Verify format check fails
          assert.equal(emailRegex.test(badEmail), false, `Adversarial email "${badEmail}" must fail format regex`);

          // Verify auth does not accept malformed email
          const res = await authorize({
            email: badEmail,
            password: 'password123'
          });
          assert.equal(res, null, `Malformed email "${badEmail}" must be rejected by auth system`);
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
