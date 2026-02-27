// Run this to wipe stale cached match analyses so fresh ones are generated
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
config()

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.matchAnalysis.count()
  console.log(`Found ${count} cached analyses`)

  if (count > 0) {
    await prisma.matchAnalysis.deleteMany({})
    console.log('All cached analyses cleared — fresh analysis will be generated on next request')
  } else {
    console.log('Nothing to clear')
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
