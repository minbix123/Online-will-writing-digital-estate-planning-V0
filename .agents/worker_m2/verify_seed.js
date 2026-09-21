const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- VERIFYING SEEDED DATABASE ---');
  
  // 1. Check Users
  const users = await prisma.user.findMany();
  console.log(`Users count: ${users.length}`);
  for (const u of users) {
    const isBcrypt = u.password && u.password.startsWith('$2');
    const matchesPassword123 = u.password ? bcrypt.compareSync('password123', u.password) : false;
    console.log(`User: ${u.email} | Role: ${u.role} | Bcrypt: ${isBcrypt} | Password valid: ${matchesPassword123}`);
  }

  // 2. Check Clauses
  const clauses = await prisma.clause.findMany({
    include: { versions: true }
  });
  console.log(`Clauses count: ${clauses.length}`);
  for (const c of clauses) {
    console.log(`Clause: ${c.name} | Status: ${c.status} | Versions: ${c.versions.length} | Version 1 Status: ${c.versions[0]?.status}`);
  }

  // 3. Check Templates
  const templates = await prisma.template.findMany({
    include: { versions: true }
  });
  console.log(`Templates count: ${templates.length}`);
  for (const t of templates) {
    console.log(`Template: ${t.name} | Status: ${t.status} | Versions: ${t.versions.length} | Version 1 Status: ${t.versions[0]?.status}`);
  }

  // 4. Check Cases
  const cases = await prisma.case.findMany();
  console.log(`Cases count: ${cases.length}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
