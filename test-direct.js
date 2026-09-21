const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:zj51FHkEkrjam4DE@db.zouxeffcdtndrphgvskt.supabase.co:5432/postgres'
    }
  }
});
async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
