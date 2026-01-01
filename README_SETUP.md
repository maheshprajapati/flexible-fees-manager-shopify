# Flexible Fees Manager for Shopify - Setup Guide

## Prerequisites

1. **Node.js**: Version 20.19+ or 22.12+
2. **Shopify Partner Account**: [Create one here](https://partners.shopify.com/signup)
3. **Shopify CLI**: Install globally with `npm install -g @shopify/cli@latest`
4. **PostgreSQL Database**: Set up a PostgreSQL database (local or cloud)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Database

1. Create a PostgreSQL database
2. Set the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/flexible_fees_manager"
   ```

### 3. Run Database Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

This will:
- Create the database schema (FeeRule, ConditionGroup, Condition, Subscription tables)
- Generate Prisma client

### 4. Configure Shopify App

The app configuration is in `shopify.app.toml`. Make sure your scopes include:
- `write_products` - Create/update fee products
- `read_products` - Read product data for conditions
- `read_orders` - Optional, for analytics
- `read_customers` - Read customer tags
- `read_checkouts` - Read cart data
- `write_checkouts` - Update cart
- `read_shipping` - Read shipping methods

### 5. Start Development Server

```bash
npm run dev
```

This will:
- Start the development server
- Open a tunnel for webhooks
- Prompt you to install the app on a development store

## Project Structure

```
flexible-fees-manager/
├── app/
│   ├── components/
│   │   └── FeeEditor.tsx          # Fee rule editor component
│   ├── lib/
│   │   ├── feeCalculator.server.ts # Fee calculation engine
│   │   └── feeProduct.server.ts    # Fee product management
│   ├── routes/
│   │   ├── app.fees.tsx            # Fee rules list page
│   │   ├── app.fees.new.tsx        # Create fee rule page
│   │   ├── app.fees.$id.tsx        # Edit fee rule page
│   │   ├── api.cart.update.tsx     # Cart update API endpoint
│   │   └── webhooks.*.tsx          # Webhook handlers
│   └── shopify.server.ts           # Shopify app configuration
├── prisma/
│   └── schema.prisma               # Database schema
└── extensions/                      # Theme app extensions (to be created)
```

## Features Implemented

### ✅ Core Features

1. **Fee Rules Management**
   - Create, edit, delete fee rules
   - Duplicate fee rules
   - Enable/disable fee rules
   - Priority-based execution order

2. **Fee Calculation Types**
   - Fixed amount
   - Percentage of cart subtotal
   - Multiple (amount × quantity)

3. **Condition Builder**
   - Multiple condition groups with AND/OR logic
   - Support for cart, user, and product conditions
   - Various operators (>=, <=, ==, contains, etc.)

4. **Fee Product Management**
   - Automatic creation of hidden fee products
   - Dynamic variant creation for each fee rule
   - Cleanup on app uninstall

### 🚧 To Be Implemented

1. **Theme App Extension**
   - Cart fee display widget
   - Real-time fee updates

2. **Billing & Subscriptions**
   - Free plan (3 rules, basic conditions)
   - Paid plans (Starter, Pro, Enterprise)
   - Shopify Billing API integration

3. **Cart Integration**
   - Real-time cart fee calculation
   - Storefront API integration for cart updates

## Database Schema

### FeeRule
- Stores fee rule configuration (title, amount, calculation type, etc.)
- Links to condition groups

### ConditionGroup
- Groups of conditions with AND/OR logic
- Belongs to a fee rule

### Condition
- Individual condition (type, operator, value)
- Belongs to a condition group

### Subscription
- Stores shop subscription/plan information
- Used for feature gating

## API Endpoints

### `/app/fees`
- List all fee rules for the shop

### `/app/fees/new`
- Create a new fee rule

### `/app/fees/:id`
- Edit an existing fee rule

### `/api/cart/update`
- POST endpoint to recalculate fees for a cart
- Returns applicable fees and cart update instructions

## Webhooks

### `app/uninstalled`
- Cleans up fee products and all app data

### `app/scopes_update`
- Updates session scopes when permissions change

## Development Workflow

1. Make changes to code
2. Test locally with `npm run dev`
3. Test on development store
4. Deploy with `npm run deploy`

## Environment Variables

Required environment variables (set by Shopify CLI in development):
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`
- `SCOPES`
- `DATABASE_URL`

## Next Steps

1. **Create Theme App Extension**
   ```bash
   shopify app generate extension
   # Select "Theme app extension"
   ```

2. **Implement Billing**
   - Set up Shopify Billing API
   - Add plan selection UI
   - Implement feature gating

3. **Test Fee Application**
   - Test all condition types
   - Test fee calculations
   - Test cart updates

4. **Prepare for App Store**
   - Complete app listing
   - Prepare screenshots
   - Write app description
   - Submit for review

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database permissions

### Prisma Issues
- Run `npx prisma generate` after schema changes
- Run `npx prisma migrate dev` to apply migrations

### Shopify API Issues
- Verify API scopes in `shopify.app.toml`
- Check API rate limits
- Review webhook delivery logs

## Support

For issues or questions, refer to:
- [Shopify App Development Docs](https://shopify.dev/docs/apps)
- [React Router Docs](https://reactrouter.com/)
- [Prisma Docs](https://www.prisma.io/docs)

