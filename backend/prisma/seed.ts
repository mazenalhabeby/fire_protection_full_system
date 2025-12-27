import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Token Config
  console.log('Creating token configuration...');
  await prisma.tokenConfig.upsert({
    where: { id: 'default-config' },
    update: {},
    create: {
      id: 'default-config',
      symbol: 'HBCT',
      name: 'HBC Fire Protection Token',
      totalSupply: new Prisma.Decimal(250000000),
      currentPrice: new Prisma.Decimal(0.03),
      isPresale: false,
      presalePrice: new Prisma.Decimal(0.03),
    },
  });

  // 2. Create Lock Tiers (Silver/Gold/Platinum)
  console.log('Creating lock tiers...');
  const lockTiers = [
    {
      id: 'tier-silver',
      name: 'Silver',
      lockMonths: 6,
      bonusPercent: new Prisma.Decimal(7),
      feeDiscountPercent: new Prisma.Decimal(10),
      minAmount: new Prisma.Decimal(100),
      isActive: true,
    },
    {
      id: 'tier-gold',
      name: 'Gold',
      lockMonths: 12,
      bonusPercent: new Prisma.Decimal(20),
      feeDiscountPercent: new Prisma.Decimal(25),
      minAmount: new Prisma.Decimal(500),
      isActive: true,
    },
    {
      id: 'tier-platinum',
      name: 'Platinum',
      lockMonths: 24,
      bonusPercent: new Prisma.Decimal(50),
      feeDiscountPercent: new Prisma.Decimal(50),
      minAmount: new Prisma.Decimal(1000),
      isActive: true,
    },
  ];

  for (const tier of lockTiers) {
    await prisma.lockTier.upsert({
      where: { id: tier.id },
      update: tier,
      create: tier,
    });
  }

  // 3. Create Reward Pools
  console.log('Creating reward pools...');
  const rewardPools = [
    {
      name: 'Lock Rewards',
      description: 'Pool for token locking bonus rewards',
      allocation: new Prisma.Decimal(20000000), // 20M HBCT
    },
    {
      name: 'Fee Cashback',
      description: 'Pool for fee cashback and incentives',
      allocation: new Prisma.Decimal(10000000), // 10M HBCT
    },
    {
      name: 'Partners',
      description: 'Pool for partners and growth initiatives',
      allocation: new Prisma.Decimal(7500000), // 7.5M HBCT
    },
    {
      name: 'Airdrop',
      description: 'Pool for airdrop campaigns',
      allocation: new Prisma.Decimal(5000000), // 5M HBCT (from ecosystem)
    },
  ];

  for (const pool of rewardPools) {
    await prisma.rewardPool.upsert({
      where: { name: pool.name },
      update: pool,
      create: pool,
    });
  }

  // 4. Create Admin User
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hbctoken.com' },
    update: {},
    create: {
      email: 'admin@hbctoken.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  // Create token balance for admin
  await prisma.tokenBalance.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      availableBalance: new Prisma.Decimal(0),
      lockedBalance: new Prisma.Decimal(0),
      totalBalance: new Prisma.Decimal(0),
    },
  });

  // 5. Create Sample Product Category
  console.log('Creating sample product category...');
  await prisma.productCategory.upsert({
    where: { slug: 'fire-protection' },
    update: {},
    create: {
      name: 'Fire Protection Equipment',
      slug: 'fire-protection',
      description: 'Professional fire protection products and equipment',
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📋 Summary:');
  console.log('- Token Config: HBCT @ $0.03');
  console.log('- Lock Tiers: Silver 6M (+7%), Gold 12M (+20%), Platinum 24M (+50%)');
  console.log('- Reward Pools: 4 pools totaling 42.5M HBCT');
  console.log('- Admin User: admin@hbctoken.com / Admin123!');
  console.log('- Sample Category: Fire Protection Equipment');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
