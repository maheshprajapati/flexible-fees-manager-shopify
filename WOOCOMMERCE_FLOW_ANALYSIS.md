# WooCommerce Plugin Flow Analysis

Based on the screenshots provided, here's the complete flow of how the WooCommerce plugin works:

## 1. List Page ("All Fees" Dashboard)

### Features:
- **Header**: "All Fees" with "Add New Fee" button (purple)
- **Tabs**: "All Fees" and "Analytics Dashboard"
- **Filters**: 
  - All (with count)
  - Active (with count)
  - Inactive (with count)
  - Trash (with count, red indicator)
- **Search Bar**: "Search Fees..." with search button
- **Bulk Actions**: Dropdown with "Apply" button
- **Table Columns**:
  - # (ID number)
  - Title (with "Published" badge)
  - Fee Title (duplicate of Title)
  - Fee Status (Active toggle switch)
  - Fee Amount (e.g., "$10", "$5")
  - Published On (date/time)
  - Groups (count of condition groups)
  - Actions (Edit, Duplicate, Delete icons)

### Flow:
1. User clicks "Add New Fee" → Navigates to create page
2. User clicks on a fee title → Navigates to edit page
3. User can filter by status, search, or use bulk actions

---

## 2. Create/Edit Page Flow

### Step 1: Initial View
- **Header**: Shows "All Fees / [Fee Title]" breadcrumb
- **Title Field**: Editable input with "Draft" status badge
- **Tooltip Banner**: Blue notification explaining how to configure the fee
- **Fee Settings Card**: Collapsible card (initially open for new fees)

### Step 2: Fee Settings Card
**Structure:**
- Card header with "Fee Settings" title and tooltip icon
- "Save & Continue" button (black) and close (X) button
- Card content:
  - **Fee Title*** (required): Text input with placeholder "e.g. Extra Fees Manager"
  - **Fee Amount*** (required):
    - Dropdown: "Fixed Amount" | "Percentage" | "Multiple (by quantity)"
    - Input group: $ symbol, + button, - button, amount input
    - Helper text explaining the calculation type
  - **Tax Status**: Dropdown (Standard | Taxable | Non-taxable)

**Flow:**
1. User enters fee title
2. User selects calculation type
3. User enters amount (with +/- for add/subtract)
4. User selects tax status
5. User clicks "Save & Continue" → Card closes, conditions section becomes active

### Step 3: Fee Conditions Section
**Visual Structure:**
- Flowchart-like layout with condition cards
- **Condition Cards**: Show fee type, operator, and value
- **Connectors**: Show "AND" or "OR" between conditions
- **Group Connectors**: Show "OR GROUP" between condition groups
- **Right Sidebar**: Opens when editing a condition (shows condition details)

**Condition Types (3 Columns in Modal):**
1. **Cart Conditions**:
   - Subtotal
   - Subtotal ex. taxes
   - Contains Product
   - Tax
   - Quantity
   - Coupon
   - Weight
   - Contains shipping class
   - Shipping Method
   - Payment Method

2. **User Details**:
   - Country
   - User Role
   - Zipcode
   - City
   - State

3. **Product Conditions**:
   - Length
   - Stock
   - Stock Status
   - Width
   - Height
   - Category

**Adding Conditions Flow:**
1. User clicks "Add New Condition" → Opens "Fee Conditions" modal
2. Modal shows 3 columns (Cart, User Details, Product)
3. User clicks a condition type → Modal closes
4. Condition card appears in the flowchart
5. User clicks condition card → Right sidebar opens for editing
6. Sidebar shows:
   - Fee Type (selected condition)
   - Condition Type (operator dropdown: Equal to, Not equal to, etc.)
   - Enter Value (input field with autocomplete/tags for multi-select)
   - List of available values (for dropdowns like shipping methods)
   - "Delete" and "Update" buttons

**Condition Groups:**
- Multiple condition groups can be created
- Groups are connected with "OR GROUP" connectors
- Within a group, conditions are connected with "AND" or "OR"
- Each group can have multiple conditions

**Visual Indicators:**
- Green "Published" badge on title
- Status indicators (Draft, Published, Pending)
- Icons for each condition type
- Color-coded connectors (AND/OR)

### Step 4: Save/Publish
- **Top Right**: Date/time picker for scheduling
- **Update Button**: Saves and publishes the fee
- Button text changes based on status:
  - "Publish" (for new fees)
  - "Update" (for existing published fees)
  - "Save as Draft" (for drafts)
  - "Schedule" (for scheduled)

---

## 3. Key UI Patterns

### Card-Based Design
- Fee Settings: Collapsible card with header and actions
- Condition Cards: Visual cards showing condition details
- Modal: For selecting condition types

### Visual Flowchart
- Conditions shown as connected cards
- Connectors show logic (AND/OR)
- Groups visually separated
- Right sidebar for detailed editing

### Status Management
- Draft/Published/Pending statuses
- Active/Inactive toggle
- Published date/time display
- Scheduling capability

---

## 4. Shopify Implementation Alignment

### Current Implementation Status:
✅ **List Page**: Basic table with filters (needs status filters)
✅ **Create/Edit Page**: Form structure exists
✅ **Fee Settings**: All fields present
✅ **Conditions**: Basic condition builder exists

### Needs Improvement:
1. **Visual Hierarchy**: Make Fee Settings more prominent (card-like)
2. **Condition Visualization**: Better visual representation of AND/OR logic
3. **Status Filters**: Add All/Active/Inactive/Trash filters to list page
4. **Search**: Add search functionality to list page
5. **Bulk Actions**: Add bulk actions dropdown
6. **Condition Modal**: Consider modal for condition type selection
7. **Right Sidebar**: Consider sidebar for condition editing (optional, can use inline editing)

### Shopify Polaris Adaptations:
- Use `s-card` or `s-box` for Fee Settings section
- Use visual connectors or badges for AND/OR logic
- Use `s-modal` for condition type selection (if needed)
- Maintain Polaris design system while matching functionality

---

## 5. Navigation Flow Summary

```
List Page (/app/fees)
  ↓ Click "Create Fee Rule"
Create Page (/app/fees/new)
  ↓ Fill Fee Settings → Save & Continue
  ↓ Add Conditions → Configure
  ↓ Save/Publish
Edit Page (/app/fees/:id)
  ↓ Edit Settings
  ↓ Edit Conditions
  ↓ Update
List Page (updated)
```

This matches the WooCommerce flow: List → Create → Configure → Save → List

