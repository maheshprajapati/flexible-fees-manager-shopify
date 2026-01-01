/**
 * Fee Product Management
 * 
 * Creates and manages hidden products/variants that represent fees
 * These products are added to the cart to apply fees
 */

import type { AdminApiContext } from "@shopify/shopify-app-react-router/server";

const FEE_PRODUCT_TITLE_PREFIX = "[Fee]";
const FEE_PRODUCT_TAG = "flexible-fees-manager";

interface FeeProduct {
  productId: string;
  variantId: string;
}

/**
 * Get or create the fee product for a shop
 */
export async function getOrCreateFeeProduct(
  admin: AdminApiContext,
  shopId: string
): Promise<FeeProduct> {
  // Try to find existing fee product
  const searchResponse = await admin.graphql(
    `#graphql
      query getFeeProduct($query: String!) {
        products(first: 1, query: $query) {
          edges {
            node {
              id
              variants(first: 1) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        query: `tag:${FEE_PRODUCT_TAG}`,
      },
    }
  );

  const searchData = await searchResponse.json();
  const existingProduct = searchData.data?.products?.edges?.[0]?.node;

  if (existingProduct) {
    return {
      productId: existingProduct.id,
      variantId: existingProduct.variants.edges[0]?.node?.id || "",
    };
  }

  // Create new fee product
  const createResponse = await admin.graphql(
    `#graphql
      mutation createFeeProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            variants(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${FEE_PRODUCT_TITLE_PREFIX} Flexible Fees`,
          description: "Hidden product for fee management. Do not edit or delete.",
          status: "ACTIVE",
          tags: [FEE_PRODUCT_TAG],
          variants: [
            {
              price: "0.00",
              inventoryPolicy: "CONTINUE",
              inventoryManagement: "NOT_MANAGED",
            },
          ],
        },
      },
    }
  );

  const createData = await createResponse.json();

  if (createData.data?.productCreate?.userErrors?.length > 0) {
    throw new Error(
      `Failed to create fee product: ${createData.data.productCreate.userErrors[0].message}`
    );
  }

  const product = createData.data?.productCreate?.product;
  if (!product) {
    throw new Error("Failed to create fee product");
  }

  return {
    productId: product.id,
    variantId: product.variants.edges[0]?.node?.id || "",
  };
}

/**
 * Create or update a fee variant for a specific fee rule
 */
export async function getOrCreateFeeVariant(
  admin: AdminApiContext,
  feeProductId: string,
  feeRuleId: string,
  feeTitle: string,
  feeAmount: number
): Promise<string> {
  // Try to find existing variant with metafield
  const productResponse = await admin.graphql(
    `#graphql
      query getFeeProduct($id: ID!) {
        product(id: $id) {
          id
          variants(first: 250) {
            edges {
              node {
                id
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
      }`,
    {
      variables: {
        id: feeProductId,
      },
    }
  );

  const productData = await productResponse.json();
  const variants = productData.data?.product?.variants?.edges || [];

  // Look for existing variant with matching fee rule ID
  for (const edge of variants) {
    const metafields = edge.node.metafields?.edges || [];
    const feeRuleMetafield = metafields.find(
      (m: any) => m.node.key === "fee_rule_id"
    );
    if (feeRuleMetafield?.node?.value === feeRuleId) {
      // Update existing variant
      await updateFeeVariant(admin, edge.node.id, feeTitle, feeAmount);
      return edge.node.id;
    }
  }

  // Create new variant
  const createResponse = await admin.graphql(
    `#graphql
      mutation createFeeVariant($productId: ID!, $variant: ProductVariantsBulkInput!) {
        productVariantsBulkUpdate(productId: $productId, variants: [$variant]) {
          productVariants {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        productId: feeProductId,
        variant: {
          price: feeAmount.toFixed(2),
          metafields: [
            {
              namespace: "flexible_fees",
              key: "fee_rule_id",
              value: feeRuleId,
              type: "single_line_text_field",
            },
            {
              namespace: "flexible_fees",
              key: "fee_title",
              value: feeTitle,
              type: "single_line_text_field",
            },
          ],
        },
      },
    }
  );

  const createData = await createResponse.json();

  if (createData.data?.productVariantsBulkUpdate?.userErrors?.length > 0) {
    throw new Error(
      `Failed to create fee variant: ${createData.data.productVariantsBulkUpdate.userErrors[0].message}`
    );
  }

  const variant = createData.data?.productVariantsBulkUpdate?.productVariants?.[0];
  if (!variant) {
    throw new Error("Failed to create fee variant");
  }

  return variant.id;
}

/**
 * Update an existing fee variant
 */
async function updateFeeVariant(
  admin: AdminApiContext,
  variantId: string,
  feeTitle: string,
  feeAmount: number
): Promise<void> {
  const response = await admin.graphql(
    `#graphql
      mutation updateFeeVariant($variantId: ID!, $price: MoneyInput!) {
        productVariantUpdate(input: {
          id: $variantId
          price: $price
        }) {
          productVariant {
            id
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        variantId,
        price: {
          amount: feeAmount.toFixed(2),
          currencyCode: "USD", // TODO: Get from shop settings
        },
      },
    }
  );

  const data = await response.json();

  if (data.data?.productVariantUpdate?.userErrors?.length > 0) {
    throw new Error(
      `Failed to update fee variant: ${data.data.productVariantUpdate.userErrors[0].message}`
    );
  }
}

/**
 * Delete fee product (cleanup on app uninstall)
 */
export async function deleteFeeProduct(
  admin: AdminApiContext,
  productId: string
): Promise<void> {
  await admin.graphql(
    `#graphql
      mutation deleteFeeProduct($id: ID!) {
        productDelete(id: $id) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        id: productId,
      },
    }
  );
}

