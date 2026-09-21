const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:zj51FHkEkrjam4DE@db.zouxeffcdtndrphgvskt.supabase.co:5432/postgres'
    }
  }
});
async function main() {
  const result = await prisma.$queryRaw`SELECT current_setting('timezone')`;
  console.log(result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
