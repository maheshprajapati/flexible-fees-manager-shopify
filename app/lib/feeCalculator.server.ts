/**
 * Fee Calculation and Condition Evaluation Engine
 * 
 * This module handles:
 * 1. Evaluating fee rule conditions against cart data
 * 2. Calculating fee amounts based on calculation type
 * 3. Determining which fees should be applied to a cart
 */

interface CartData {
  subtotal: number;
  subtotalExTax?: number;
  tax?: number;
  quantity: number;
  weight?: number;
  productIds?: string[];
  couponCodes?: string[];
  shippingCountry?: string;
  shippingState?: string;
  shippingCity?: string;
  shippingZipcode?: string;
  customerTags?: string[];
  lineItems?: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    price: number;
    weight?: number;
    collectionIds?: string[];
    stock?: number;
    stockStatus?: string;
    dimensions?: {
      width?: number;
      height?: number;
      length?: number;
    };
  }>;
}

interface Condition {
  type: string;
  operator: string;
  value: string | string[];
}

interface ConditionGroup {
  andOr: "and" | "or";
  conditions: Condition[];
}

interface FeeRule {
  id: string;
  title: string;
  amount: number;
  calculationType: "fixed" | "percentage" | "multiple";
  sign: "+" | "-";
  taxClass?: string | null;
  status: string;
  priority: number;
  parentAndOr: "and" | "or";
  conditionGroups: ConditionGroup[];
}

/**
 * Evaluate a single condition against cart data
 */
function evaluateCondition(condition: Condition, cartData: CartData): boolean {
  const { type, operator, value } = condition;

  switch (type) {
    case "subtotal":
      return compareNumeric(cartData.subtotal, operator, parseFloat(value as string));

    case "subtotal_ex_tax":
      return compareNumeric(
        cartData.subtotalExTax || cartData.subtotal,
        operator,
        parseFloat(value as string)
      );

    case "tax":
      return compareNumeric(cartData.tax || 0, operator, parseFloat(value as string));

    case "quantity":
      return compareNumeric(cartData.quantity, operator, parseFloat(value as string));

    case "weight":
      return compareNumeric(cartData.weight || 0, operator, parseFloat(value as string));

    case "contains_product":
      if (!cartData.productIds || !Array.isArray(value)) return false;
      const productIds = Array.isArray(value) ? value : [value];
      return operator === "in"
        ? productIds.some((id) => cartData.productIds!.includes(id))
        : !productIds.some((id) => cartData.productIds!.includes(id));

    case "coupon":
      if (!cartData.couponCodes || !Array.isArray(value)) return false;
      const coupons = Array.isArray(value) ? value : [value];
      return operator === "in"
        ? coupons.some((code) => cartData.couponCodes!.includes(code))
        : !coupons.some((code) => cartData.couponCodes!.includes(code));

    case "country":
      return compareString(cartData.shippingCountry || "", operator, value as string);

    case "state":
      return compareString(cartData.shippingState || "", operator, value as string);

    case "city":
      return compareString(cartData.shippingCity || "", operator, value as string);

    case "zipcode":
      return compareString(cartData.shippingZipcode || "", operator, value as string);

    case "customer_tag":
      if (!cartData.customerTags || !Array.isArray(value)) return false;
      const tags = Array.isArray(value) ? value : [value];
      return operator === "in"
        ? tags.some((tag) => cartData.customerTags!.includes(tag))
        : !tags.some((tag) => cartData.customerTags!.includes(tag));

    case "collection":
      if (!cartData.lineItems || !Array.isArray(value)) return false;
      const collectionIds = Array.isArray(value) ? value : [value];
      const cartCollectionIds = cartData.lineItems.flatMap(
        (item) => item.collectionIds || []
      );
      return operator === "in"
        ? collectionIds.some((id) => cartCollectionIds.includes(id))
        : !collectionIds.some((id) => cartCollectionIds.includes(id));

    case "stock":
      if (!cartData.lineItems) return false;
      const stockValue = parseFloat(value as string);
      return cartData.lineItems.some((item) =>
        item.stock !== undefined && compareNumeric(item.stock, operator, stockValue)
      );

    case "stock_status":
      if (!cartData.lineItems) return false;
      const statusValue = value as string;
      return cartData.lineItems.some((item) =>
        item.stockStatus && compareString(item.stockStatus, operator, statusValue)
      );

    case "width":
    case "height":
    case "length":
      if (!cartData.lineItems) return false;
      const dimensionValue = parseFloat(value as string);
      const dimension = type as "width" | "height" | "length";
      return cartData.lineItems.some((item) => {
        const itemDimension = item.dimensions?.[dimension];
        return itemDimension !== undefined && compareNumeric(itemDimension, operator, dimensionValue);
      });

    default:
      return false;
  }
}

/**
 * Compare numeric values
 */
function compareNumeric(actual: number, operator: string, expected: number): boolean {
  switch (operator) {
    case ">=":
      return actual >= expected;
    case "<=":
      return actual <= expected;
    case ">":
      return actual > expected;
    case "<":
      return actual < expected;
    case "==":
      return Math.abs(actual - expected) < 0.01; // Float comparison
    case "!=":
      return Math.abs(actual - expected) >= 0.01;
    default:
      return false;
  }
}

/**
 * Compare string values
 */
function compareString(actual: string, operator: string, expected: string): boolean {
  const actualLower = actual.toLowerCase();
  const expectedLower = expected.toLowerCase();

  switch (operator) {
    case "==":
      return actualLower === expectedLower;
    case "!=":
      return actualLower !== expectedLower;
    case "contains":
      return actualLower.includes(expectedLower);
    case "not_contains":
      return !actualLower.includes(expectedLower);
    default:
      return false;
  }
}

/**
 * Evaluate a condition group (AND/OR logic within group)
 */
function evaluateConditionGroup(group: ConditionGroup, cartData: CartData): boolean {
  if (group.conditions.length === 0) return true;

  const results = group.conditions.map((condition) =>
    evaluateCondition(condition, cartData)
  );

  if (group.andOr === "and") {
    return results.every((result) => result === true);
  } else {
    return results.some((result) => result === true);
  }
}

/**
 * Evaluate all condition groups for a fee rule
 */
function evaluateFeeRuleConditions(feeRule: FeeRule, cartData: CartData): boolean {
  if (feeRule.conditionGroups.length === 0) return true;

  const groupResults = feeRule.conditionGroups.map((group) =>
    evaluateConditionGroup(group, cartData)
  );

  if (feeRule.parentAndOr === "and") {
    return groupResults.every((result) => result === true);
  } else {
    return groupResults.some((result) => result === true);
  }
}

/**
 * Calculate fee amount based on calculation type
 */
function calculateFeeAmount(
  feeRule: FeeRule,
  cartData: CartData
): number {
  let amount = 0;

  switch (feeRule.calculationType) {
    case "fixed":
      amount = feeRule.amount;
      break;

    case "percentage":
      amount = (cartData.subtotal * feeRule.amount) / 100;
      break;

    case "multiple":
      amount = feeRule.amount * cartData.quantity;
      break;

    default:
      amount = 0;
  }

  // Apply sign
  if (feeRule.sign === "-") {
    amount = -amount;
  }

  return Math.round(amount * 100) / 100; // Round to 2 decimal places
}

/**
 * Get all applicable fees for a cart
 * Returns fees sorted by priority
 */
export function getApplicableFees(
  feeRules: FeeRule[],
  cartData: CartData
): Array<{ feeRule: FeeRule; amount: number }> {
  const applicableFees: Array<{ feeRule: FeeRule; amount: number }> = [];

  // Filter only published fees and sort by priority
  const activeRules = feeRules
    .filter((rule) => rule.status === "published")
    .sort((a, b) => a.priority - b.priority);

  for (const feeRule of activeRules) {
    if (evaluateFeeRuleConditions(feeRule, cartData)) {
      const amount = calculateFeeAmount(feeRule, cartData);
      applicableFees.push({ feeRule, amount });
    }
  }

  return applicableFees;
}

/**
 * Convert Shopify cart data to our CartData format
 * This is a helper function to be used with Shopify API responses
 */
export function convertShopifyCartToCartData(shopifyCart: any): CartData {
  const lineItems = shopifyCart.lineItems?.edges?.map((edge: any) => ({
    productId: edge.node.product?.id || "",
    variantId: edge.node.variant?.id || "",
    quantity: edge.node.quantity || 0,
    price: parseFloat(edge.node.variant?.price || "0"),
    weight: parseFloat(edge.node.variant?.weight || "0"),
    collectionIds: edge.node.product?.collections?.edges?.map((e: any) => e.node.id) || [],
    stock: edge.node.variant?.inventoryQuantity || undefined,
    stockStatus: edge.node.variant?.availableForSale ? "in_stock" : "out_of_stock",
    dimensions: {
      width: parseFloat(edge.node.variant?.metafields?.width?.value || "0") || undefined,
      height: parseFloat(edge.node.variant?.metafields?.height?.value || "0") || undefined,
      length: parseFloat(edge.node.variant?.metafields?.length?.value || "0") || undefined,
    },
  })) || [];

  return {
    subtotal: parseFloat(shopifyCart.subtotalPrice?.amount || "0"),
    subtotalExTax: parseFloat(shopifyCart.subtotalPrice?.amount || "0"),
    tax: parseFloat(shopifyCart.totalTax?.amount || "0"),
    quantity: lineItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
    weight: lineItems.reduce((sum: number, item: any) => sum + (item.weight || 0) * item.quantity, 0),
    productIds: lineItems.map((item: any) => item.productId),
    couponCodes: shopifyCart.discountCodes?.map((code: any) => code.code) || [],
    shippingCountry: shopifyCart.shippingAddress?.country || "",
    shippingState: shopifyCart.shippingAddress?.province || "",
    shippingCity: shopifyCart.shippingAddress?.city || "",
    shippingZipcode: shopifyCart.shippingAddress?.zip || "",
    customerTags: shopifyCart.customer?.tags || [],
    lineItems,
  };
}

