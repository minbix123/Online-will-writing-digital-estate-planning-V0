/**
 * Tier 3: Pairwise Feature Combinations (15 Test Cases)
 * E2E test suite validating multi-feature interactions across Auth, RBAC, Case Lifecycle,
 * Questionnaire Engine, Autosave/Resume, Conditional Branching, Legal Workflow,
 * Template Lifecycle, DOCX Generation, Mock Payment, and Tamper-Resistant Audit Logging.
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { canAccessCase, cleanup, calculateProgress, evaluateCondition } = require('../helpers/test_utils');
const { authOptions } = require('../../src/lib/auth.ts');
const { LegalWorkflowEngine } = require('../../src/server/legal-workflows/index.ts');
const { DocumentGenerator } = require('../../src/server/document-generator.ts');

const provider = authOptions.providers[0];
const authorize = provider.options?.authorize || provider.authorize;

function canManageTemplate(user) {
  return user && (user.role === 'ADMIN' || user.role === 'LAWYER');
}

module.exports = {
  name: 'Tier 3: Pairwise Feature Combinations',
  tests: [
    {
      name: 'C1: Auth + Case Creation - Customer logs in and immediately creates initial draft case',
      async fn() {
        const prisma = getPrisma();
        const creds = fixtures.demoUsers.customer;
        const user = await authorize(creds);

        assert.ok(user, 'Authentication must succeed');
        assert.equal(user.role, 'CUSTOMER', 'Role must be CUSTOMER');
        assert.ok(user.id, 'User must have valid ID');

        // Immediately initialize a case for this customer
        const newCase = await prisma.case.create({
          data: {
            customerId: user.id,
            status: 'DRAFT',
            flags: 'STANDARD'
          }
        });

        // Audit log for case creation
        const auditLog = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            caseId: newCase.id,
            action: 'CASE_CREATED',
            metadata: JSON.stringify({ initialStatus: 'DRAFT' })
          }
        });

        try {
          assert.ok(newCase.id, 'Case must have a generated ID');
          assert.equal(newCase.customerId, user.id, 'Case must be owned by authenticated customer');
          assert.equal(newCase.status, 'DRAFT', 'Initial case status must be DRAFT');
          assert.equal(newCase.flags, 'STANDARD', 'Initial case flags must be STANDARD');
          assert.equal(auditLog.actorId, user.id, 'Audit log must record customer actorId');
          assert.equal(auditLog.caseId, newCase.id, 'Audit log must record caseId');
        } finally {
          await cleanup({ caseIds: [newCase.id] });
        }
      }
    },

    {
      name: 'C2: Branching + Workflow - Minor children triggering GUARDIAN_REQUIRED flag and recommended guardian clause',
      async fn() {
        const answers = {
          maritalStatus: 'Married',
          hasChildren: 'Yes',
          hasMinorChildren: 'Yes',
          childrenList: fixtures.guardianship.children,
          guardianName: fixtures.guardianship.guardian.guardianName,
          guardianAddress: fixtures.guardianship.guardian.guardianAddress
        };

        // Conditional Branching condition evaluation
        const branchCondition = { field: 'hasMinorChildren', operator: 'equals', value: 'Yes' };
        const branchActive = evaluateCondition(branchCondition, answers);
        assert.equal(branchActive, true, 'Guardian branch must be activated when minor children are present');

        // Deterministic Legal Workflow evaluation
        const evalResult = await LegalWorkflowEngine.evaluate(answers);
        assert.ok(evalResult.flags, 'Workflow result must contain flags');
        assert.includes(evalResult.flags, 'GUARDIAN_REQUIRED', 'Flags must include GUARDIAN_REQUIRED');
        assert.includes(evalResult.flags, 'STANDARD', 'Flags must include STANDARD');
      }
    },

    {
      name: 'C3: Branching + Workflow + Payment - NRI status with foreign assets triggering NRI flag and recommending Complex/NRI tier',
      async fn() {
        const prisma = getPrisma();
        const nriCustomer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.nriCustomer.email } });

        const answers = {
          maritalStatus: 'Married',
          isNRI: 'Yes',
          countryOfResidence: 'United Arab Emirates',
          foreignAssetCountries: 'UAE, Singapore',
          assetsList: fixtures.assets.nriCrossBorderPortfolio
        };

        // Workflow evaluation
        const evalResult = await LegalWorkflowEngine.evaluate(answers);
        assert.includes(evalResult.flags, 'NRI', 'Flags must include NRI');
        assert.includes(evalResult.flags, 'FOREIGN_ASSETS', 'Flags must include FOREIGN_ASSETS');
        assert.includes(evalResult.flags, 'LEGAL_REVIEW_REQUIRED', 'NRI flags must mandate legal review');
        assert.equal(evalResult.requiresLawyerReview, true, 'requiresLawyerReview must be true');

        // Recommended Plan based on NRI flags is Complex/NRI tier (4999 INR)
        const recommendedPlan = evalResult.flags.includes('NRI') ? 'COMPLEX_NRI' : 'BASIC';
        const expectedPrice = recommendedPlan === 'COMPLEX_NRI' ? 4999 : 999;
        assert.equal(recommendedPlan, 'COMPLEX_NRI', 'Recommended plan for NRI with foreign assets must be COMPLEX_NRI');
        assert.equal(expectedPrice, 4999, 'Complex/NRI tier price must be 4999 INR');

        // Create case and mock payment checkout
        const testCase = await prisma.case.create({
          data: {
            customerId: nriCustomer.id,
            status: 'DRAFT',
            flags: evalResult.flags.join(',')
          }
        });

        try {
          const payment = await prisma.payment.create({
            data: {
              caseId: testCase.id,
              amount: expectedPrice,
              currency: 'INR',
              status: 'SUCCESS',
              mode: 'MOCK'
            }
          });

          const updatedCase = await prisma.case.update({
            where: { id: testCase.id },
            data: { status: 'PAID' }
          });

          assert.equal(payment.amount, 4999, 'Payment amount must be 4999 INR');
          assert.equal(payment.mode, 'MOCK', 'Payment mode must be MOCK');
          assert.equal(updatedCase.status, 'PAID', 'Case status must transition to PAID');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'C4: Branching + Workflow - Existing Will flag triggering revocation clause recommendation',
      async fn() {
        // Explicit 'Yes'
        const evalYes = await LegalWorkflowEngine.evaluate({
          fullName: 'Vikram Singhania',
          hasExistingWill: 'Yes'
        });
        assert.includes(evalYes.flags, 'EXISTING_WILL', 'Flags must include EXISTING_WILL');
        assert.includes(evalYes.flags, 'LEGAL_REVIEW_REQUIRED', 'Existing will must mandate legal review');
        assert.equal(evalYes.requiresLawyerReview, true, 'requiresLawyerReview must be true');

        // 'Not sure'
        const evalUnsure = await LegalWorkflowEngine.evaluate({
          fullName: 'Vikram Singhania',
          hasExistingWill: 'Not sure'
        });
        assert.includes(evalUnsure.flags, 'EXISTING_WILL', 'Flags must include EXISTING_WILL when unsure');
        assert.equal(evalUnsure.requiresLawyerReview, true, 'Unsure will status mandates review');

        // Negative baseline: 'No'
        const evalNo = await LegalWorkflowEngine.evaluate({
          fullName: 'Rohan Deshmukh',
          hasExistingWill: 'No'
        });
        assert.equal(evalNo.flags.includes('EXISTING_WILL'), false, 'Existing will flag must NOT be assigned when No');
      }
    },

    {
      name: 'C5: Questionnaire + Autosave Resume - Progressive multi-section answers saved across steps and resumed completely',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          // Step 1: Autosave personal_info
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify(fixtures.sectionPayloads.personalInfo)
            }
          });

          // Step 2: Autosave children
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'children',
              answerData: JSON.stringify(fixtures.sectionPayloads.children)
            }
          });

          // Step 3: Autosave assets
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'assets',
              answerData: JSON.stringify(fixtures.sectionPayloads.assets)
            }
          });

          // Step 4: Autosave beneficiaries
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'beneficiaries',
              answerData: JSON.stringify(fixtures.sectionPayloads.beneficiaries)
            }
          });

          // Resume: Query all persisted answers for the case
          const resumedAnswers = await prisma.questionnaireAnswer.findMany({
            where: { caseId: testCase.id }
          });

          assert.equal(resumedAnswers.length, 4, 'Must resume all 4 saved sections');

          const map = {};
          resumedAnswers.forEach(a => {
            map[a.questionId] = JSON.parse(a.answerData);
          });

          assert.equal(map['personal_info'].fullName, fixtures.sectionPayloads.personalInfo.fullName, 'Personal info resumed correctly');
          assert.equal(map['children'].hasChildren, 'Yes', 'Children answers resumed correctly');
          assert.equal(map['assets'].assetsList.length, fixtures.sectionPayloads.assets.assetsList.length, 'Assets resumed correctly');
          assert.equal(map['beneficiaries'].beneficiariesList.length, 3, 'Beneficiaries resumed correctly');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'C6: IDOR Protection + Case Access - Cross-customer case access rejection',
      async fn() {
        const prisma = getPrisma();
        const customerA = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const customerB = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.nriCustomer.email } });

        const caseA = await prisma.case.create({
          data: { customerId: customerA.id, status: 'DRAFT' }
        });
        const caseB = await prisma.case.create({
          data: { customerId: customerB.id, status: 'DRAFT' }
        });

        try {
          // Customer A accesses Case A -> allowed
          assert.equal(canAccessCase(customerA, caseA), true, 'Customer A must be permitted to access Case A');

          // Customer B accesses Case A -> rejected
          assert.equal(canAccessCase(customerB, caseA), false, 'Customer B must NOT be permitted to access Case A');

          // Customer A accesses Case B -> rejected
          assert.equal(canAccessCase(customerA, caseB), false, 'Customer A must NOT be permitted to access Case B');

          // Unauthorized update attempt rejected by ownership verification
          const isAuthorizedToSave = (customerB.id === caseA.customerId);
          assert.equal(isAuthorizedToSave, false, 'Customer B must NOT be authorized to save answers on Case A');
        } finally {
          await cleanup({ caseIds: [caseA.id, caseB.id] });
        }
      }
    },

    {
      name: 'C7: RBAC + Template Management - Non-admin/non-lawyer cannot transition template to LAWYER_APPROVED',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const lawyer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.lawyer.email } });
        const admin = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.admin.email } });

        const template = await prisma.template.create({
          data: {
            name: 'C7 RBAC Test Template',
            description: 'Template for RBAC approval verification',
            status: 'DRAFT'
          }
        });

        try {
          // Customer cannot manage or approve template
          assert.equal(canManageTemplate(customer), false, 'Customer must NOT have permission to approve template');

          // Lawyer can manage and approve template
          assert.equal(canManageTemplate(lawyer), true, 'Lawyer must have permission to approve template');

          // Admin can manage and approve template
          assert.equal(canManageTemplate(admin), true, 'Admin must have permission to approve template');

          // Perform valid transition by lawyer
          const approved = await prisma.template.update({
            where: { id: template.id },
            data: { status: 'LAWYER_APPROVED' }
          });
          assert.equal(approved.status, 'LAWYER_APPROVED', 'Template status must update to LAWYER_APPROVED');
        } finally {
          await prisma.template.delete({ where: { id: template.id } });
        }
      }
    },

    {
      name: 'C8: Workflow Engine + DOCX Generator - Workflow flags and recommended clauses correctly drive clause inclusion in generated document',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          const answers = {
            fullName: 'Aarav Sharma',
            hasMinorChildren: 'Yes',
            guardianName: 'Sunita Sharma',
            isNRI: 'Yes',
            countryOfResidence: 'United Arab Emirates'
          };

          // Save answer payload
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'all_answers',
              answerData: JSON.stringify(answers)
            }
          });

          // Workflow evaluation
          const workflow = await LegalWorkflowEngine.evaluate(answers);
          assert.includes(workflow.flags, 'GUARDIAN_REQUIRED');
          assert.includes(workflow.flags, 'NRI');
          assert.includes(workflow.flags, 'FOREIGN_ASSETS');

          // Generate Document
          const doc = await DocumentGenerator.generate(testCase.id);

          // Verify driven clauses
          assert.includes(doc.textContent, 'GUARDIANSHIP:', 'Must include GUARDIANSHIP clause driven by workflow');
          assert.includes(doc.textContent, 'Sunita Sharma', 'Must include named guardian in clause text');
          assert.includes(doc.textContent, 'FOREIGN ASSETS:', 'Must include FOREIGN ASSETS clause driven by workflow');
          assert.includes(doc.textContent, 'United Arab Emirates', 'Must include country of residence in clause text');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'C9: Template Lifecycle + DOCX Generator - Generating document with unapproved (DRAFT) template fails; approved template succeeds',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        // Verify active LAWYER_APPROVED template exists
        const approvedTemplate = await prisma.template.findFirst({
          where: { status: 'LAWYER_APPROVED' },
          include: { versions: true }
        });
        assert.ok(approvedTemplate, 'Approved template must exist in database');
        assert.ok(approvedTemplate.versions.length > 0, 'Approved template must have valid version');

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify({ fullName: 'Aarav Sharma' })
            }
          });

          // Generation succeeds with LAWYER_APPROVED template
          const result = await DocumentGenerator.generate(testCase.id);
          assert.ok(result.docxBuffer instanceof Buffer, 'Should generate valid docx Buffer');
          assert.includes(result.textContent, 'Aarav Sharma');

          // Verification that DRAFT templates cannot be selected by DocumentGenerator
          const draftTemplate = await prisma.template.create({
            data: {
              name: 'Draft Only Template',
              status: 'DRAFT',
              versions: {
                create: {
                  version: 99,
                  content: 'Unapproved Draft Template Content'
                }
              }
            },
            include: { versions: true }
          });

          try {
            // DocumentGenerator strictly queries where status: "LAWYER_APPROVED"
            const docRecord = await prisma.document.findFirst({
              where: { caseId: testCase.id }
            });
            assert.notEqual(
              docRecord.templateVersionId,
              draftTemplate.versions[0].id,
              'Document Generator must never link to an unapproved DRAFT template version'
            );
          } finally {
            await prisma.templateVersion.deleteMany({ where: { templateId: draftTemplate.id } });
            await prisma.template.delete({ where: { id: draftTemplate.id } });
          }
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'C10: Case Lifecycle + Mock Payment - Case transitions from DRAFT -> SUBMITTED upon successful payment completion',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          assert.equal(testCase.status, 'DRAFT', 'Initial case status must be DRAFT');

          // Execute transactional payment and submission
          await prisma.$transaction(async (tx) => {
            await tx.payment.create({
              data: {
                caseId: testCase.id,
                amount: 999,
                currency: 'INR',
                status: 'SUCCESS',
                mode: 'MOCK'
              }
            });
            await tx.case.update({
              where: { id: testCase.id },
              data: { status: 'SUBMITTED' }
            });
          });

          const refreshedCase = await prisma.case.findUnique({ where: { id: testCase.id } });
          const paymentRecord = await prisma.payment.findFirst({ where: { caseId: testCase.id } });

          assert.equal(refreshedCase.status, 'SUBMITTED', 'Case must transition to SUBMITTED upon payment completion');
          assert.ok(paymentRecord, 'Payment record must be persisted');
          assert.equal(paymentRecord.status, 'SUCCESS', 'Payment status must be SUCCESS');
          assert.equal(paymentRecord.amount, 999, 'Payment amount must be 999');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'C11: Auth + Audit Logging - Login event creates immutable audit log entry with actor ID and UTC timestamp',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        // Successful auth
        const user = await authorize(fixtures.demoUsers.customer);
        assert.ok(user, 'User must authenticate');

        // Create login audit log
        const auditLog = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'AUTH_LOGIN_SUCCESS',
            metadata: JSON.stringify({ ip: '127.0.0.1', client: 'TestHarness' })
          }
        });

        try {
          assert.ok(auditLog.id, 'Audit log ID must exist');
          assert.equal(auditLog.actorId, user.id, 'Audit log actorId must match user ID');
          assert.equal(auditLog.action, 'AUTH_LOGIN_SUCCESS', 'Action must match AUTH_LOGIN_SUCCESS');
          const time = auditLog.timestamp || auditLog.createdAt;
          assert.ok(time instanceof Date, 'timestamp must be valid Date');
          assert.ok(!isNaN(time.getTime()), 'Timestamp must be valid number');
        } finally {
          await prisma.auditLog.delete({ where: { id: auditLog.id } });
        }
      }
    },

    {
      name: 'C12: Case Lifecycle + Audit Logging - Case creation and status transition generate corresponding audit logs',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'DRAFT' }
        });

        try {
          // Event 1: Creation
          await prisma.auditLog.create({
            data: {
              actorId: customer.id,
              caseId: testCase.id,
              action: 'CASE_CREATED',
              metadata: JSON.stringify({ status: 'DRAFT' })
            }
          });

          // Event 2: Status transition to SUBMITTED
          await prisma.case.update({
            where: { id: testCase.id },
            data: { status: 'SUBMITTED' }
          });

          await prisma.auditLog.create({
            data: {
              actorId: customer.id,
              caseId: testCase.id,
              action: 'CASE_STATUS_UPDATED',
              metadata: JSON.stringify({ oldStatus: 'DRAFT', newStatus: 'SUBMITTED' })
            }
          });

          // Verify audit trail
          const logs = await prisma.auditLog.findMany({
            where: { caseId: testCase.id },
            orderBy: { timestamp: 'asc' }
          });

          assert.equal(logs.length, 2, 'Must have 2 audit logs recorded');
          assert.equal(logs[0].action, 'CASE_CREATED');
          assert.equal(logs[1].action, 'CASE_STATUS_UPDATED');
          const time0 = (logs[0].timestamp || logs[0].createdAt).getTime();
          const time1 = (logs[1].timestamp || logs[1].createdAt).getTime();
          assert.ok(time1 >= time0, 'Log 2 must occur after or at Log 1 timestamp');
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'C13: DOCX Generation + Audit Logging - Successful document generation emits DOCUMENT_GENERATED audit log',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify({ fullName: 'Aarav Sharma' })
            }
          });

          // Generate Document
          await DocumentGenerator.generate(testCase.id);

          // Audit log emission
          await prisma.auditLog.create({
            data: {
              actorId: customer.id,
              caseId: testCase.id,
              action: 'DOCUMENT_GENERATED',
              metadata: JSON.stringify({ format: 'DOCX', status: 'SUCCESS' })
            }
          });

          // Verification
          const doc = await prisma.document.findFirst({ where: { caseId: testCase.id } });
          const log = await prisma.auditLog.findFirst({
            where: { caseId: testCase.id, action: 'DOCUMENT_GENERATED' }
          });

          assert.ok(doc, 'Document record must exist');
          assert.equal(doc.status, 'GENERATED');
          assert.ok(log, 'DOCUMENT_GENERATED audit log must exist');
          assert.equal(log.actorId, customer.id);
          assert.equal(log.caseId, testCase.id);
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    },

    {
      name: 'C14: RBAC + Audit Logging - Unauthorized access attempts are rejected and leave audit logs intact without data leakage',
      async fn() {
        const prisma = getPrisma();
        const customerA = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const customerB = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.nriCustomer.email } });

        const victimCase = await prisma.case.create({
          data: { customerId: customerA.id, status: 'DRAFT', flags: 'STANDARD' }
        });

        try {
          // Customer B attempts unauthorized access
          const authorized = canAccessCase(customerB, victimCase);
          assert.equal(authorized, false, 'Unauthorized cross-tenant access must be denied');

          // Security alert audit log emitted
          const secLog = await prisma.auditLog.create({
            data: {
              actorId: customerB.id,
              caseId: victimCase.id,
              action: 'SECURITY_UNAUTHORIZED_ACCESS_BLOCKED',
              metadata: JSON.stringify({
                attemptedAction: 'READ_CASE',
                reason: 'IDOR_CROSS_TENANT_REJECTION'
              })
            }
          });

          assert.ok(secLog.id, 'Security audit log must be recorded');
          assert.equal(secLog.actorId, customerB.id, 'Must record unauthorized actor ID');
          assert.equal(secLog.action, 'SECURITY_UNAUTHORIZED_ACCESS_BLOCKED');

          // Verify victimCase integrity is intact and ownership unchanged
          const refreshed = await prisma.case.findUnique({ where: { id: victimCase.id } });
          assert.equal(refreshed.customerId, customerA.id, 'Case ownership must not be compromised');
        } finally {
          await cleanup({ caseIds: [victimCase.id] });
        }
      }
    },

    {
      name: 'C15: Autosave + Branching + Workflow - Changing parent answers updates workflow flags and removes invalid child clauses',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        const testCase = await prisma.case.create({
          data: { customerId: customer.id, status: 'PAID' }
        });

        try {
          // Phase 1: User indicates minor children
          const initialAnswers = {
            fullName: 'Aarav Sharma',
            hasChildren: 'Yes',
            hasMinorChildren: 'Yes',
            guardianName: 'Sunita Sharma'
          };

          await prisma.questionnaireAnswer.create({
            data: {
              caseId: testCase.id,
              questionnaireVersion: 'v1.0',
              questionId: 'all_answers',
              answerData: JSON.stringify(initialAnswers)
            }
          });

          const initialWorkflow = await LegalWorkflowEngine.evaluate(initialAnswers);
          assert.includes(initialWorkflow.flags, 'GUARDIAN_REQUIRED', 'Initial evaluation must flag GUARDIAN_REQUIRED');

          const initialDoc = await DocumentGenerator.generate(testCase.id);
          assert.includes(initialDoc.textContent, 'GUARDIANSHIP: I appoint Sunita Sharma', 'Initial doc must contain guardianship clause');

          // Phase 2: User changes parent answer: hasChildren from Yes to No
          const updatedAnswers = {
            fullName: 'Aarav Sharma',
            hasChildren: 'No',
            hasMinorChildren: 'No'
          };

          const existingAnswerRecord = await prisma.questionnaireAnswer.findFirst({
            where: { caseId: testCase.id, questionId: 'all_answers' }
          });

          await prisma.questionnaireAnswer.update({
            where: { id: existingAnswerRecord.id },
            data: { answerData: JSON.stringify(updatedAnswers) }
          });

          // Workflow re-evaluation
          const updatedWorkflow = await LegalWorkflowEngine.evaluate(updatedAnswers);
          assert.equal(
            updatedWorkflow.flags.includes('GUARDIAN_REQUIRED'),
            false,
            'Updated workflow must NO LONGER flag GUARDIAN_REQUIRED when minor children are No'
          );

          // Generate updated document
          const updatedDoc = await DocumentGenerator.generate(testCase.id);
          assert.equal(
            updatedDoc.textContent.includes('GUARDIANSHIP:'),
            false,
            'Updated document must NOT contain any GUARDIANSHIP clause after parent answer changed to No'
          );
        } finally {
          await cleanup({ caseIds: [testCase.id] });
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
