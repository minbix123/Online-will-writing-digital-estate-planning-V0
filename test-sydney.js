const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.zouxeffcdtndrphgvskt:zj51FHkEkrjam4DE@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
});
async function main() {
  const result = await prisma.$queryRaw`SELECT 1`;
  console.log('CONNECTED TO SYDNEY POOLER!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
