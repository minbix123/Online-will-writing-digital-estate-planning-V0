/**
 * Shared Database Client Helper for Test Harness
 */
const { PrismaClient } = require('@prisma/client');

const path = require('path');

let prismaInstance = null;

function getPrisma() {
  if (!prismaInstance) {
    const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
    const dbUrl = `file:${dbPath}?connection_limit=1&socket_timeout=30`;
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl
        }
      },
      log: ['warn', 'error']
    });
  }
  return prismaInstance;
}

module.exports = {
  getPrisma,
  get prisma() {
    return getPrisma();
  }
};

