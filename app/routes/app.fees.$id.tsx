import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useActionData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import FFMFSFeeEditor from "../components/FeeEditor";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopId = session.shop;
  const feeRuleId = params.id;

  const feeRule = await prisma.feeRule.findFirst({
    where: { id: feeRuleId, shopId },
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
  });

  if (!feeRule) {
    throw new Response("Fee rule not found", { status: 404 });
  }

  // Convert Decimal to number for proper serialization
  const serializedFeeRule = {
    ...feeRule,
    amount: Number(feeRule.amount),
  };

  // Fetch products from Shopify
  const productsResponse = await admin.graphql(`
    query {
      products(first: 100) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `);
  const productsData = await productsResponse.json();
  const products = productsData.data?.products?.edges?.map((edge: any) => ({
    value: edge.node.id,
    label: edge.node.title,
  })) || [];

  // Fetch collections from Shopify
  const collectionsResponse = await admin.graphql(`
    query {
      collections(first: 100) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `);
  const collectionsData = await collectionsResponse.json();
  const collections = collectionsData.data?.collections?.edges?.map((edge: any) => ({
    value: edge.node.id,
    label: edge.node.title,
  })) || [];

  return { feeRule: serializedFeeRule, products, collections };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop;
  const feeRuleId = params.id;
  const formData = await request.formData();

  const intent = formData.get("intent") as string;

  if (intent === "delete") {
    await prisma.feeRule.delete({
      where: { id: feeRuleId, shopId },
    });
    return redirect("/app/fees");
  }

  const title = formData.get("title") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const calculationType = formData.get("calculationType") as string;
  const sign = formData.get("sign") as string;
  const taxClass = formData.get("taxClass") as string;
  const status = formData.get("status") as string;
  const priority = parseInt(formData.get("priority") as string) || 0;
  const parentAndOr = formData.get("parentAndOr") as string || "and";

  // Parse condition groups
  const conditionGroupsData = JSON.parse(formData.get("conditionGroups") as string || "[]");

  // Validation
  if (!title || isNaN(amount) || !calculationType) {
    return { error: "Title, amount, and calculation type are required" };
  }

  try {
    // Delete existing condition groups and conditions
    await prisma.conditionGroup.deleteMany({
      where: { feeRuleId },
    });

    // Update fee rule
    const feeRule = await prisma.feeRule.update({
      where: { id: feeRuleId, shopId },
      data: {
        title,
        amount,
        calculationType,
        sign: sign || "+",
        taxClass: taxClass || null,
        status: status || "draft",
        priority,
        parentAndOr,
        conditionGroups: {
          create: conditionGroupsData.map((group: any, index: number) => ({
            andOr: group.andOr || "and",
            order: index,
            conditions: {
              create: (group.conditions || []).map((condition: any) => ({
                type: condition.type,
                operator: condition.operator,
                value: condition.value 
                  ? (typeof condition.value === "string" ? condition.value : JSON.stringify(condition.value))
                  : null,
              })),
            },
          })),
        },
      },
      include: {
        conditionGroups: {
          include: {
            conditions: true,
          },
        },
      },
    });

    return { success: true, feeRule };
  } catch (error: any) {
    return { error: error.message || "Failed to update fee rule" };
  }
};

export default function FFMFSEditFeeRule() {
  const { feeRule, products, collections } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  return (
    <FFMFSFeeEditor
      feeRule={feeRule}
      error={actionData?.error}
      isSubmitting={navigation.state === "submitting"}
      products={products}
      collections={collections}
    />
  );
}

export const headers = (headersArgs: any) => {
  return boundary.headers(headersArgs);
};
