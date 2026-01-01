import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function FFMFSLanding() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Flexible Fees Manager for Shopify</h1>
        <p className={styles.text}>
          Add custom fees, surcharges, and discounts to your store based on cart conditions, customer details, and product attributes.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Install App
            </button>
          </Form>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Conditional Fees</strong>. Apply fees based on cart subtotal, 
            quantity, weight, customer location, and more.
          </li>
          <li>
            <strong>Multiple Calculation Types</strong>. Choose between fixed amount, 
            percentage, or per-quantity calculations.
          </li>
          <li>
            <strong>Advanced Logic</strong>. Create complex rules with AND/OR 
            condition groups for precise fee targeting.
          </li>
        </ul>
      </div>
    </div>
  );
}
