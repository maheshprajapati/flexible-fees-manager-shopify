# Shopify App Development Prompt for AI Agent

## Project Overview

I'm porting my existing **Flexible Fees Manager for WooCommerce** plugin to Shopify as a **Public Shopify App** for the Shopify App Store. The app should maintain the same core logic, UI/UX patterns, and feature set, adapted for Shopify's architecture.

## Source Plugin Reference

**Plugin Name:** Flexible Fees Manager for WooCommerce Pro  
**Current Platform:** WooCommerce (WordPress)  
**Target Platform:** Shopify (Public App for App Store)  
**Plugin Location:** `/Users/mahesh/Mahesh/Flexible Fee Manager/Freemius/New 18 Dec/flexible-fees-manager-for-woocommerce-pro`

### Core Functionality

The plugin allows store owners to create conditional fees that automatically apply at checkout based on various conditions. Fees can be fixed amounts, percentages, or quantity-based calculations.

## Technical Stack & Architecture

### Shopify App Type
- **Public Embedded App** (for App Store distribution)
- **Template:** Shopify React Router App Template (TypeScript) - use the official Shopify CLI template
- **Framework:** React Router + Node.js (TypeScript)
- **UI Library:** Shopify Polaris + App Bridge
- **Database:** PostgreSQL (for storing fee rules, conditions, settings, logs)
- **Hosting:** Render / Fly.io / Heroku / AWS (your choice)

### Shopify Extensions Required
1. **Theme App Extension** (for cart/mini-cart fee display widget)
2. **Optional (future):** Checkout UI Extension (for Plus stores)

### Fee Application Method
Since Shopify doesn't allow arbitrary checkout fees on all plans, use the **"Fee Product" approach**:
- Create a hidden product/variant representing the fee
- Dynamically add/update this product line item in cart via Cart API
- Use Theme App Extension to display fee breakdown in cart UI
- This works on ALL Shopify plans (not just Plus)

## Feature Requirements

### 1. Fee Calculation Types
Support three calculation types (same as WooCommerce plugin):

- **Fixed Amount**: Flat fee (e.g., $5.00)
- **Percentage**: Percentage of cart subtotal (e.g., 5% of cart total)
- **Multiple (by quantity)**: Amount per item × quantity (e.g., $2.00 × 3 items = $6.00)

Each fee can have a **+ (add)** or **- (subtract/discount)** sign.

### 2. Fee Conditions (All Must Be Supported)

#### Cart Conditions:
- **Subtotal**: Cart subtotal (e.g., >= $100)
- **Subtotal ex. taxes**: Cart subtotal excluding taxes
- **Contains Product**: Cart contains specific product(s)
- **Tax**: Tax amount conditions
- **Quantity**: Total cart quantity
- **Coupon**: Applied coupon code(s)
- **Weight**: Total cart weight
- **Contains shipping class**: Products with specific shipping class

#### User Details Conditions:
- **Country**: Shipping/billing country
- **User Role**: Customer tags (Shopify equivalent of user roles)
- **Zipcode**: Shipping zipcode/postal code
- **City**: Shipping city
- **State/Province**: Shipping state/province

#### Product Conditions:
- **Stock**: Product stock quantity
- **Stock Status**: In stock / Out of stock
- **Width**: Product width dimension
- **Height**: Product height dimension
- **Length**: Product length dimension
- **Category**: Product collection (Shopify equivalent of categories)

### 3. Condition Logic

- **AND/OR Groups**: Support multiple condition groups with AND/OR logic between groups
- **Within Groups**: Support AND/OR logic within each condition group
- **Operators**: Support operators like `==`, `!=`, `>=`, `<=`, `>`, `<`, `contains`, `not contains`, etc. (as appropriate per condition type)
- **Multiple Values**: Support selecting multiple values for conditions (e.g., multiple countries, multiple products)

### 4. Fee Settings

Each fee rule should have:
- **Fee Title**: Display name (e.g., "Handling Fee", "Service Charge")
- **Fee Amount**: Numeric value
- **Calculation Type**: Fixed / Percentage / Multiple
- **Sign**: + (add) or - (subtract/discount)
- **Tax Status**: Taxable / Non-taxable / Custom tax class (map to Shopify tax settings)
- **Status**: Enabled / Disabled
- **Priority/Order**: Rule execution order (for stacking multiple fees)

### 5. Admin UI Requirements

Replicate the WooCommerce plugin's admin interface:

- **Dashboard/List View**: 
  - Table/list of all fee rules
  - Columns: Title, Amount, Status (Published/Draft/Pending), Actions (Edit/Delete/Duplicate)
  - Bulk actions (Delete, Enable, Disable, Duplicate)
  - Search and filter capabilities

- **Fee Editor** (Create/Edit):
  - **Fee Settings Section**:
    - Fee Title input
    - Fee Amount input with currency symbol
    - Calculation Type dropdown (Fixed/Percentage/Multiple)
    - Sign toggle (+/-)
    - Tax Status dropdown
    - Save button
  
  - **Fee Conditions Section**:
    - Visual condition builder with drag-and-drop (if possible)
    - Add condition button with grouped condition types (Cart / User Details / Product)
    - Condition cards showing: Type, Operator, Value(s)
    - Add "OR Group" button for multiple condition groups
    - Parent AND/OR toggle for combining groups
    - Delete condition/group buttons
    - Visual indicators for condition groups

- **UI Design**:
  - Modern, clean interface matching Shopify Polaris design system
  - Use Polaris components (Card, Button, Select, TextField, etc.)
  - Responsive design
  - Tooltips/help text for complex features

### 6. Free vs Paid Plans

Implement subscription billing using Shopify Billing API:

#### Free Plan Features:
- Limited to **3 fee rules**
- Basic conditions only:
  - Subtotal
  - Subtotal ex. taxes
  - Contains Product
  - Country
  - User Role (Customer Tags)
  - Length
  - Stock
  - Stock Status
- Basic fee types: Fixed, Percentage, Multiple
- No priority/stacking
- No advanced conditions

#### Paid Plans (Subscription):
- **Starter Plan**: 10 fee rules, all conditions, priority stacking
- **Pro Plan**: Unlimited rules, all conditions, priority stacking, scheduled rules, advanced features
- **Enterprise Plan**: Everything + priority support, custom integrations

Use Shopify's `appSubscriptionCreate` mutation for recurring billing.

### 7. Data Structure

Store fee rules in PostgreSQL with this structure:

```typescript
// Fee Rule
{
  id: string (UUID)
  shopId: string (Shopify shop ID)
  title: string
  amount: number
  calculationType: 'fixed' | 'percentage' | 'multiple'
  sign: '+' | '-'
  taxClass: string
  status: 'published' | 'draft' | 'pending'
  priority: number
  conditions: {
    parentAndOr: 'and' | 'or'
    groups: Array<{
      id: string
      andOr: 'and' | 'or'
      conditions: Array<{
        id: string
        type: string
        operator: string
        value: string | string[]
      }>
    }>
  }
  createdAt: Date
  updatedAt: Date
}
```

### 8. Fee Application Logic

**Cart Update Flow:**
1. On cart update (via webhook or cart API), fetch all active fee rules for the shop
2. Evaluate each rule's conditions against current cart data
3. Calculate fee amount based on calculation type
4. If conditions match:
   - Check if fee product line item exists in cart
   - If exists, update quantity/price
   - If not, add fee product as line item
5. If conditions don't match, remove fee product from cart if present

**Condition Evaluation:**
- Fetch cart data via Shopify Admin API or Storefront API
- Compare cart values against condition rules
- Use AND/OR logic to determine if fee should apply
- Support multiple matching fees (stacking) based on priority

### 9. Shopify API Usage

**Required API Scopes:**
- `read_products` - Read product data for conditions
- `write_products` - Create/update fee product
- `read_orders` - Optional, for analytics
- `read_customers` - Read customer tags/segments
- `read_checkouts` - Read cart data
- `write_checkouts` - Update cart (if using checkout API)
- `read_shipping` - Read shipping methods/classes

**Key APIs:**
- **Admin API**: Fetch products, customers, cart data
- **Storefront API**: For theme extensions
- **Cart API**: Update cart with fee product
- **Billing API**: Handle subscriptions

### 10. Webhooks

Set up webhooks for:
- `app/uninstalled` - Clean up fee product and data
- `shop/update` - Handle shop changes
- `cart/update` - Trigger fee recalculation (if using checkout extensibility)

### 11. Theme App Extension

Create a Theme App Extension that:
- Displays fee breakdown in cart/mini-cart
- Shows which fees are applied
- Updates dynamically when cart changes
- Styled to match store theme

## Development Phases

### Phase 1: Core Setup
1. Clone Shopify React Router app template
2. Set up database schema (PostgreSQL)
3. Configure Shopify OAuth and app installation
4. Set up basic Polaris UI structure

### Phase 2: Admin Interface
1. Build fee rules list/dashboard page
2. Build fee editor (create/edit form)
3. Implement condition builder UI
4. Add fee settings form

### Phase 3: Fee Logic Engine
1. Build condition evaluation engine
2. Implement fee calculation logic
3. Create fee product management
4. Build cart update logic

### Phase 4: Theme Extension
1. Create Theme App Extension
2. Build cart fee display component
3. Style to match Polaris/theme

### Phase 5: Billing & Plans
1. Implement Shopify Billing API
2. Add plan gating (free vs paid features)
3. Set up subscription management

### Phase 6: Testing & Polish
1. Test all conditions
2. Test fee calculations
3. Test on different Shopify plans
4. UI/UX polish
5. Error handling

## Key Differences: WooCommerce → Shopify

### Mapping Concepts:
- **User Roles** → **Customer Tags** (Shopify doesn't have roles, use tags)
- **Product Categories** → **Product Collections**
- **Shipping Classes** → **Shipping Profiles** or **Product Tags**
- **Tax Classes** → **Shopify Tax Settings** (map appropriately)
- **Cart Fee Hook** → **Fee Product Line Item** (workaround for non-Plus stores)

### Data Access:
- WooCommerce: Direct database access
- Shopify: API-only (Admin API, Storefront API, Cart API)

### Fee Application:
- WooCommerce: `$cart->add_fee()` hook
- Shopify: Add/update cart line item (fee product)

## Code Quality Standards

- Follow Shopify's coding standards
- Use TypeScript for type safety
- Implement proper error handling
- Add logging for debugging
- Write unit tests for fee calculation logic
- Use environment variables for sensitive data
- Implement rate limiting for API calls
- Add proper validation for all inputs

## Security Considerations

- Validate all user inputs
- Sanitize data before storing
- Use parameterized queries (Prisma/TypeORM)
- Implement CSRF protection
- Secure API keys and secrets
- Follow Shopify's security best practices
- Handle webhook verification

## Testing Requirements

- Test on Basic, Shopify, Advanced, and Plus plans
- Test all condition types
- Test fee calculation types (fixed, percentage, multiple)
- Test AND/OR logic combinations
- Test multiple fee stacking
- Test cart updates and fee recalculation
- Test billing/subscription flows
- Test uninstall cleanup

## Success Criteria

The app should:
1. ✅ Work identically to the WooCommerce plugin in terms of functionality
2. ✅ Support all condition types from the original plugin
3. ✅ Have a modern, Polaris-based admin UI
4. ✅ Successfully apply fees via fee product method
5. ✅ Support free and paid subscription plans
6. ✅ Pass Shopify App Store review
7. ✅ Work on all Shopify plans (not just Plus)

## Additional Notes

- Reference the WooCommerce plugin code in `/Users/mahesh/Mahesh/Flexible Fee Manager/Freemius/New 18 Dec/flexible-fees-manager-for-woocommerce-pro` for exact logic implementation
- The plugin uses WordPress Custom Post Types for fee rules - translate this to PostgreSQL tables
- The plugin has a complex condition evaluation system - port this logic carefully
- Maintain the same UI/UX patterns where possible (adapted to Polaris)

---

**Start by:**
1. Cloning the Shopify React Router app template
2. Setting up the database schema
3. Building the basic admin dashboard structure
4. Then proceed with implementing features phase by phase

**When in doubt, refer to the WooCommerce plugin code for exact behavior and logic.**

