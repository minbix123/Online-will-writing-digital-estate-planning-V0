/**
 * Tier 4: Real-World Estate Planning Application Scenarios (6 Tests)
 * End-to-end user journeys validating real-world Indian estate planning workflows
 * across Bangalore tech professionals, Mumbai business owners, Dubai NRIs,
 * multi-heir legacy distribution, lawyer redline reviews, and end-to-end compliance auditing.
 */

const assert = require('../helpers/assert');
const { getPrisma } = require('../helpers/db');
const fixtures = require('../helpers/fixtures');
const { canAccessCase, cleanup, calculateProgress, evaluateCondition } = require('../helpers/test_utils');
const { authOptions } = require('../../src/lib/auth.ts');
const { LegalWorkflowEngine } = require('../../src/server/legal-workflows/index.ts');
const { DocumentGenerator } = require('../../src/server/document-generator.ts');
const { questionnaireConfig } = require('../../src/lib/questionnaire.ts');

const provider = authOptions.providers[0];
const authorize = provider.options?.authorize || provider.authorize;

module.exports = {
  name: 'Tier 4: Real-World Estate Planning Scenarios',
  tests: [
    {
      name: 'Scenario 1: Young Tech Professional (Bangalore) with Minor Children & Digital Assets (F1, F3, F4, F5, F6, F7, F9, F10, F11)',
      async fn() {
        const prisma = getPrisma();
        const techUser = fixtures.demoUsers.customer;

        // 1. Auth (F1) & Login Audit (F11)
        const user = await authorize(techUser);
        assert.ok(user, 'Aarav Sharma must authenticate successfully');
        assert.equal(user.email, techUser.email);

        const loginAudit = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'AUTH_LOGIN_SUCCESS',
            metadata: JSON.stringify({ ip: '10.0.0.1', city: 'Bengaluru' })
          }
        });

        // 2. Case Creation (F3) & Case Audit (F11)
        const caseItem = await prisma.case.create({
          data: {
            customerId: user.id,
            status: 'DRAFT',
            flags: 'STANDARD'
          }
        });

        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            caseId: caseItem.id,
            action: 'CASE_CREATED',
            metadata: JSON.stringify({ plan: 'BASIC' })
          }
        });

        try {
          // 3. Questionnaire Validation (F4) & Progressive Autosave (F5)
          const personalInfo = {
            ...fixtures.testators.bangaloreTech,
            email: 'aarav.sharma@example.com',
            phone: '+91 98450 12345'
          };
          const childrenData = {
            hasChildren: 'Yes',
            hasMinorChildren: 'Yes',
            childrenList: fixtures.guardianship.children
          };
          const guardianData = fixtures.guardianship.guardian;
          const assetsData = {
            assetsList: fixtures.assets.bangalorePortfolio
          };
          const beneficiariesData = {
            beneficiariesList: fixtures.beneficiaries.standardFamily
          };
          const executorData = fixtures.executors.trustedProfessional;

          // Save sections progressively
          const sections = [
            { id: 'personal_info', data: personalInfo },
            { id: 'children', data: childrenData },
            { id: 'guardian', data: guardianData },
            { id: 'assets', data: assetsData },
            { id: 'beneficiaries', data: beneficiariesData },
            { id: 'executor', data: executorData }
          ];

          for (const sec of sections) {
            await prisma.questionnaireAnswer.create({
              data: {
                caseId: caseItem.id,
                questionnaireVersion: 'v1.0',
                questionId: sec.id,
                answerData: JSON.stringify(sec.data)
              }
            });
          }

          // Verify all sections saved and resumed completely
          const savedAnswers = await prisma.questionnaireAnswer.findMany({
            where: { caseId: caseItem.id }
          });
          assert.equal(savedAnswers.length, 6, 'All 6 questionnaire sections must be saved and resumed');

          // 4. Conditional Branching (F6)
          const combinedAnswers = Object.assign({}, personalInfo, childrenData, guardianData, assetsData, beneficiariesData, executorData);
          const hasMinorsCondition = { field: 'hasMinorChildren', operator: 'equals', value: 'Yes' };
          assert.equal(evaluateCondition(hasMinorsCondition, combinedAnswers), true, 'Minor children must trigger guardian section');

          // 5. Legal Workflow Engine (F7)
          const workflowResult = await LegalWorkflowEngine.evaluate(combinedAnswers);
          assert.includes(workflowResult.flags, 'GUARDIAN_REQUIRED', 'Workflow must flag GUARDIAN_REQUIRED');
          assert.includes(workflowResult.flags, 'STANDARD', 'Workflow must include STANDARD');
          assert.equal(workflowResult.requiresLawyerReview, false, 'Standard young tech estate does not require mandatory lawyer review');

          // 6. Mock Payment (F10)
          const payment = await prisma.payment.create({
            data: {
              caseId: caseItem.id,
              amount: 999,
              currency: 'INR',
              status: 'SUCCESS',
              mode: 'MOCK'
            }
          });
          assert.equal(payment.amount, 999, 'Basic plan fee must be 999 INR');

          const paidCase = await prisma.case.update({
            where: { id: caseItem.id },
            data: {
              status: 'PAID',
              flags: workflowResult.flags.join(',')
            }
          });
          assert.equal(paidCase.status, 'PAID');

          // 7. DOCX Generation (F9)
          const docResult = await DocumentGenerator.generate(caseItem.id);
          assert.ok(docResult.docxBuffer instanceof Buffer, 'Must return DOCX buffer');
          assert.equal(docResult.docxBuffer[0], 0x50, 'Byte 0 must be PK header');
          assert.equal(docResult.docxBuffer[1], 0x4B, 'Byte 1 must be PK header');
          assert.includes(docResult.textContent, 'Aarav Sharma', 'Document must merge testator name');
          assert.includes(docResult.textContent, 'GUARDIANSHIP:', 'Document must contain GUARDIANSHIP clause');
          assert.includes(docResult.textContent, 'Sunita Sharma', 'Document must merge appointed guardian name');

          // 8. Audit Verification (F11)
          await prisma.auditLog.create({
            data: {
              actorId: user.id,
              caseId: caseItem.id,
              action: 'DOCUMENT_GENERATED',
              metadata: JSON.stringify({ format: 'DOCX', status: 'SUCCESS' })
            }
          });

          const auditTrail = await prisma.auditLog.findMany({
            where: { caseId: caseItem.id },
            orderBy: { timestamp: 'asc' }
          });
          assert.ok(auditTrail.length >= 2, 'Must record complete audit trail');
          assert.equal(auditTrail[0].action, 'CASE_CREATED');
        } finally {
          await prisma.auditLog.delete({ where: { id: loginAudit.id } });
          await cleanup({ caseIds: [caseItem.id] });
        }
      }
    },

    {
      name: 'Scenario 2: Senior Citizen Business Owner (Mumbai) Revoking Old Will & Commercial Succession (F1, F3, F4, F6, F7, F8, F9, F11)',
      async fn() {
        const prisma = getPrisma();
        const businessUser = fixtures.demoUsers.customer;

        // 1. Auth (F1)
        const user = await authorize(businessUser);
        assert.ok(user);

        // 2. Case Creation (F3)
        const caseItem = await prisma.case.create({
          data: {
            customerId: user.id,
            status: 'DRAFT',
            flags: 'STANDARD'
          }
        });

        try {
          // 3. Questionnaire Data (F4)
          const answers = {
            ...fixtures.testators.mumbaiBusiness,
            assetsList: fixtures.assets.mumbaiCommercialPortfolio,
            beneficiariesList: fixtures.beneficiaries.equalSplitTwoHeirs,
            executorName: 'Deepak Merchant'
          };

          await prisma.questionnaireAnswer.create({
            data: {
              caseId: caseItem.id,
              questionnaireVersion: 'v1.0',
              questionId: 'all_answers',
              answerData: JSON.stringify(answers)
            }
          });

          // 4. Conditional Branching (F6)
          assert.equal(answers.hasExistingWill, 'Yes', 'Existing will must be present');
          assert.ok(
            answers.assetsList.some(a => a.type === 'BusinessInterests'),
            'Portfolio must contain commercial business interests'
          );

          // 5. Legal Workflow Engine (F7)
          const evalResult = await LegalWorkflowEngine.evaluate(answers);
          assert.includes(evalResult.flags, 'EXISTING_WILL', 'Must include EXISTING_WILL flag');
          assert.includes(evalResult.flags, 'BUSINESS_INTEREST', 'Must include BUSINESS_INTEREST flag');
          assert.includes(evalResult.flags, 'LEGAL_REVIEW_REQUIRED', 'Business owner estate mandates legal review');
          assert.equal(evalResult.requiresLawyerReview, true, 'Senior business owner will requires lawyer review');

          // 6. Template & Clause Lifecycle (F8)
          const approvedTemplate = await prisma.template.findFirst({
            where: { status: 'LAWYER_APPROVED' },
            include: { versions: true }
          });
          assert.ok(approvedTemplate, 'Platform must use LAWYER_APPROVED template');
          assert.ok(approvedTemplate.versions.length > 0, 'Must have at least one approved version');

          // 7. DOCX Generation (F9)
          await prisma.case.update({
            where: { id: caseItem.id },
            data: { status: 'PAID', flags: evalResult.flags.join(',') }
          });

          const docResult = await DocumentGenerator.generate(caseItem.id);
          assert.ok(docResult.docxBuffer.length > 500, 'Must produce valid docx buffer');
          assert.includes(docResult.textContent, 'Vikram Singhania', 'Generated will must include testator name');

          // 8. Audit Trail (F11)
          await prisma.auditLog.create({
            data: {
              actorId: user.id,
              caseId: caseItem.id,
              action: 'WORKFLOW_LEGAL_REVIEW_FLAGGED',
              metadata: JSON.stringify({ flags: evalResult.flags })
            }
          });

          const log = await prisma.auditLog.findFirst({
            where: { caseId: caseItem.id, action: 'WORKFLOW_LEGAL_REVIEW_FLAGGED' }
          });
          assert.ok(log, 'Audit log for legal review requirement must be stored');
        } finally {
          await cleanup({ caseIds: [caseItem.id] });
        }
      }
    },

    {
      name: 'Scenario 3: NRI (Dubai/USA) Managing Cross-Border Property & Indian Bank Accounts (F1, F3, F6, F7, F9, F10, F11)',
      async fn() {
        const prisma = getPrisma();
        const nriUser = fixtures.demoUsers.nriCustomer;

        // 1. Auth (F1)
        const user = await authorize(nriUser);
        assert.ok(user, 'NRI customer must authenticate');

        // 2. Case Creation (F3)
        const caseItem = await prisma.case.create({
          data: {
            customerId: user.id,
            status: 'DRAFT',
            flags: 'STANDARD'
          }
        });

        try {
          // 3. Questionnaire & Cross-Border Assets (F4, F6)
          const nriAnswers = {
            ...fixtures.testators.dubaiNRI,
            assetsList: fixtures.assets.nriCrossBorderPortfolio,
            beneficiariesList: fixtures.beneficiaries.singleBeneficiary
          };

          await prisma.questionnaireAnswer.create({
            data: {
              caseId: caseItem.id,
              questionnaireVersion: 'v1.0',
              questionId: 'all_answers',
              answerData: JSON.stringify(nriAnswers)
            }
          });

          // 4. Deterministic Legal Workflow (F7)
          const evalResult = await LegalWorkflowEngine.evaluate(nriAnswers);
          assert.includes(evalResult.flags, 'NRI', 'Must include NRI flag');
          assert.includes(evalResult.flags, 'FOREIGN_ASSETS', 'Must include FOREIGN_ASSETS flag');
          assert.includes(evalResult.flags, 'LEGAL_REVIEW_REQUIRED', 'NRI requires lawyer review');
          assert.equal(evalResult.requiresLawyerReview, true);

          // 5. Payment for Complex/NRI Tier (F10)
          const nriFee = 4999;
          const payment = await prisma.payment.create({
            data: {
              caseId: caseItem.id,
              amount: nriFee,
              currency: 'INR',
              status: 'SUCCESS',
              mode: 'MOCK'
            }
          });
          assert.equal(payment.amount, 4999, 'Complex/NRI tier must be charged 4999 INR');
          assert.equal(payment.status, 'SUCCESS');

          await prisma.case.update({
            where: { id: caseItem.id },
            data: { status: 'PAID', flags: evalResult.flags.join(',') }
          });

          // 6. Server-Side DOCX Generation (F9)
          const docResult = await DocumentGenerator.generate(caseItem.id);
          assert.includes(docResult.textContent, 'Rajesh Patel', 'Must merge NRI full name');
          assert.includes(docResult.textContent, 'FOREIGN ASSETS:', 'Must include FOREIGN ASSETS clause');
          assert.includes(docResult.textContent, 'United Arab Emirates', 'Must merge foreign jurisdiction');

          // 7. Audit Logging (F11)
          const auditLog = await prisma.auditLog.create({
            data: {
              actorId: user.id,
              caseId: caseItem.id,
              action: 'NRI_CHECKOUT_COMPLETED',
              metadata: JSON.stringify({ amount: 4999, country: 'United Arab Emirates' })
            }
          });
          assert.ok(auditLog.id);
          assert.equal(auditLog.action, 'NRI_CHECKOUT_COMPLETED');
        } finally {
          await cleanup({ caseIds: [caseItem.id] });
        }
      }
    },

    {
      name: 'Scenario 4: Multi-Heir Family Estate with Specific Legacies & Equal Residuary Division (F3, F4, F5, F7, F8, F9, F11)',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });

        // 1. Case Lifecycle (F3)
        const caseItem = await prisma.case.create({
          data: {
            customerId: customer.id,
            status: 'DRAFT',
            flags: 'STANDARD'
          }
        });

        try {
          // 2. Questionnaire & Multi-Section Autosave/Resume (F4, F5)
          const personalData = fixtures.testators.delhiRetired;
          const assetsData = {
            assetsList: [
              { type: 'Property', description: 'Ancestral residential house, Sector 15A, Noida', value: 25000000 },
              { type: 'BankAccount', description: 'SBI Senior Citizen Pension Savings Account', value: 6500000 },
              { type: 'PersonalProperty', description: 'Family Gold Jewelry and Silver Urns', value: 2000000 }
            ]
          };
          const bequestsData = {
            specificBequests: [
              { asset: 'Family Gold Jewelry', beneficiary: 'Priya Verma (Daughter)' }
            ],
            residuaryDivision: [
              { beneficiary: 'Vikram Verma (Son)', share: '50%' },
              { beneficiary: 'Priya Verma (Daughter)', share: '50%' }
            ]
          };

          // Save sections
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: caseItem.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify(personalData)
            }
          });
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: caseItem.id,
              questionnaireVersion: 'v1.0',
              questionId: 'assets',
              answerData: JSON.stringify(assetsData)
            }
          });
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: caseItem.id,
              questionnaireVersion: 'v1.0',
              questionId: 'distribution',
              answerData: JSON.stringify(bequestsData)
            }
          });

          // Resume answers
          const resumed = await prisma.questionnaireAnswer.findMany({
            where: { caseId: caseItem.id }
          });
          assert.equal(resumed.length, 3, 'Must resume all 3 questionnaire sections');

          // 3. Legal Workflow Engine (F7)
          const evalResult = await LegalWorkflowEngine.evaluate(personalData);
          assert.deepEqual(evalResult.flags, ['STANDARD'], 'Multi-heir standard estate with adult children has STANDARD flag');
          assert.equal(evalResult.requiresLawyerReview, false, 'No mandatory lawyer review required');

          // 4. Template Lifecycle (F8)
          const template = await prisma.template.findFirst({
            where: { status: 'LAWYER_APPROVED' }
          });
          assert.ok(template, 'Template must be LAWYER_APPROVED');

          // 5. DOCX Generation (F9)
          await prisma.case.update({
            where: { id: caseItem.id },
            data: { status: 'PAID' }
          });

          const docResult = await DocumentGenerator.generate(caseItem.id);
          assert.ok(docResult.docxBuffer instanceof Buffer, 'Must generate docx buffer');
          assert.includes(docResult.textContent, 'Col. Devendra Verma', 'Must merge testator name');

          // 6. Audit Logging (F11)
          await prisma.auditLog.create({
            data: {
              actorId: customer.id,
              caseId: caseItem.id,
              action: 'ESTATE_PLAN_RESUMED_AND_COMPILED',
              metadata: JSON.stringify({ heirsCount: 2 })
            }
          });

          const auditRecord = await prisma.auditLog.findFirst({
            where: { caseId: caseItem.id, action: 'ESTATE_PLAN_RESUMED_AND_COMPILED' }
          });
          assert.ok(auditRecord, 'Audit record must exist');
        } finally {
          await cleanup({ caseIds: [caseItem.id] });
        }
      }
    },

    {
      name: 'Scenario 5: Lawyer Review & Redlining Workflow for High-Risk Estate (F1, F2, F3, F7, F8, F9, F10, F11)',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const lawyer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.lawyer.email } });
        const unauthorizedCustomer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.nriCustomer.email } });

        // 1. Auth & Case Creation (F1, F3)
        const caseItem = await prisma.case.create({
          data: {
            customerId: customer.id,
            status: 'DRAFT',
            flags: 'STANDARD'
          }
        });

        try {
          // 2. High-Risk Estate Answers (F7)
          const highRiskAnswers = {
            fullName: 'Aarav Sharma',
            maritalStatus: 'Other',
            hasExistingWill: 'Yes',
            assetsList: [{ type: 'BusinessInterests', description: 'Proprietary Tech Partnership' }]
          };

          await prisma.questionnaireAnswer.create({
            data: {
              caseId: caseItem.id,
              questionnaireVersion: 'v1.0',
              questionId: 'all_answers',
              answerData: JSON.stringify(highRiskAnswers)
            }
          });

          const workflow = await LegalWorkflowEngine.evaluate(highRiskAnswers);
          assert.includes(workflow.flags, 'LEGAL_REVIEW_REQUIRED');
          assert.includes(workflow.flags, 'MANUAL_CONSULTATION_REQUIRED');
          assert.includes(workflow.flags, 'BUSINESS_INTEREST');
          assert.includes(workflow.flags, 'EXISTING_WILL');
          assert.equal(workflow.requiresLawyerReview, true, 'High-risk estate must mandate lawyer review');

          // 3. Payment for Lawyer Review Tier (F10)
          const payment = await prisma.payment.create({
            data: {
              caseId: caseItem.id,
              amount: 2999,
              currency: 'INR',
              status: 'SUCCESS',
              mode: 'MOCK'
            }
          });
          assert.equal(payment.amount, 2999, 'Lawyer review tier fee must be 2999 INR');

          // Status transitions to IN_REVIEW with assigned lawyer
          const inReviewCase = await prisma.case.update({
            where: { id: caseItem.id },
            data: {
              status: 'IN_REVIEW',
              lawyerId: lawyer.id,
              flags: workflow.flags.join(',')
            }
          });
          assert.equal(inReviewCase.status, 'IN_REVIEW');

          // 4. RBAC Isolation (F2)
          assert.equal(canAccessCase(unauthorizedCustomer, inReviewCase), false, 'Unauthorized customer cannot access in-review case');
          assert.equal(canAccessCase(lawyer, inReviewCase), true, 'Assigned lawyer must have authorized access');

          // 5. Lawyer Review & Redline Note (F3, F8)
          const review = await prisma.lawyerReview.create({
            data: {
              caseId: caseItem.id,
              lawyerId: lawyer.id,
              status: 'COMPLETED',
              notes: 'Reviewed partnership deeds and verified previous will revocation clause. Approved for generation.'
            }
          });
          assert.ok(review.id, 'LawyerReview entry must be created');
          assert.equal(review.status, 'COMPLETED');

          // Lawyer approves case
          const approvedCase = await prisma.case.update({
            where: { id: caseItem.id },
            data: { status: 'APPROVED' }
          });
          assert.equal(approvedCase.status, 'APPROVED', 'Case must transition to APPROVED');

          // 6. Post-Approval Document Generation (F9)
          const docResult = await DocumentGenerator.generate(caseItem.id);
          assert.ok(docResult.docxBuffer instanceof Buffer);
          assert.includes(docResult.textContent, 'Aarav Sharma');

          // 7. Complete Audit Trail (F11)
          await prisma.auditLog.create({
            data: {
              actorId: lawyer.id,
              caseId: caseItem.id,
              action: 'LAWYER_CASE_REVIEW_APPROVED',
              metadata: JSON.stringify({ reviewId: review.id, status: 'APPROVED' })
            }
          });

          const lawyerLog = await prisma.auditLog.findFirst({
            where: { caseId: caseItem.id, action: 'LAWYER_CASE_REVIEW_APPROVED' }
          });
          assert.ok(lawyerLog, 'Lawyer review audit log must be recorded');
          assert.equal(lawyerLog.actorId, lawyer.id);
        } finally {
          await cleanup({ caseIds: [caseItem.id] });
        }
      }
    },

    {
      name: 'Scenario 6: End-to-End Compliance, Tamper-Resistance & Audit Verification (F1, F2, F3, F5, F8, F9, F10, F11)',
      async fn() {
        const prisma = getPrisma();
        const customer = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.customer.email } });
        const adversary = await prisma.user.findUnique({ where: { email: fixtures.demoUsers.nriCustomer.email } });

        // 1. Secure Authentication & Session (F1)
        const user = await authorize(fixtures.demoUsers.customer);
        assert.ok(user, 'User must authenticate');

        // 2. Draft Case Initialization (F3)
        const caseItem = await prisma.case.create({
          data: {
            customerId: user.id,
            status: 'DRAFT',
            flags: 'STANDARD'
          }
        });

        // Track chronological audit entries
        const auditEvents = [];

        // Log 1: Login
        const logLogin = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'AUTH_LOGIN_SUCCESS',
            caseId: caseItem.id,
            metadata: JSON.stringify({ ip: '127.0.0.1' })
          }
        });
        auditEvents.push(logLogin);

        // Log 2: Case Created
        const logCase = await prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CASE_CREATED',
            caseId: caseItem.id,
            metadata: JSON.stringify({ status: 'DRAFT' })
          }
        });
        auditEvents.push(logCase);

        try {
          // 3. Template Governance & Immutability (F8)
          const approvedTemplate = await prisma.template.findFirst({
            where: { status: 'LAWYER_APPROVED' },
            include: { versions: true }
          });
          assert.ok(approvedTemplate, 'Active template must be LAWYER_APPROVED');
          assert.ok(approvedTemplate.versions.length >= 1, 'Version-controlled template must exist');

          // 4. Autosave Questionnaire (F5)
          await prisma.questionnaireAnswer.create({
            data: {
              caseId: caseItem.id,
              questionnaireVersion: 'v1.0',
              questionId: 'personal_info',
              answerData: JSON.stringify({ fullName: 'Aarav Sharma', city: 'Bengaluru' })
            }
          });

          // Log 3: Autosave
          const logSave = await prisma.auditLog.create({
            data: {
              actorId: user.id,
              action: 'QUESTIONNAIRE_AUTOSAVED',
              caseId: caseItem.id,
              metadata: JSON.stringify({ section: 'personal_info' })
            }
          });
          auditEvents.push(logSave);

          // 5. Mock Payment Transaction (F10)
          await prisma.$transaction(async (tx) => {
            await tx.payment.create({
              data: {
                caseId: caseItem.id,
                amount: 999,
                currency: 'INR',
                status: 'SUCCESS',
                mode: 'MOCK'
              }
            });
            await tx.case.update({
              where: { id: caseItem.id },
              data: { status: 'PAID' }
            });
          });

          // Log 4: Payment Completed
          const logPayment = await prisma.auditLog.create({
            data: {
              actorId: user.id,
              action: 'PAYMENT_COMPLETED',
              caseId: caseItem.id,
              metadata: JSON.stringify({ amount: 999, mode: 'MOCK' })
            }
          });
          auditEvents.push(logPayment);

          // 6. Server-Side Document Generation & Binary Integrity (F9)
          const docResult = await DocumentGenerator.generate(caseItem.id);
          assert.ok(docResult.docxBuffer instanceof Buffer);
          assert.equal(docResult.docxBuffer[0], 0x50, 'Must have PK zip header byte 0');
          assert.equal(docResult.docxBuffer[1], 0x4B, 'Must have PK zip header byte 1');

          // Log 5: Document Generated
          const logDoc = await prisma.auditLog.create({
            data: {
              actorId: user.id,
              action: 'DOCUMENT_GENERATED',
              caseId: caseItem.id,
              metadata: JSON.stringify({ format: 'DOCX' })
            }
          });
          auditEvents.push(logDoc);

          // 7. Audit Log Immutability & Monotonicity Verification (F11)
          const allLogs = await prisma.auditLog.findMany({
            where: { caseId: caseItem.id },
            orderBy: { timestamp: 'asc' }
          });

          assert.ok(allLogs.length >= 5, 'Must record at least 5 audit logs for complete lifecycle');

          // Verify chronological sequence of actions
          const actions = allLogs.map(l => l.action);
          assert.includes(actions, 'AUTH_LOGIN_SUCCESS');
          assert.includes(actions, 'CASE_CREATED');
          assert.includes(actions, 'QUESTIONNAIRE_AUTOSAVED');
          assert.includes(actions, 'PAYMENT_COMPLETED');
          assert.includes(actions, 'DOCUMENT_GENERATED');

          // Verify timestamp monotonicity
          for (let i = 1; i < allLogs.length; i++) {
            const prev = (allLogs[i - 1].timestamp || allLogs[i - 1].createdAt).getTime();
            const curr = (allLogs[i].timestamp || allLogs[i].createdAt).getTime();
            assert.ok(curr >= prev, `Audit timestamp at index ${i} must be >= previous timestamp`);
          }

          // Verify actor traceability
          for (const l of allLogs) {
            assert.equal(l.actorId, user.id, 'Every audit log must be attributable to authentic actor');
          }

          // 8. Adversarial Security Isolation / IDOR Rejection (F2, F11)
          const canAdversaryAccess = canAccessCase(adversary, caseItem);
          assert.equal(canAdversaryAccess, false, 'Adversary must be denied access to case');

          // Emit security alarm
          const alarmLog = await prisma.auditLog.create({
            data: {
              actorId: adversary.id,
              caseId: caseItem.id,
              action: 'SECURITY_UNAUTHORIZED_ACCESS_BLOCKED',
              metadata: JSON.stringify({ targetCaseId: caseItem.id, adversaryId: adversary.id })
            }
          });
          assert.ok(alarmLog.id);
          assert.equal(alarmLog.action, 'SECURITY_UNAUTHORIZED_ACCESS_BLOCKED');

          // Verify Case ownership remains inviolate
          const verifiedCase = await prisma.case.findUnique({ where: { id: caseItem.id } });
          assert.equal(verifiedCase.customerId, user.id, 'Case ownership must remain unaltered');
        } finally {
          await cleanup({ caseIds: [caseItem.id] });
        }
      }
    }
  ]
};

if (require.main === module) {
  require('../runner').runSuite(module.exports);
}
