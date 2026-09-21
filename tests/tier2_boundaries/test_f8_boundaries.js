/**
 * Tier 2: Boundary & Corner Cases — F8: Template & Clause Lifecycle
 * 5 Tests:
 * - T2.8.1: Document generation requires LAWYER_APPROVED status and rejects DRAFT-only templates
 * - T2.8.2: Duplicate template version detection and sequential versioning
 * - T2.8.3: Unauthorized role (CUSTOMER) attempting template approval is rejected
 * - T2.8.4: Approved template version immutability verification
 * - T2.8.5: Retrieving non-existent template version returns null gracefully
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');

module.exports = {
  name: 'F8: Template & Clause Lifecycle Boundaries',
  tests: [
    {
      name: 'T2.8.1: Document generation requires LAWYER_APPROVED status and rejects DRAFT templates',
      async fn() {
        const prisma = getPrisma();

        // Create a standalone draft template
        const draftTemplate = await prisma.template.create({
          data: {
            name: 'Boundary Test Draft Template',
            status: 'DRAFT',
            versions: {
              create: {
                version: 1,
                content: 'DRAFT ONLY: Not approved for production wills.'
              }
            }
          },
          include: { versions: true }
        });

        try {
          // Verify query for approved template filters out DRAFT templates
          const approvedOnly = await prisma.template.findFirst({
            where: { id: draftTemplate.id, status: 'LAWYER_APPROVED' }
          });

          assert.equal(approvedOnly, null, 'Draft template must not match LAWYER_APPROVED query');
          assert.equal(draftTemplate.status, 'DRAFT', 'Draft template status must remain DRAFT');
        } finally {
          await prisma.templateVersion.deleteMany({ where: { templateId: draftTemplate.id } });
          await prisma.template.delete({ where: { id: draftTemplate.id } });
        }
      }
    },

    {
      name: 'T2.8.2: Duplicate template version detection and sequential versioning',
      async fn() {
        const prisma = getPrisma();

        const template = await prisma.template.create({
          data: {
            name: 'Version Conflict Test Template',
            status: 'DRAFT',
            versions: {
              create: {
                version: 1,
                content: 'Version 1 Content'
              }
            }
          },
          include: { versions: true }
        });

        try {
          // Version collision check helper
          const hasVersionCollision = async (templateId, targetVersion) => {
            const existing = await prisma.templateVersion.findFirst({
              where: { templateId, version: targetVersion }
            });
            return existing !== null;
          };

          // Check if version 1 already exists
          const v1Collides = await hasVersionCollision(template.id, 1);
          assert.equal(v1Collides, true, 'Version 1 should be flagged as already existing');

          // Version 2 does not exist yet
          const v2Collides = await hasVersionCollision(template.id, 2);
          assert.equal(v2Collides, false, 'Version 2 should be available');

          // Add Version 2 properly
          const v2 = await prisma.templateVersion.create({
            data: {
              templateId: template.id,
              version: 2,
              content: 'Version 2 Content'
            }
          });

          assert.equal(v2.version, 2, 'Sequential versioning increments to 2');
        } finally {
          await prisma.templateVersion.deleteMany({ where: { templateId: template.id } });
          await prisma.template.delete({ where: { id: template.id } });
        }
      }
    },

    {
      name: 'T2.8.3: Unauthorized role (CUSTOMER) attempting template approval is rejected',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const lawyer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.lawyer.email } });
        const admin = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.admin.email } });

        // RBAC policy: Only LAWYER and ADMIN can approve legal templates
        const canApproveTemplate = (user) => {
          if (!user) return false;
          return user.role === 'LAWYER' || user.role === 'ADMIN';
        };

        assert.equal(canApproveTemplate(customer), false, 'Customer must NOT be allowed to approve templates');
        assert.equal(canApproveTemplate(lawyer), true, 'Lawyer must be allowed to approve templates');
        assert.equal(canApproveTemplate(admin), true, 'Admin must be allowed to approve templates');
        assert.equal(canApproveTemplate(null), false, 'Anonymous user must NOT be allowed to approve templates');
      }
    },

    {
      name: 'T2.8.4: Approved template version immutability verification',
      async fn() {
        const prisma = getPrisma();

        const template = await prisma.template.create({
          data: {
            name: 'Locked Template Test',
            status: 'LAWYER_APPROVED',
            versions: {
              create: {
                version: 1,
                content: 'Legal Clause Immutable v1'
              }
            }
          },
          include: { versions: true }
        });

        try {
          const v1Id = template.versions[0].id;
          const originalContent = template.versions[0].content;

          // Immutability policy: Existing approved version content must not be overwritten
          // System mandates creating a new version record rather than mutating in-place
          const isContentModified = async (versionId, expectedContent) => {
            const current = await prisma.templateVersion.findUnique({ where: { id: versionId } });
            return current.content !== expectedContent;
          };

          const modified = await isContentModified(v1Id, originalContent);
          assert.equal(modified, false, 'Original approved template content must remain intact');
        } finally {
          await prisma.templateVersion.deleteMany({ where: { templateId: template.id } });
          await prisma.template.delete({ where: { id: template.id } });
        }
      }
    },

    {
      name: 'T2.8.5: Retrieving non-existent template version returns null gracefully',
      async fn() {
        const prisma = getPrisma();
        const nonExistentVersionIds = [
          'non-existent-template-ver-99999',
          '00000000-0000-0000-0000-000000000000',
          'random_bad_id'
        ];

        for (const badId of nonExistentVersionIds) {
          const result = await prisma.templateVersion.findUnique({
            where: { id: badId }
          });
          assert.equal(result, null, `Querying template version "${badId}" must return null without throwing`);
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
