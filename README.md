# HBCT Fire Protection Platform

A full-stack Web3 token management platform built with Next.js and NestJS, featuring secure authentication, token operations, marketplace, and blockchain integration.

## Tech Stack

### Frontend
- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **State Management:** TanStack Query (React Query)
- **Web3:** Wagmi v2, Viem, WalletConnect
- **Internationalization:** next-intl
- **UI Components:** Radix UI, Lucide Icons

### Backend
- **Framework:** NestJS 11
- **Language:** TypeScript 5
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Passport.js (JWT, OAuth2, Local)
- **Security:** Helmet, Rate Limiting, CORS
- **Blockchain:** Ethers.js v6, Viem

## Features

### Authentication & Security
- Email/Password authentication with email verification
- OAuth integration (Google, Facebook)
- Web3 wallet authentication (MetaMask, WalletConnect)
- Two-Factor Authentication (TOTP) with recovery codes
- JWT access & refresh token rotation
- Session management with device tracking
- Rate limiting and brute-force protection

### Token Operations
- Real-time token balance tracking
- Deposit detection with blockchain confirmation
- Secure withdrawal system with approval workflow
- Token locking/staking with bonus tiers
- Transaction history and audit logs

### Platform Features
- User dashboard with portfolio overview
- Marketplace for products/services
- Airdrop campaigns management
- Affiliate/referral system
- Admin panel with user management
- Multi-language support (i18n)
- Dark/Light theme

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn
- Git

## Project Structure

```
fire_protection_full_system/
├── frontend/                # Next.js application
│   ├── app/                 # App router pages
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities & API
│   ├── types/               # TypeScript types
│   └── messages/            # i18n translations
├── backend/                 # NestJS application
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Authentication
│   │   │   ├── users/       # User management
│   │   │   ├── admin/       # Admin operations
│   │   │   ├── deposits/    # Blockchain deposits
│   │   │   ├── locking/     # Token locking
│   │   │   ├── marketplace/ # Products & orders
│   │   │   ├── airdrops/    # Airdrop campaigns
│   │   │   └── affiliates/  # Referral system
│   │   ├── common/          # Shared utilities
│   │   └── prisma/          # Database client
│   └── prisma/              # Schema & migrations
└── shared/                  # Shared assets
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/fire_protection_full_system.git
cd fire_protection_full_system
```

### 2. Install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure environment variables

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your configuration

# Frontend
cd ../frontend
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 4. Set up the database

```bash
cd backend

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed the database
npm run prisma:seed
```

## Configuration

### Backend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret for access tokens (64+ chars) | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens (64+ chars) | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | No |
| `FACEBOOK_APP_ID` | Facebook OAuth app ID | No |
| `FACEBOOK_APP_SECRET` | Facebook OAuth secret | No |
| `SMTP_HOST` | Email server host | No |
| `SMTP_USER` | Email server username | No |
| `SMTP_PASS` | Email server password | No |
| `TWO_FACTOR_ENCRYPTION_KEY` | 32-byte hex key for 2FA secrets | No |
| `BSC_RPC_URL` | BSC RPC endpoint | For blockchain |
| `HBCT_TOKEN_ADDRESS` | Token contract address | For blockchain |
| `DEPOSIT_WALLET_ADDRESS` | Wallet for receiving deposits | For blockchain |

### Frontend Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | For Web3 |

### Generate Secure Secrets

```bash
# Generate JWT secrets (run twice for access and refresh)
openssl rand -hex 64

# Generate 2FA encryption key
openssl rand -hex 32
```

## Running the Application

### Development

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/docs

### Production

```bash
# Build backend
cd backend
npm run build
npm run start:prod

# Build frontend
cd frontend
npm run build
npm run start
```

## API Documentation

The backend includes Swagger documentation available at `/api/docs` when running the server.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login with credentials |
| `POST` | `/api/auth/wallet/login` | Login with wallet |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/2fa/status` | Get 2FA status |
| `POST` | `/api/auth/2fa/setup` | Initialize 2FA setup |
| `GET` | `/api/users/profile` | Get user profile |
| `PATCH` | `/api/users/profile` | Update profile |
| `GET` | `/api/deposits/history` | Get deposit history |
| `POST` | `/api/locking/create` | Lock tokens |
| `GET` | `/api/marketplace/products` | List products |

## Scripts

### Backend

```bash
npm run start:dev      # Development mode with hot reload
npm run start:prod     # Production mode
npm run build          # Build for production
npm run test           # Run unit tests
npm run test:e2e       # Run e2e tests
npm run lint           # Lint code
npm run prisma:studio  # Open Prisma Studio GUI
npm run prisma:migrate # Run database migrations
```

### Frontend

```bash
npm run dev    # Development mode
npm run build  # Build for production
npm run start  # Start production server
npm run lint   # Lint code
```

## Security Features

- **Password Hashing:** bcrypt with 12 rounds
- **JWT Security:** Algorithm enforcement (HS256), short-lived access tokens
- **Rate Limiting:** Configurable per-endpoint limits
- **CORS:** Strict origin validation
- **Helmet:** Security headers
- **Input Validation:** class-validator DTOs
- **SQL Injection:** Prisma parameterized queries
- **XSS Protection:** React's built-in escaping
- **CSRF:** SameSite cookies, token validation
- **2FA:** TOTP with encrypted secrets (AES-256-GCM)

## Database

### Prisma Commands

```bash
# View database in browser
npx prisma studio

# Create migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

## Deployment

### Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment

1. Set up PostgreSQL database
2. Configure environment variables for production
3. Build both applications
4. Use PM2 or similar for process management
5. Set up reverse proxy (Nginx/Caddy)
6. Configure SSL certificates

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

---

Built with Next.js, NestJS, and Prisma
