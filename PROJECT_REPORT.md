# HBCT Fire Protection Platform - Project Report

**Last Updated:** January 7, 2026
**Purpose:** Reference documentation for development continuity

---

## 1. PROJECT OVERVIEW

A full-stack Web3 token management platform with three main applications:

| Application | Port | Technology | Purpose |
|-------------|------|------------|---------|
| **Frontend** | 3000 | Next.js 16 | User-facing dashboard |
| **Admin** | 3002 | Next.js 16 | Admin management panel |
| **Backend** | 3001 | NestJS 11 | REST API server |

**Database:** PostgreSQL with Prisma ORM
**Blockchain:** BSC (BNB Smart Chain) via Viem/Ethers.js

---

## 2. PROJECT STRUCTURE

```
fire_protection_full_system/
├── frontend/                 # User application
│   ├── app/[locale]/        # Next.js App Router pages
│   │   ├── (app)/           # Protected routes (dashboard, wallet, etc.)
│   │   ├── (auth)/          # Auth pages (login, register)
│   │   └── (marketing)/     # Landing page
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── lib/api/             # API client functions
│   └── types/               # TypeScript types
│
├── admin/                    # Admin panel
│   ├── app/[locale]/(admin)/ # Admin pages
│   ├── components/          # Admin components
│   ├── hooks/               # Admin hooks
│   └── lib/api/             # Admin API client
│
├── backend/                  # API server
│   ├── src/
│   │   ├── modules/         # Feature modules (23 total)
│   │   ├── common/          # Shared utilities
│   │   └── prisma/          # Database service
│   └── prisma/
│       ├── schema.prisma    # Database schema
│       └── seed.ts          # Database seeding
│
└── shared/                   # Shared assets
```

---

## 3. BACKEND MODULES

### Core Modules (23 total)

| Module | Purpose | Key Files |
|--------|---------|-----------|
| **auth** | JWT/OAuth/Wallet authentication, 2FA, Sessions | auth.service.ts, session.service.ts, two-factor.service.ts |
| **users** | User profiles, account management | users.service.ts, users.controller.ts |
| **roles** | RBAC system | roles.service.ts, permissions.guard.ts |
| **wallet** | Off-chain balances, internal transfers | balance.service.ts, transfer.service.ts |
| **deposits** | On-chain deposit detection | deposits.service.ts, deposits.controller.ts |
| **withdrawals** | Withdrawal workflow | withdrawals.service.ts, withdrawals.processor.ts |
| **token-purchase** | Token buying | purchase.service.ts |
| **blockchain** | RPC interactions | blockchain.client.ts |
| **locking** | Token locking/staking | locking.service.ts |
| **affiliates** | Referral system | affiliates.service.ts |
| **notifications** | In-app & email notifications | notifications.service.ts |
| **email** | Email templates & sending | email.service.ts, email-preview.controller.ts |
| **support** | Tickets & FAQ | support.service.ts |
| **marketplace** | Products & orders | marketplace.service.ts |
| **admin** | Admin operations | admin.service.ts |
| **upload** | File uploads (avatars) | upload.service.ts |

### Key Services

```typescript
// Authentication
AuthService          - Login, register, token management
SessionService       - Device fingerprinting, session tracking
TwoFactorService     - TOTP setup/verification
GeolocationService   - IP location, VPN detection

// Financial
BalanceService       - Multi-currency balance management
TransferService      - P2P internal transfers
WithdrawalsService   - Withdrawal requests & processing
DepositsService      - Blockchain deposit detection
PurchaseService      - Token purchase logic

// Notifications
NotificationsService - In-app & email notifications
EmailService         - HTML email templates
```

---

## 4. AUTHENTICATION FLOW

```
Registration → Email Verification → Login
                                      ↓
                            [2FA if enabled]
                                      ↓
                         JWT Access + Refresh Tokens
                                      ↓
                         Session with Device Fingerprint
```

**Security Features:**
- JWT with 15-min access tokens
- Refresh token rotation
- Device fingerprinting
- IP-based geolocation
- VPN detection
- Impossible travel detection
- Rate limiting (100 req/60s)
- Brute-force protection (5 failed = 30 min lockout)

---

## 5. KEY FEATURES

### 5.1 Wallet System (Off-Chain)

**Currencies:** HBCT, BNB, USDT, USDC

**Features:**
- Multi-currency balances
- Internal P2P transfers (by username, email, wallet address)
- QR code for receiving
- Transaction history with balance snapshots
- Transfer limits (per transaction, daily, weekly)

### 5.2 Deposits (On-Chain)

**Flow:**
1. User sends tokens to platform wallet
2. Backend monitors blockchain events
3. Wait for 12 confirmations
4. Match sender to user (or mark as UNMAPPED)
5. Credit user balance
6. Send notification

### 5.3 Withdrawals (On-Chain)

**Flow:**
1. User requests withdrawal
2. Email confirmation sent
3. User confirms with code (email or 2FA)
4. [Optional] Admin approval
5. Process on blockchain
6. Send notification

**Status Flow:**
```
PENDING_CONFIRMATION → PENDING_APPROVAL → APPROVED → PROCESSING → COMPLETED
                    ↘ CANCELLED      ↘ REJECTED          ↘ FAILED
```

### 5.4 Token Purchase

- Pay with internal wallet balance (BNB/USDT/USDC)
- Off-chain or on-chain delivery
- Purchase limits ($10-$10K per tx, $50K daily)
- Affiliate commission triggered

### 5.5 Token Locking

| Tier | Lock Period | Bonus |
|------|-------------|-------|
| Standard | 3 months | 5% |
| Gold | 6 months | 10% |
| Platinum | 12 months | 20% |

### 5.6 Affiliate System

| Tier | Referrals | Commission |
|------|-----------|------------|
| Bronze | 0+ | 5% |
| Silver | 25+ | 7% |
| Gold | 100+ | 10% |
| Platinum | 500+ | 15% |

### 5.7 RBAC Permissions

**Predefined Roles:**
- Super Admin (all permissions)
- Admin (all except role management)
- Moderator (view + limited edit)
- Support (view + support tickets)

**Permission Format:** `module.action`
```
users.view, users.edit, users.delete
withdrawals.view, withdrawals.approve, withdrawals.reject, withdrawals.process
deposits.view, deposits.verify
support.view, support.edit, support.close
roles.view, roles.create, roles.edit, roles.delete
```

---

## 6. NOTIFICATION SYSTEM

### Types
- TRANSACTION (deposits, withdrawals, transfers)
- SECURITY (login alerts, password changes, 2FA)
- LOCKING (lock created, matured)
- SYSTEM (announcements)
- MARKETING (promotions)

### Channels
- IN_APP (stored in DB, shown in UI)
- EMAIL (sent via SMTP)
- BOTH (user preference)

### Email Preview
URL: `http://localhost:3001/api/email-preview`

Available templates:
- Email Verification (link & code)
- Password Reset
- Welcome Email
- Security Alert (new login)
- Withdrawal Confirmation
- Transfer Confirmation
- 2FA Enabled/Disabled

---

## 7. FRONTEND PAGES

### User Routes (`/app/[locale]/(app)/`)

| Route | Purpose |
|-------|---------|
| `/dashboard` | Portfolio overview |
| `/wallet` | Balance display |
| `/wallet/deposit` | Deposit instructions |
| `/wallet/withdraw` | Withdrawal form |
| `/wallet/send` | Internal transfer |
| `/wallet/receive` | QR code for receiving |
| `/wallet/transactions` | Transaction history |
| `/wallet/transfers` | Transfer history |
| `/buy-tokens` | Token purchase |
| `/locking` | Token locking |
| `/affiliates` | Referral dashboard |
| `/settings` | User settings |
| `/notifications` | Notification center |

### Admin Routes (`/admin/app/[locale]/(admin)/`)

| Route | Purpose |
|-------|---------|
| `/` | Dashboard with stats |
| `/users` | User management |
| `/users/deleted` | Soft-deleted users |
| `/withdrawals` | Withdrawal approval |
| `/deposits` | Deposit verification |
| `/purchases` | Purchase history |
| `/locks` | Lock monitoring |
| `/affiliates` | Affiliate management |
| `/support` | Support tickets |
| `/roles` | Role management |
| `/settings` | Admin settings |

---

## 8. API ENDPOINTS (Key)

### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/2fa/setup
POST /api/auth/2fa/verify
```

### Wallet
```
GET  /api/wallet/balances
GET  /api/wallet/transactions
POST /api/wallet/transfer/initiate
POST /api/wallet/transfer/:id/confirm
```

### Withdrawals
```
POST /api/withdrawals/request
GET  /api/withdrawals/history
POST /api/withdrawals/:id/confirm
```

### Admin
```
GET    /api/withdrawals/admin
PATCH  /api/withdrawals/admin/:id/approve
PATCH  /api/withdrawals/admin/:id/reject
GET    /api/deposits/admin
POST   /api/deposits/admin/:id/verify
```

---

## 9. DATABASE SCHEMA (Key Tables)

```prisma
// Core
users              - User accounts with RBAC
sessions           - Active sessions with device info
roles              - RBAC roles
permissions        - Permission definitions
role_permissions   - Role-permission mapping

// Financial
wallet_balances    - Multi-currency balances
wallet_transactions - Transaction history
withdrawals        - Withdrawal requests
onchain_deposits   - Blockchain deposits
token_purchases    - Purchase records

// Features
token_locks        - Locked tokens
affiliates         - Referral accounts
notifications      - User notifications
support_tickets    - Help desk tickets
```

---

## 10. ENVIRONMENT VARIABLES

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:3002

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...

# 2FA
TWO_FACTOR_ENCRYPTION_KEY=<32-byte-hex>

# Blockchain
BSC_RPC_URL=...
HBCT_TOKEN_ADDRESS=...
WITHDRAWAL_WALLET_PRIVATE_KEY=...
```

### Frontend/Admin (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

---

## 11. RECENT SESSION CHANGES (Jan 7, 2026)

### Profile Image Upload
- Added `profileImageUrl` field to User model
- Created `/backend/src/modules/upload/` module with Sharp for image processing
- Created `/frontend/components/ui/user-avatar.tsx` reusable component
- Updated ProfileSection with upload functionality
- Updated navbar to show user avatar
- Added static file serving in NestJS main.ts
- Configured Next.js remote patterns for image optimization

### Security Alert Email Fix
- Fixed "New Login Detected" email to show parsed device name (e.g., "Chrome on MacOS")
- Now uses session data for location instead of duplicate geolocation call
- Email displays: Device, Location, Time (no raw IP address)
- Updated `notifications.service.ts` and `auth.service.ts`

### Withdrawal Error Handling
- Added proper error handling for permission errors in admin withdrawals page
- Shows toast message: "You don't have permission to approve withdrawals"
- Uses `ApiError` class for status code detection

### Notification URL Fix
- Fixed withdrawal notification URL from `/wallet/history` to `/wallet/transactions`

---

## 12. DEVELOPMENT COMMANDS

```bash
# Start Backend
cd backend && npm run start:dev

# Start Frontend
cd frontend && npm run dev

# Start Admin
cd admin && npm run dev

# Database
npm run prisma:migrate    # Run migrations
npm run prisma:generate   # Generate client
npm run prisma:studio     # Open GUI
npm run prisma:seed       # Seed data

# Type Check
npx tsc --noEmit
```

---

## 13. USEFUL LINKS

| Resource | URL |
|----------|-----|
| API Docs (Swagger) | http://localhost:3001/api/docs |
| Email Preview | http://localhost:3001/api/email-preview |
| Prisma Studio | `npm run prisma:studio` |

---

## 14. KNOWN ISSUES / TODO

1. **TypeScript Errors** - Some existing errors in admin panel (affiliates page, deposits API)
2. **Redis Cache** - Not implemented (using React Query for frontend caching)
3. **WebSocket** - Using SSE for real-time, could upgrade to WebSocket
4. **Tests** - Limited test coverage

---

## 15. CODE PATTERNS

### Backend Service Pattern
```typescript
@Injectable()
export class ExampleService {
  constructor(
    private prisma: PrismaService,
    private otherService: OtherService,
  ) {}

  async doSomething(dto: InputDto): Promise<OutputDto> {
    // Validation
    // Business logic
    // Database operations
    // Return result
  }
}
```

### Frontend Hook Pattern
```typescript
export function useExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => api.example(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['example'] });
      toast.success('Success!');
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Permission denied');
      } else {
        toast.error(error.message);
      }
    },
  });
}
```

### Error Handling Pattern
```typescript
try {
  await mutation.mutateAsync(data);
  toast.success('Success');
} catch (error) {
  if (error instanceof ApiError && error.status === 403) {
    toast.error("You don't have permission");
  } else {
    toast.error(error instanceof Error ? error.message : 'Failed');
  }
}
```

---

## 16. QUICK REFERENCE

### File Locations
- **Auth logic:** `/backend/src/modules/auth/auth.service.ts`
- **Notifications:** `/backend/src/modules/notifications/notifications.service.ts`
- **Email templates:** `/backend/src/modules/email/email.service.ts`
- **Withdrawals:** `/backend/src/modules/withdrawals/withdrawals.service.ts`
- **User Avatar:** `/frontend/components/ui/user-avatar.tsx`
- **Settings Page:** `/frontend/app/[locale]/(app)/settings/page.tsx`
- **Admin Withdrawals:** `/admin/app/[locale]/(admin)/withdrawals/page.tsx`

### Database Schema
- **Location:** `/backend/prisma/schema.prisma`
- **Seed:** `/backend/prisma/seed.ts`

### API Client
- **Frontend:** `/frontend/lib/api/client.ts`
- **Admin:** `/admin/lib/api/client.ts`

---

*This report serves as a starting point for future development sessions. Read this first to understand the project context before making changes.*
