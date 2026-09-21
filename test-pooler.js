const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.zouxeffcdtndrphgvskt:zj51FHkEkrjam4DE@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});
async function main() {
  await prisma.$queryRaw`SELECT 1`;
  console.log('Connected to pooler!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
