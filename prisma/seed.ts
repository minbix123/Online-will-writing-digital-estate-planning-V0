import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding Database...")

  // Clear existing records in foreign key dependency order
  await prisma.auditLog.deleteMany()
  await prisma.lawyerReview.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.document.deleteMany()
  await prisma.questionnaireAnswer.deleteMany()
  await prisma.templateVersion.deleteMany()
  await prisma.template.deleteMany()
  await prisma.clauseVersion.deleteMany()
  await prisma.clause.deleteMany()
  await prisma.case.deleteMany()
  await prisma.user.deleteMany()

  // Hash passwords using bcryptjs (salt rounds = 10)
  const passwordHash = bcrypt.hashSync('password123', 10)

  // Create 1 single Developer Account
  const devAccount = await prisma.user.create({
    data: {
      name: 'Developer Admin',
      email: 'dev@admin.com',
      password: passwordHash,
      role: 'ADMIN'
    }
  })

  // Seed sample legal clauses (STANDARD_DECLARATION, EXECUTORS, GUARDIAN, NRI_ASSETS, BUSINESS_SUCCESSION)
  const clausesData = [
    {
      name: 'STANDARD_DECLARATION',
      description: 'Standard Revocation & Declaration Clause under Indian Succession Act, 1925',
      status: 'LAWYER_APPROVED',
      version: 1,
      content: 'I, {{fullName}}, residing at {{address}}, hereby revoke all former wills, codicils, and testamentary dispositions made by me and declare this to be my last will and testament.'
    },
    {
      name: 'EXECUTORS',
      description: 'Appointment of Executors and Alternates for estate administration under Indian Succession Act, 1925',
      status: 'LAWYER_APPROVED',
      version: 1,
      content: 'I hereby appoint {{executorName}} (relationship: {{executorRelation}}) to be the sole executor of this my Will. If they are unable or unwilling to act, I appoint {{alternateExecutorName}} as the alternate executor.'
    },
    {
      name: 'GUARDIAN',
      description: 'Testamentary Guardian Clause for minor children under Section 9 of the Hindu Minority and Guardianship Act, 1956',
      status: 'LAWYER_APPROVED',
      version: 1,
      content: 'In the event that my spouse does not survive me, I hereby appoint {{guardianName}} to be the legal testamentary guardian of the person and property of my minor children during their minority.'
    },
    {
      name: 'NRI_ASSETS',
      description: 'Cross-Border and NRI Foreign Assets Clause compliant with FEMA regulations and respective local succession laws',
      status: 'LAWYER_APPROVED',
      version: 1,
      content: 'In respect of all my assets, bank accounts, investments, and properties situated in India and overseas, I direct that the distribution thereof shall comply with applicable Foreign Exchange Management Act (FEMA) regulations and respective local succession laws.'
    },
    {
      name: 'BUSINESS_SUCCESSION',
      description: 'Business Succession and Commercial Enterprise Interest Transfer Clause',
      status: 'LAWYER_APPROVED',
      version: 1,
      content: 'I bequeath all my shares, partnership interests, proprietary business holdings, and rights associated with {{businessName}} to {{businessSuccessor}}, subject to the Articles of Association and partnership covenants.'
    }
  ]

  for (const c of clausesData) {
    await prisma.clause.create({
      data: {
        name: c.name,
        description: c.description,
        status: c.status,
        versions: {
          create: {
            version: c.version,
            content: c.content,
            status: c.status
          }
        }
      }
    })
  }

  // Seed initial Template with a version in LAWYER_APPROVED status
  const templateApproved = await prisma.template.create({
    data: {
      name: 'Comprehensive Indian Last Will & Testament',
      description: 'Standard comprehensive legal will template compliant with Indian Succession Act, 1925.',
      status: 'LAWYER_APPROVED',
      versions: {
        create: {
          version: 1,
          status: 'LAWYER_APPROVED',
          content: '<h1>Last Will and Testament of {{fullName}}</h1><p>I, {{fullName}}, residing at {{address}}, revoke all prior testamentary instruments and declare this to be my Last Will and Testament.</p><div id="clauses">{{clausesContent}}</div><p>Signed by the Testator in the presence of two attesting witnesses.</p>'
        }
      }
    }
  })

  const templateDraft = await prisma.template.create({
    data: {
      name: 'Draft Custom Will Template',
      description: 'Work-in-progress legal template under review by legal panel.',
      status: 'DRAFT',
      versions: {
        create: {
          version: 1,
          status: 'DRAFT',
          content: '<h1>Draft Will Template</h1><p>Under review by legal council.</p>'
        }
      }
    }
  })



  console.log("Seeding complete.")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
