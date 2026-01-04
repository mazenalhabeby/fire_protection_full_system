import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// RBAC PERMISSIONS DEFINITION
// ============================================
const PERMISSIONS = [
  // Dashboard
  { code: 'dashboard.view', name: 'View Dashboard', module: 'dashboard', action: 'view', description: 'Access to admin dashboard overview' },

  // Users Management
  { code: 'users.view', name: 'View Users', module: 'users', action: 'view', description: 'View user list and details' },
  { code: 'users.create', name: 'Create Users', module: 'users', action: 'create', description: 'Create new user accounts' },
  { code: 'users.edit', name: 'Edit Users', module: 'users', action: 'edit', description: 'Edit user information' },
  { code: 'users.delete', name: 'Delete Users', module: 'users', action: 'delete', description: 'Delete user accounts' },
  { code: 'users.ban', name: 'Ban Users', module: 'users', action: 'ban', description: 'Ban/unban user accounts' },
  { code: 'users.reset_password', name: 'Reset Password', module: 'users', action: 'reset_password', description: 'Reset user passwords' },

  // Affiliates
  { code: 'affiliates.view', name: 'View Affiliates', module: 'affiliates', action: 'view', description: 'View affiliate list and stats' },
  { code: 'affiliates.create', name: 'Create Affiliates', module: 'affiliates', action: 'create', description: 'Create new affiliates' },
  { code: 'affiliates.edit', name: 'Edit Affiliates', module: 'affiliates', action: 'edit', description: 'Edit affiliate information' },
  { code: 'affiliates.delete', name: 'Delete Affiliates', module: 'affiliates', action: 'delete', description: 'Delete affiliates' },
  { code: 'affiliates.adjust_commission', name: 'Adjust Commission', module: 'affiliates', action: 'adjust_commission', description: 'Adjust affiliate commission rates' },
  { code: 'affiliates.payout', name: 'Process Payout', module: 'affiliates', action: 'payout', description: 'Process affiliate payouts' },

  // Purchases
  { code: 'purchases.view', name: 'View Purchases', module: 'purchases', action: 'view', description: 'View purchase history' },
  { code: 'purchases.edit', name: 'Edit Purchases', module: 'purchases', action: 'edit', description: 'Edit purchase records' },
  { code: 'purchases.refund', name: 'Refund Purchases', module: 'purchases', action: 'refund', description: 'Process refunds' },

  // Locks
  { code: 'locks.view', name: 'View Locks', module: 'locks', action: 'view', description: 'View token locks' },
  { code: 'locks.edit', name: 'Edit Locks', module: 'locks', action: 'edit', description: 'Edit lock records' },
  { code: 'locks.cancel', name: 'Cancel Locks', module: 'locks', action: 'cancel', description: 'Cancel active locks' },
  { code: 'locks.extend', name: 'Extend Locks', module: 'locks', action: 'extend', description: 'Extend lock periods' },

  // Deposits
  { code: 'deposits.view', name: 'View Deposits', module: 'deposits', action: 'view', description: 'View deposit history' },
  { code: 'deposits.edit', name: 'Edit Deposits', module: 'deposits', action: 'edit', description: 'Edit deposit records' },
  { code: 'deposits.credit_manual', name: 'Manual Credit', module: 'deposits', action: 'credit_manual', description: 'Manually credit deposits' },

  // Withdrawals
  { code: 'withdrawals.view', name: 'View Withdrawals', module: 'withdrawals', action: 'view', description: 'View withdrawal requests' },
  { code: 'withdrawals.edit', name: 'Edit Withdrawals', module: 'withdrawals', action: 'edit', description: 'Edit withdrawal records' },
  { code: 'withdrawals.approve', name: 'Approve Withdrawals', module: 'withdrawals', action: 'approve', description: 'Approve withdrawal requests' },
  { code: 'withdrawals.reject', name: 'Reject Withdrawals', module: 'withdrawals', action: 'reject', description: 'Reject withdrawal requests' },
  { code: 'withdrawals.process', name: 'Process Withdrawals', module: 'withdrawals', action: 'process', description: 'Process and send withdrawals' },

  // Settings
  { code: 'settings.view', name: 'View Settings', module: 'settings', action: 'view', description: 'View system settings' },
  { code: 'settings.edit', name: 'Edit Settings', module: 'settings', action: 'edit', description: 'Modify system settings' },

  // Roles & Permissions
  { code: 'roles.view', name: 'View Roles', module: 'roles', action: 'view', description: 'View roles and permissions' },
  { code: 'roles.create', name: 'Create Roles', module: 'roles', action: 'create', description: 'Create new roles' },
  { code: 'roles.edit', name: 'Edit Roles', module: 'roles', action: 'edit', description: 'Edit role permissions' },
  { code: 'roles.delete', name: 'Delete Roles', module: 'roles', action: 'delete', description: 'Delete roles' },
  { code: 'roles.assign', name: 'Assign Roles', module: 'roles', action: 'assign', description: 'Assign roles to users' },

  // Support
  { code: 'support.view', name: 'View Support', module: 'support', action: 'view', description: 'View support tickets' },
  { code: 'support.edit', name: 'Edit Support', module: 'support', action: 'edit', description: 'Edit support tickets' },
  { code: 'support.assign', name: 'Assign Tickets', module: 'support', action: 'assign', description: 'Assign tickets to agents' },
  { code: 'support.close', name: 'Close Tickets', module: 'support', action: 'close', description: 'Close support tickets' },

  // Transactions
  { code: 'transactions.view', name: 'View Transactions', module: 'transactions', action: 'view', description: 'View all transactions' },
];

// ============================================
// PREDEFINED ROLES DEFINITION
// ============================================
const PREDEFINED_ROLES = [
  {
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'Full system access with all permissions',
    isSystem: true,
    color: '#7c3aed',
    permissions: PERMISSIONS.map(p => p.code), // All permissions
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Full access except role management',
    isSystem: true,
    color: '#2563eb',
    permissions: PERMISSIONS.filter(p => p.module !== 'roles').map(p => p.code),
  },
  {
    name: 'Moderator',
    slug: 'moderator',
    description: 'View access plus limited edit capabilities',
    isSystem: true,
    color: '#059669',
    permissions: [
      'dashboard.view',
      'users.view', 'users.edit', 'users.ban',
      'affiliates.view',
      'purchases.view',
      'locks.view',
      'deposits.view',
      'withdrawals.view',
      'support.view', 'support.edit', 'support.assign', 'support.close',
      'transactions.view',
    ],
  },
  {
    name: 'Support',
    slug: 'support',
    description: 'View-only access with support ticket handling',
    isSystem: true,
    color: '#f59e0b',
    permissions: [
      'dashboard.view',
      'users.view',
      'affiliates.view',
      'purchases.view',
      'locks.view',
      'deposits.view',
      'withdrawals.view',
      'support.view', 'support.edit', 'support.close',
      'transactions.view',
    ],
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // 0. Seed Permissions and Roles (RBAC)
  console.log('Creating permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission,
    });
  }

  console.log('Creating predefined roles...');
  for (const roleData of PREDEFINED_ROLES) {
    const { permissions: permissionCodes, ...roleInfo } = roleData;

    // Create or update role
    const role = await prisma.role.upsert({
      where: { slug: roleInfo.slug },
      update: {
        name: roleInfo.name,
        description: roleInfo.description,
        color: roleInfo.color,
        isSystem: roleInfo.isSystem,
      },
      create: roleInfo,
    });

    // Get permission IDs
    const permissions = await prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
      select: { id: true },
    });

    // Clear existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    // Create role permissions
    for (const permission of permissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

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
      bonusPercent: new Prisma.Decimal(5),
      feeDiscountPercent: new Prisma.Decimal(5),
      minAmount: new Prisma.Decimal(100),
      isActive: true,
    },
    {
      id: 'tier-gold',
      name: 'Gold',
      lockMonths: 12,
      bonusPercent: new Prisma.Decimal(15),
      feeDiscountPercent: new Prisma.Decimal(15),
      minAmount: new Prisma.Decimal(500),
      isActive: true,
    },
    {
      id: 'tier-platinum',
      name: 'Platinum',
      lockMonths: 24,
      bonusPercent: new Prisma.Decimal(35),
      feeDiscountPercent: new Prisma.Decimal(35),
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

  // 2.5. Create Affiliate Tiers
  console.log('Creating affiliate tiers...');
  const affiliateTiers = [
    {
      id: 'aff-tier-start',
      name: 'Start',
      commissionRate: new Prisma.Decimal(0.03), // 3%
      minReferrals: 0,
      color: '#6B7280',
      isActive: true,
    },
    {
      id: 'aff-tier-silver',
      name: 'Silver',
      commissionRate: new Prisma.Decimal(0.05), // 5%
      minReferrals: 10,
      color: '#C0C0C0',
      isActive: true,
    },
    {
      id: 'aff-tier-gold',
      name: 'Gold',
      commissionRate: new Prisma.Decimal(0.07), // 7%
      minReferrals: 50,
      color: '#FFD700',
      isActive: true,
    },
    {
      id: 'aff-tier-platinum',
      name: 'Platinum',
      commissionRate: new Prisma.Decimal(0.15), // 15%
      minReferrals: 100,
      color: '#E5E4E2',
      isActive: true,
    },
  ];

  for (const tier of affiliateTiers) {
    await prisma.affiliateTier.upsert({
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

  // 4. Create Admin User with Super Admin Role
  console.log('Creating admin user...');
  // SECURITY: Use 13 rounds for bcrypt (recommended minimum for production)
  const adminPassword = await bcrypt.hash('Admin123!', 13);

  // Get Super Admin role
  const superAdminRole = await prisma.role.findUnique({
    where: { slug: 'super-admin' },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@verfid.com' },
    update: {
      roleId: superAdminRole?.id,
    },
    create: {
      email: 'admin@verfid.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      legacyRole: 'ADMIN',
      roleId: superAdminRole?.id,
      isVerified: true,
      isEmailVerified: true,
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
  console.log(`- Permissions: ${PERMISSIONS.length} permissions across 11 modules`);
  console.log('- Roles: Super Admin, Admin, Moderator, Support');
  console.log('- Token Config: HBCT @ $0.03');
  console.log('- Lock Tiers: Silver 6M (+5%), Gold 12M (+15%), Platinum 24M (+35%)');
  console.log('- Reward Pools: 4 pools totaling 42.5M HBCT');
  console.log('- Admin User: admin@verfid.com / Admin123! (Super Admin)');
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
