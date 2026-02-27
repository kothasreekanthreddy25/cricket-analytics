import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const records = await prisma.matchAnalysis.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
records.forEach(m => console.log(m.teamA, 'vs', m.teamB, '| createdAt:', m.createdAt, '| rawData:', JSON.stringify(m.rawData)));
await prisma.$disconnect();
