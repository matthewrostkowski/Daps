import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

process.on('SIGINT', async () => {
  try { await prisma.$disconnect(); } finally { process.exit(0); }
});
