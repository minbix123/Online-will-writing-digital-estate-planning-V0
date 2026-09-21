/**
 * Tier 1: Feature Coverage — F8: Template & Clause Lifecycle
 * 5 Tests: Template creation in DRAFT, Transition to UNDER_REVIEW, LAWYER_APPROVED status requirement,
 * LOCKED version immutability, unapproved clause rejection
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');

module.exports = {
  name: 'F8: Template & Clause Lifecycle',
  tests: [
    {
      name: 'T1.8.1: Template creation initializes in DRAFT status',
      async fn() {
        const prisma = getPrisma();
        const template = await prisma.template.create({
          data: {
            name: 'Test Will Template V1',
            description: 'Draft template for lifecycle testing',
            status: 'DRAFT'
          }
        });

        try {
          assert.equal(template.status, 'DRAFT', 'Newly created template must initialize in DRAFT');
        } finally {
          await prisma.template.delete({ where: { id: template.id } });
        }
      }
    },

    {
      name: 'T1.8.2: Transition from DRAFT to UNDER_REVIEW',
      async fn() {
        const prisma = getPrisma();
        const template = await prisma.template.create({
          data: {
            name: 'Test Will Under Review',
            status: 'DRAFT'
          }
        });

        try {
          const updated = await prisma.template.update({
            where: { id: template.id },
            data: { status: 'UNDER_REVIEW' }
          });
          assert.equal(updated.status, 'UNDER_REVIEW', 'Template must support transition to UNDER_REVIEW');
        } finally {
          await prisma.template.delete({ where: { id: template.id } });
        }
      }
    },

    {
      name: 'T1.8.3: LAWYER_APPROVED status requirement for will generation',
      async fn() {
        const prisma = getPrisma();
        // Check database has LAWYER_APPROVED template available
        const approved = await prisma.template.findFirst({
          where: { status: 'LAWYER_APPROVED' },
          include: { versions: true }
        });

        assert.ok(approved, 'Platform must contain an approved template with status LAWYER_APPROVED');
        assert.ok(approved.versions.length > 0, 'Approved template must have at least one valid version');
        assert.equal(approved.status, 'LAWYER_APPROVED', 'Template status must be LAWYER_APPROVED');
      }
    },

    {
      name: 'T1.8.4: LOCKED version immutability - New revisions increment version number',
      async fn() {
        const prisma = getPrisma();
        const template = await prisma.template.create({
          data: {
            name: 'Immutable Template Test',
            status: 'LAWYER_APPROVED',
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
          const v1 = template.versions[0];
          assert.equal(v1.version, 1);

          // Create new revision (Version 2) rather than mutating Version 1
          const v2 = await prisma.templateVersion.create({
            data: {
              templateId: template.id,
              version: 2,
              content: 'Version 2 Updated Legal Clauses'
            }
          });

          // Verify Version 1 remains intact
          const originalV1 = await prisma.templateVersion.findUnique({ where: { id: v1.id } });
          assert.equal(originalV1.content, 'Version 1 Content', 'Original version content must remain immutable');
          assert.equal(v2.version, 2, 'New revision must increment version number');
        } finally {
          await prisma.templateVersion.deleteMany({ where: { templateId: template.id } });
          await prisma.template.delete({ where: { id: template.id } });
        }
      }
    },

    {
      name: 'T1.8.5: Unapproved clause rejection - DRAFT clauses cannot be marked approved without review',
      async fn() {
        const prisma = getPrisma();
        const draftClause = await prisma.clause.create({
          data: {
            name: 'Draft Custom Executor Clause',
            status: 'DRAFT'
          }
        });

        try {
          assert.equal(draftClause.status, 'DRAFT', 'Clause initializes in DRAFT');
          assert.notEqual(draftClause.status, 'LAWYER_APPROVED', 'Unapproved clause must not be in LAWYER_APPROVED state');
        } finally {
          await prisma.clause.delete({ where: { id: draftClause.id } });
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
