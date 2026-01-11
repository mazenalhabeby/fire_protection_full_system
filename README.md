<div align="center">

# HBCT Fire Protection Platform

### The Premier Blockchain Marketplace for Fire Protection Products & Systems

[![Built on BSC](https://img.shields.io/badge/Built%20on-BNB%20Smart%20Chain-F0B90B?style=for-the-badge&logo=binance)](https://www.bnbchain.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

<br />

[Website](https://fire-protection.tech/en) · [Documentation](https://hbc-1.gitbook.io/hbc-fire-protection/) · [Twitter](https://x.com/HBCT911) · [Telegram](https://t.me/hbct911)

<br />

<img src="frontend/public/images/logo.svg" alt="HBCT Logo" width="200" />

</div>

---

## Overview

**HBCT TOKEN is not just a digital asset — it is the gateway to a complete ecosystem of engineering, safety, and next-generation technology developed by HBC Engineering.**

With HBCT, users gain access to advanced fire-protection solutions, smart building safety systems, and a unified digital platform where all services can be paid for or upgraded using the token. This gives the token real, everyday utility, unlike most digital assets with no purpose.

The ecosystem grows through **four strategic stages**, each expanding capabilities and increasing token demand:

| Stage | Name | Description |
|:-----:|:-----|:------------|
| 1 | **HBCT Marketplace** | Blockchain-enabled marketplace for fire-protection products |
| 2 | **Fire-Protection Services** | Installation, inspection, and maintenance contracts |
| 3 | **Blockchain Certification** | NFT certificates, Digital Twin, and on-chain compliance |
| 4 | **AI-Powered FPaaS** | Fire-Protection-as-a-Service with AI monitoring |

<br />

## Technology Stack

<table>
<tr>
<td valign="top" width="50%">

### Frontend
| Technology | Version |
|------------|---------|
| Next.js (App Router) | 16.x |
| TypeScript | 5.x |
| Tailwind CSS | 4.x |
| TanStack Query | Latest |
| Wagmi + Viem | 2.x |
| next-intl | Latest |
| Radix UI | Latest |

</td>
<td valign="top" width="50%">

### Backend
| Technology | Version |
|------------|---------|
| NestJS | 11.x |
| TypeScript | 5.x |
| PostgreSQL | 15+ |
| Prisma ORM | Latest |
| Passport.js | Latest |
| Ethers.js | 6.x |

</td>
</tr>
</table>

<br />

## Key Features

### Security & Authentication
- **Multi-factor Authentication** - Email/password, OAuth (Google, Facebook), Web3 wallet
- **Two-Factor Authentication** - TOTP with AES-256-GCM encrypted secrets
- **JWT Token Management** - Access & refresh token rotation with session tracking
- **Enterprise Security** - Rate limiting, Helmet headers, CORS, brute-force protection

### Token Operations
- **Real-time Balance Tracking** - Live blockchain data synchronization
- **Deposit Detection** - Automated blockchain confirmation monitoring
- **Secure Withdrawals** - Multi-signature approval workflow
- **Token Locking** - Staking mechanism with tiered bonus rewards
- **Complete Audit Trail** - Transaction history and compliance logging

### Stage 1: HBCT Marketplace
- **Fire-Protection Products** - Premium suppression systems, detectors, and safety equipment
- **Verified Manufacturers** - Blockchain-verified seller credentials and certifications
- **Multi-Payment Support** - HBCT tokens, cryptocurrency, and credit cards
- **Transaction Fees** - Product sales, partner listings, and marketplace fees

### Stage 2: Fire-Protection Services
- **System Installation** - Certified fire-protection system deployment
- **Inspection & Testing** - Professional maintenance services
- **Long-Term Contracts** - Multi-year service agreements
- **HBCT Premium Packages** - Token-powered service upgrades

### Stage 3: Blockchain Certification
- **NFT Certificates** - Immutable certificates for products, buildings, and services
- **Digital Identity** - Unique blockchain ID for every building
- **Digital Twin** - Full lifecycle tracking technology
- **Compliance Verification** - Secure verification for governments and insurers

### Stage 4: AI-Powered FPaaS
- **24/7 AI Monitoring** - Real-time fire-safety analysis with IoT sensors
- **Predictive Maintenance** - AI-powered failure prediction and risk scoring
- **AI Compliance Assistant** - Automated reports, inspections, and evacuation plans
- **Subscription Revenue** - Monthly recurring payments in HBCT

### Platform Capabilities
- **User Dashboard** - Portfolio overview with analytics
- **Airdrop Management** - Campaign creation and distribution
- **Affiliate System** - Referral tracking and rewards
- **Admin Panel** - User management and system controls
- **Internationalization** - 5 languages (EN, DE, FR, ES, IT)

<br />

## Architecture

```
fire_protection_full_system/
│
├── frontend/                    # Next.js 16 Application
│   ├── app/                     # App Router (pages & layouts)
│   │   └── [locale]/            # Internationalized routes
│   ├── components/              # Reusable React components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities, API client, helpers
│   ├── providers/               # Context providers
│   ├── types/                   # TypeScript definitions
│   └── messages/                # i18n translation files
│
├── backend/                     # NestJS 11 Application
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/            # Authentication & authorization
│   │   │   ├── users/           # User management
│   │   │   ├── admin/           # Administrative operations
│   │   │   ├── deposits/        # Blockchain deposit handling
│   │   │   ├── withdrawals/     # Withdrawal processing
│   │   │   ├── locking/         # Token locking/staking
│   │   │   ├── marketplace/     # Products & orders
│   │   │   ├── airdrops/        # Airdrop campaigns
│   │   │   └── affiliates/      # Referral system
│   │   ├── common/              # Shared utilities & guards
│   │   └── prisma/              # Database client
│   └── prisma/                  # Schema & migrations
│
└── shared/                      # Shared assets & contracts
```

<br />

## Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **PostgreSQL** 15.x or higher
- **npm** or **yarn**
- **Git**

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/mazenalhabeby/fire_protection_full_system.git
cd fire_protection_full_system
```

**2. Install dependencies**
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

**3. Configure environment**
```bash
# Backend configuration
cd backend
cp .env.example .env

# Frontend configuration
cd ../frontend
cp .env.example .env.local
```

**4. Initialize database**
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed  # Optional: seed with demo data
```

**5. Start development servers**
```bash
# Terminal 1 - Backend (http://localhost:3001)
cd backend && npm run start:dev

# Terminal 2 - Frontend (http://localhost:3000)
cd frontend && npm run dev
```

<br />

## Configuration

### Backend Environment Variables

| Variable | Description | Required |
|:---------|:------------|:--------:|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Access token secret (64+ characters) | Yes |
| `JWT_REFRESH_SECRET` | Refresh token secret (64+ characters) | Yes |
| `FRONTEND_URL` | Frontend URL for CORS configuration | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret | No |
| `FACEBOOK_APP_ID` | Facebook OAuth app ID | No |
| `FACEBOOK_APP_SECRET` | Facebook OAuth app secret | No |
| `SMTP_HOST` | Email server hostname | No |
| `SMTP_USER` | Email server username | No |
| `SMTP_PASS` | Email server password | No |
| `TWO_FACTOR_ENCRYPTION_KEY` | 32-byte hex key for 2FA encryption | No |
| `BSC_RPC_URL` | BNB Smart Chain RPC endpoint | Yes |
| `HBCT_TOKEN_ADDRESS` | HBCT token contract address | Yes |
| `DEPOSIT_WALLET_ADDRESS` | Platform deposit wallet address | Yes |

### Frontend Environment Variables

| Variable | Description | Required |
|:---------|:------------|:--------:|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID | Yes |

### Generate Secure Keys

```bash
# Generate JWT secrets
openssl rand -hex 64

# Generate 2FA encryption key
openssl rand -hex 32
```

<br />

## API Reference

Full API documentation is available at `/api/docs` (Swagger UI) when running the backend server.

### Core Endpoints

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/api/auth/register` | Create new user account |
| `POST` | `/api/auth/login` | Authenticate with credentials |
| `POST` | `/api/auth/wallet/login` | Authenticate with Web3 wallet |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/2fa/status` | Check 2FA enrollment status |
| `POST` | `/api/auth/2fa/setup` | Initialize 2FA enrollment |
| `GET` | `/api/users/profile` | Retrieve user profile |
| `PATCH` | `/api/users/profile` | Update user profile |
| `GET` | `/api/deposits/history` | List deposit transactions |
| `POST` | `/api/locking/create` | Create token lock position |
| `GET` | `/api/marketplace/products` | List marketplace products |

<br />

## Scripts Reference

### Backend Commands

| Command | Description |
|:--------|:------------|
| `npm run start:dev` | Start development server with hot reload |
| `npm run start:prod` | Start production server |
| `npm run build` | Compile TypeScript for production |
| `npm run test` | Execute unit test suite |
| `npm run test:e2e` | Execute end-to-end tests |
| `npm run lint` | Run ESLint code analysis |
| `npm run prisma:studio` | Open Prisma database GUI |
| `npm run prisma:migrate` | Apply database migrations |
| `npm run prisma:generate` | Generate Prisma client |

### Frontend Commands

| Command | Description |
|:--------|:------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint code analysis |

<br />

## Security

### Implementation Details

| Security Layer | Implementation |
|:---------------|:---------------|
| Password Hashing | bcrypt (12 rounds) |
| Token Algorithm | HS256 with enforced validation |
| Rate Limiting | Configurable per-endpoint throttling |
| CORS Policy | Strict origin validation |
| HTTP Headers | Helmet security headers |
| Input Validation | class-validator with DTOs |
| SQL Injection | Prisma parameterized queries |
| XSS Protection | React built-in escaping |
| CSRF Protection | SameSite cookies + token validation |
| 2FA Secrets | AES-256-GCM encryption |

<br />

## Deployment

### Docker (Recommended)

```bash
docker-compose up -d
```

### Manual Deployment

1. Provision PostgreSQL database instance
2. Configure production environment variables
3. Build applications: `npm run build`
4. Deploy with process manager (PM2, systemd)
5. Configure reverse proxy (Nginx, Caddy)
6. Install SSL certificates (Let's Encrypt)

<br />

## Contributing

We welcome contributions from the community.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit a Pull Request

<br />

## License

This project is proprietary software. All rights reserved.

See [LICENSE](LICENSE) for details.

---

<div align="center">

**Building the world's first integrated ecosystem where engineering, fire protection, AI, and blockchain come together — creating a token with real utility and long-term value.**

[Website](https://fire-protection.tech/en) · [Documentation](https://hbc-1.gitbook.io/hbc-fire-protection/) · [Twitter](https://x.com/HBCT911) · [Telegram](https://t.me/hbct911) · [GitHub](https://github.com/mazenalhabeby/fire_protection_full_system)

<br />

Copyright © 2024-Present HBC Engineering. All rights reserved.

</div>
