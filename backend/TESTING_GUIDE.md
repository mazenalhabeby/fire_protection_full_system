# HBCT Backend Testing Guide

This guide provides comprehensive instructions for testing all modules in the HBCT Fire Protection Token backend.

## Prerequisites

1. **Database Setup**
```bash
# Create PostgreSQL database
createdb hbct_db

# Or using Docker
docker run --name hbct-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=hbct_db -p 5432:5432 -d postgres:15
```

2. **Environment Configuration**
Create `.env` file:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/hbct_db"
JWT_SECRET="your-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN=604800
TOKEN_SYMBOL=HBCT
TOKEN_NAME="HBC Fire Protection Token"
TOKEN_TOTAL_SUPPLY=250000000
TOKEN_CURRENT_PRICE=0.03
TOKEN_PRESALE_PRICE=0.03
PORT=3001
```

3. **Initialize Database**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed initial data
npm run prisma:seed
```

4. **Start Server**
```bash
npm run start:dev
```

Server runs at: `http://localhost:3001`

---

## Testing Tools

You can use any of these tools:
- **curl** (command line)
- **Postman** (GUI)
- **Insomnia** (GUI)
- **Thunder Client** (VS Code extension)

Base URL: `http://localhost:3001`

---

## 1. Authentication Module

### 1.1 Register User
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123!@#",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 1.2 Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "Test123!@#"
  }'
```

**Save the `accessToken` from response for subsequent requests.**

### 1.3 Login as Admin
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@hbctoken.com",
    "password": "Admin123!"
  }'
```

### 1.4 Get Profile
```bash
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 2. Token Sales Module

### 2.1 Get Current Price (Public)
```bash
curl -X GET http://localhost:3001/token-sales/price
```

### 2.2 Get Quote (Public)
```bash
curl -X POST http://localhost:3001/token-sales/quote \
  -H "Content-Type: application/json" \
  -d '{
    "amountUsd": 100,
    "tokenPrice": 0.03
  }'
```

**Note:** `tokenPrice` is passed from the frontend and can be dynamic.

### 2.3 Buy Tokens
```bash
curl -X POST http://localhost:3001/token-sales/buy \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountUsd": 100,
    "tokenPrice": 0.03,
    "paymentToken": "BNB"
  }'
```

**Note:** The `tokenPrice` is provided by the frontend and represents the current market/presale price.

### 2.4 Buy Tokens with Referral
```bash
curl -X POST http://localhost:3001/token-sales/buy \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amountUsd": 100,
    "tokenPrice": 0.03,
    "paymentToken": "BNB",
    "referralCode": "AFFILIATE_CODE"
  }'
```

### 2.5 Get Purchase History
```bash
curl -X GET "http://localhost:3001/token-sales/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2.6 Get Sales Stats (Admin)
```bash
curl -X GET http://localhost:3001/token-sales/stats \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 3. Token Locking Module

### 3.1 Get Lock Tiers (Public)
```bash
curl -X GET http://localhost:3001/locking/tiers
```

Expected response:
```json
[
  { "id": "tier-6m", "name": "6 Months", "lockMonths": 6, "bonusPercent": "15.00" },
  { "id": "tier-12m", "name": "12 Months", "lockMonths": 12, "bonusPercent": "30.00" }
]
```

### 3.2 Lock Tokens
```bash
curl -X POST http://localhost:3001/locking/lock \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "lockTierId": "tier-6m"
  }'
```

### 3.3 Get User Locks
```bash
curl -X GET "http://localhost:3001/locking/locks?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3.4 Get Lock Details
```bash
curl -X GET http://localhost:3001/locking/locks/LOCK_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3.5 Get Rewards Summary
```bash
curl -X GET http://localhost:3001/locking/rewards \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3.6 Unlock Tokens (after lock period)
```bash
curl -X POST http://localhost:3001/locking/unlock/LOCK_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 4. Reward Pools Module (Admin)

### 4.1 Get All Pools
```bash
curl -X GET http://localhost:3001/pools \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 4.2 Get Pool Stats
```bash
curl -X GET http://localhost:3001/pools/stats \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 4.3 Update Pool
```bash
curl -X PATCH http://localhost:3001/pools/POOL_ID \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addAllocation": 1000000,
    "description": "Updated description"
  }'
```

---

## 5. Airdrops Module

### 5.1 Get Active Campaigns (Public)
```bash
curl -X GET http://localhost:3001/airdrops
```

### 5.2 Get Campaign Details (Public)
```bash
curl -X GET http://localhost:3001/airdrops/CAMPAIGN_ID
```

### 5.3 Create Campaign (Admin)
```bash
curl -X POST http://localhost:3001/airdrops \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Launch Airdrop",
    "description": "Early adopter rewards",
    "totalAllocation": 100000,
    "perUserAmount": 100,
    "maxParticipants": 1000,
    "startAt": "2025-01-01T00:00:00Z",
    "endAt": "2025-03-01T00:00:00Z",
    "tasks": [
      { "id": "task1", "type": "social_follow", "description": "Follow on Twitter", "url": "https://twitter.com/hbctoken" },
      { "id": "task2", "type": "social_share", "description": "Share announcement" }
    ]
  }'
```

### 5.4 Activate Campaign (Admin)
```bash
curl -X PATCH http://localhost:3001/airdrops/CAMPAIGN_ID \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ACTIVE"
  }'
```

### 5.5 Participate in Campaign
```bash
curl -X POST http://localhost:3001/airdrops/CAMPAIGN_ID/participate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
  }'
```

### 5.6 Complete Task
```bash
curl -X POST http://localhost:3001/airdrops/CAMPAIGN_ID/complete-task \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task1"
  }'
```

### 5.7 Get My Entries
```bash
curl -X GET http://localhost:3001/airdrops/my-entries \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5.8 Distribute Airdrop (Admin)
```bash
curl -X POST http://localhost:3001/airdrops/CAMPAIGN_ID/distribute \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 6. Marketplace Module

### 6.1 Categories

#### Get All Categories (Public)
```bash
curl -X GET http://localhost:3001/marketplace/categories
```

#### Create Category (Admin)
```bash
curl -X POST http://localhost:3001/marketplace/categories \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fire Extinguishers",
    "slug": "fire-extinguishers",
    "description": "Professional fire extinguishers"
  }'
```

### 6.2 Products

#### Get All Products (Public)
```bash
curl -X GET "http://localhost:3001/marketplace/products?page=1&limit=20"
```

#### Get Featured Products (Public)
```bash
curl -X GET "http://localhost:3001/marketplace/products/featured?limit=6"
```

#### Get Product by Slug (Public)
```bash
curl -X GET http://localhost:3001/marketplace/products/product-slug
```

#### Create Product (Admin)
```bash
curl -X POST http://localhost:3001/marketplace/products \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": "CATEGORY_ID",
    "name": "ABC Fire Extinguisher 5kg",
    "slug": "abc-fire-extinguisher-5kg",
    "description": "Professional ABC dry powder fire extinguisher",
    "priceHbct": 500,
    "priceFiat": 15,
    "isFeatured": true,
    "initialStock": 100,
    "images": [
      { "url": "https://example.com/image1.jpg", "alt": "Front view", "isPrimary": true }
    ]
  }'
```

#### Update Inventory (Admin)
```bash
curl -X PATCH http://localhost:3001/marketplace/products/PRODUCT_ID/inventory \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 150,
    "lowStock": 10
  }'
```

### 6.3 Orders

#### Create Order
```bash
curl -X POST http://localhost:3001/marketplace/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": "PRODUCT_ID", "quantity": 2 }
    ],
    "shipping": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    },
    "paymentMethod": "HBCT"
  }'
```

#### Get My Orders
```bash
curl -X GET "http://localhost:3001/marketplace/orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get Order Details
```bash
curl -X GET http://localhost:3001/marketplace/orders/ORDER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Update Order Status (Admin)
```bash
curl -X PATCH http://localhost:3001/marketplace/orders/ORDER_ID/status \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "SHIPPED",
    "trackingNumber": "1Z999AA10123456784",
    "trackingUrl": "https://tracking.example.com/1Z999AA10123456784"
  }'
```

#### Cancel Order
```bash
curl -X POST http://localhost:3001/marketplace/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 7. Affiliates Module

### 7.1 Register as Affiliate
```bash
curl -X POST http://localhost:3001/affiliates/register \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7.2 Get Affiliate Profile
```bash
curl -X GET http://localhost:3001/affiliates/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7.3 Get Affiliate Stats
```bash
curl -X GET http://localhost:3001/affiliates/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7.4 Get Referrals
```bash
curl -X GET "http://localhost:3001/affiliates/referrals?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7.5 Get Commissions
```bash
curl -X GET "http://localhost:3001/affiliates/commissions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7.6 Get Sales from Referrals
```bash
curl -X GET "http://localhost:3001/affiliates/sales?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7.7 Get Leaderboard (Public)
```bash
curl -X GET "http://localhost:3001/affiliates/leaderboard?limit=10"
```

### 7.8 Validate Referral Code (Public)
```bash
curl -X GET http://localhost:3001/affiliates/validate/REFERRAL_CODE
```

### 7.9 Withdraw Earnings
```bash
curl -X POST http://localhost:3001/affiliates/withdraw \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100
  }'
```

---

## 8. Admin Module

### 8.1 Get Dashboard
```bash
curl -X GET http://localhost:3001/admin/dashboard \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 8.2 Get All Users
```bash
curl -X GET "http://localhost:3001/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 8.3 Search Users
```bash
curl -X GET "http://localhost:3001/admin/users?search=john&role=USER" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 8.4 Update User Role
```bash
curl -X PATCH http://localhost:3001/admin/users/USER_ID/role \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ADMIN"
  }'
```

### 8.5 Get All Transactions
```bash
curl -X GET "http://localhost:3001/admin/transactions?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 8.6 Filter Transactions
```bash
curl -X GET "http://localhost:3001/admin/transactions?type=BUY_WEBSITE&status=COMPLETED" \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 8.7 Get Lock Tiers
```bash
curl -X GET http://localhost:3001/admin/lock-tiers \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 8.8 Create Lock Tier
```bash
curl -X POST http://localhost:3001/admin/lock-tiers \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "24 Months",
    "lockMonths": 24,
    "bonusPercent": 50,
    "feeDiscountPercent": 70,
    "minAmount": 100
  }'
```

### 8.9 Update Lock Tier
```bash
curl -X PATCH http://localhost:3001/admin/lock-tiers/TIER_ID \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bonusPercent": 55,
    "isActive": true
  }'
```

### 8.10 Get Token Config
```bash
curl -X GET http://localhost:3001/admin/token-config \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

### 8.11 Update Token Config
```bash
curl -X PATCH http://localhost:3001/admin/token-config \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPrice": 0.05,
    "isPresale": false
  }'
```

### 8.12 Get System Stats
```bash
curl -X GET http://localhost:3001/admin/system-stats \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN"
```

---

## 9. Users Module

### 9.1 Get User Profile
```bash
curl -X GET http://localhost:3001/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 9.2 Update Profile
```bash
curl -X PATCH http://localhost:3001/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }'
```

---

## 10. Tokens Module (Legacy)

### 10.1 Get Token Info
```bash
curl -X GET http://localhost:3001/tokens/info
```

### 10.2 Get Token Price
```bash
curl -X GET http://localhost:3001/tokens/price
```

### 10.3 Get Balance
```bash
curl -X GET http://localhost:3001/tokens/balance \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 10.4 Get Transaction History
```bash
curl -X GET "http://localhost:3001/tokens/transactions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Complete Test Flow

Here's a recommended order for testing the complete system:

### Step 1: Setup
1. Start the server
2. Seed the database

### Step 2: Authentication
1. Register a new user
2. Login and save the token
3. Login as admin and save admin token

### Step 3: Buy Tokens
1. Get token price
2. Get a quote
3. Buy tokens
4. Check balance

### Step 4: Lock Tokens
1. Get lock tiers
2. Lock tokens (6 months)
3. View locks
4. Check rewards summary

### Step 5: Affiliate Flow
1. Register as affiliate
2. Get referral code
3. Create second user
4. Buy tokens with referral code
5. Check commissions

### Step 6: Airdrop Flow (Admin)
1. Create campaign
2. Activate campaign
3. Participate (as user)
4. Complete tasks
5. Distribute airdrop

### Step 7: Marketplace Flow
1. Create category (admin)
2. Create product (admin)
3. Get products
4. Create order
5. Update order status (admin)

### Step 8: Admin Dashboard
1. View dashboard
2. Check system stats
3. View all users
4. View all transactions

---

## Swagger Documentation

The API documentation is available at:
```
http://localhost:3001/api
```

This provides an interactive UI for testing all endpoints.

---

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Token expired - login again
   - Missing Authorization header

2. **400 Bad Request**
   - Check request body format
   - Validate required fields

3. **404 Not Found**
   - Check endpoint URL
   - Verify resource IDs

4. **500 Internal Server Error**
   - Check server logs
   - Verify database connection

### Useful Commands

```bash
# View server logs
npm run start:dev

# Reset database
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Run linting
npm run lint
```
