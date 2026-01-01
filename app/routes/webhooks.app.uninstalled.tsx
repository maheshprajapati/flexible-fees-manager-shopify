import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  if (session) {
    // Delete all fee rules for this shop
    const feeRules = await prisma.feeRule.findMany({
      where: { shopId: shop },
      select: { feeProductId: true },
    });

    // Note: Fee products will be automatically cleaned up by Shopify
    // when the app is uninstalled, so we don't need to delete them here
    // The admin API may not be available during uninstall webhook

    // Delete all fee rules and related data
    await prisma.feeRule.deleteMany({ where: { shopId: shop } });
    await prisma.subscription.deleteMany({ where: { shopId: shop } });

    // Delete session
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response();
};
