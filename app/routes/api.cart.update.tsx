/**
 * Cart Update API Route
 * 
 * This endpoint is called when cart is updated to recalculate and apply fees
 * Can be called via webhook or directly from theme extension
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getApplicableFees, convertShopifyCartToCartData } from "../lib/feeCalculator.server";
import { getOrCreateFeeProduct, getOrCreateFeeVariant } from "../lib/feeProduct.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { admin, session } = await authenticate.admin(request);
    const shopId = session.shop;

    // Get cart data from request body
    const body = await request.json();
    const cartId = body.cartId;

    if (!cartId) {
      return new Response("Cart ID is required", { status: 400 });
    }

    // Fetch cart data from Shopify
    const cartResponse = await admin.graphql(
      `#graphql
        query getCart($id: ID!) {
          cart(id: $id) {
            id
            subtotalPrice {
              amount
            }
            totalTax {
              amount
            }
            lineItems(first: 250) {
              edges {
                node {
                  id
                  quantity
                  product {
                    id
                    collections(first: 10) {
                      edges {
                        node {
                          id
                        }
                      }
                    }
                  }
                  variant {
                    id
                    price
                    weight
                    inventoryQuantity
                    availableForSale
                    metafields(first: 10, namespace: "flexible_fees") {
                      edges {
                        node {
                          key
                          value
                        }
                      }
                    }
                  }
                }
              }
            }
            discountCodes {
              code
            }
            shippingAddress {
              country
              province
              city
              zip
            }
            customer {
              tags
            }
          }
        }`,
      {
        variables: {
          id: cartId,
        },
      }
    );

    const cartData = await cartResponse.json();
    const shopifyCart = cartData.data?.cart;

    if (!shopifyCart) {
      return new Response("Cart not found", { status: 404 });
    }

    // Convert to our format
    const cartDataFormatted = convertShopifyCartToCartData(shopifyCart);

    // Get all active fee rules for this shop
    const feeRules = await prisma.feeRule.findMany({
      where: {
        shopId,
        status: "published",
      },
      include: {
        conditionGroups: {
          include: {
            conditions: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
      orderBy: {
        priority: "asc",
      },
    });

    // Get applicable fees
    const applicableFees = getApplicableFees(feeRules, cartDataFormatted);

    // Get or create fee product
    const feeProduct = await getOrCreateFeeProduct(admin, shopId);

    // Get existing fee line items in cart
    const existingFeeLineItems = shopifyCart.lineItems.edges.filter((edge: any) => {
      const metafields = edge.node.variant?.metafields?.edges || [];
      return metafields.some((m: any) => m.node.key === "fee_rule_id");
    });

    // Remove fees that are no longer applicable
    const applicableFeeRuleIds = applicableFees.map((f) => f.feeRule.id);
    const feesToRemove = existingFeeLineItems.filter((edge: any) => {
      const metafields = edge.node.variant?.metafields?.edges || [];
      const feeRuleIdMetafield = metafields.find((m: any) => m.node.key === "fee_rule_id");
      return feeRuleIdMetafield && !applicableFeeRuleIds.includes(feeRuleIdMetafield.node.value);
    });

    // Update or add applicable fees
    const cartLinesToAdd: any[] = [];
    const cartLinesToUpdate: any[] = [];

    for (const { feeRule, amount } of applicableFees) {
      // Get or create variant for this fee
      const variantId = await getOrCreateFeeVariant(
        admin,
        feeProduct.productId,
        feeRule.id,
        feeRule.title,
        Math.abs(amount)
      );

      // Check if this fee already exists in cart
      const existingLineItem = existingFeeLineItems.find((edge: any) => {
        const metafields = edge.node.variant?.metafields?.edges || [];
        const feeRuleIdMetafield = metafields.find((m: any) => m.node.key === "fee_rule_id");
        return feeRuleIdMetafield?.node?.value === feeRule.id;
      });

      if (existingLineItem) {
        // Update existing line item
        cartLinesToUpdate.push({
          id: existingLineItem.node.id,
          quantity: 1,
          variantId,
        });
      } else {
        // Add new line item
        cartLinesToAdd.push({
          variantId,
          quantity: 1,
        });
      }
    }

    // Update cart with new/updated fees
    // Note: This uses Cart API which requires Storefront API
    // For now, return the fees to be applied by the theme extension

    return {
      success: true,
      fees: applicableFees.map(({ feeRule, amount }) => ({
        id: feeRule.id,
        title: feeRule.title,
        amount,
        variantId: feeProduct.variantId, // Will be set properly when variant is created
      })),
      linesToAdd: cartLinesToAdd,
      linesToUpdate: cartLinesToUpdate,
      linesToRemove: feesToRemove.map((edge: any) => edge.node.id),
    };
  } catch (error: any) {
    console.error("Error updating cart fees:", error);
    return new Response(error.message || "Internal server error", { status: 500 });
  }
};

