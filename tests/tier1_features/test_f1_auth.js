/**
 * Tier 1: Feature Coverage — F1: Auth & Demo Accounts
 * 5 Tests: Customer login, NRI login, Lawyer login, Admin login, password verification integrity
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');

// Load NextAuth authorize function from application auth config
const { authOptions } = require('../../src/lib/auth.ts');
const provider = authOptions.providers[0];
const authorize = provider.options?.authorize || provider.authorize;

module.exports = {
  name: 'F1: Authentication & Demo Accounts',
  tests: [
    {
      name: 'T1.1.1: Customer login succeeds with valid credentials',
      async fn() {
        const creds = fixtures.demoUsers.customer;
        const user = await authorize(creds);

        assert.ok(user, 'Customer login should return user object');
        assert.equal(user.email, creds.email, 'User email must match demo customer email');
        assert.equal(user.role, 'CUSTOMER', 'Role must be CUSTOMER');
        assert.ok(user.id, 'User must have a valid database ID');
        assert.equal(user.name, creds.name, 'User name must match database record');
      }
    },

    {
      name: 'T1.1.2: NRI Customer login succeeds with valid credentials',
      async fn() {
        const creds = fixtures.demoUsers.nriCustomer;
        const user = await authorize(creds);

        assert.ok(user, 'NRI customer login should return user object');
        assert.equal(user.email, creds.email, 'User email must match demo NRI email');
        assert.equal(user.role, 'CUSTOMER', 'Role must be CUSTOMER');
        assert.ok(user.id, 'User must have a valid database ID');
      }
    },

    {
      name: 'T1.1.3: Lawyer login succeeds with valid credentials',
      async fn() {
        const creds = fixtures.demoUsers.lawyer;
        const user = await authorize(creds);

        assert.ok(user, 'Lawyer login should return user object');
        assert.equal(user.email, creds.email, 'User email must match demo lawyer email');
        assert.equal(user.role, 'LAWYER', 'Role must be LAWYER');
        assert.ok(user.id, 'User must have a valid database ID');
      }
    },

    {
      name: 'T1.1.4: Admin login succeeds with valid credentials',
      async fn() {
        const creds = fixtures.demoUsers.admin;
        const user = await authorize(creds);

        assert.ok(user, 'Admin login should return user object');
        assert.equal(user.email, creds.email, 'User email must match demo admin email');
        assert.equal(user.role, 'ADMIN', 'Role must be ADMIN');
        assert.ok(user.id, 'User must have a valid database ID');
      }
    },

    {
      name: 'T1.1.5: Password verification integrity and credential sanitization',
      async fn() {
        // 1. Invalid password rejection
        const badUser = await authorize({
          email: fixtures.demoUsers.customer.email,
          password: 'wrong_password_999'
        });
        assert.equal(badUser, null, 'Authentication must return null for incorrect password');

        // 2. Successful auth strips sensitive password field from session user
        const goodUser = await authorize(fixtures.demoUsers.customer);
        assert.ok(goodUser, 'Valid auth must succeed');
        assert.equal(goodUser.password, undefined, 'Returned user object must never leak password hash or plaintext');
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
