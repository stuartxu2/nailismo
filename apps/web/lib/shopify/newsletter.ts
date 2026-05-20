"use server";

import { randomBytes } from "node:crypto";
import { storefrontFetch, ShopifyConfigError } from "./client";
import { CUSTOMER_CREATE_MUTATION } from "./queries";

type CustomerCreateResult = {
  customerCreate: {
    customer: { id: string; email: string } | null;
    customerUserErrors: { field: string[] | null; message: string; code: string | null }[];
  };
};

export type NewsletterResult = {
  ok: boolean;
  message: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeNewsletter(formData: FormData): Promise<NewsletterResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const password = randomBytes(16).toString("hex");

  try {
    const data = await storefrontFetch<CustomerCreateResult>(
      CUSTOMER_CREATE_MUTATION,
      { input: { email, password, acceptsMarketing: true } },
      { revalidate: 0 },
    );

    const errors = data.customerCreate.customerUserErrors;
    if (errors.length > 0) {
      const taken = errors.find((e) => e.code === "TAKEN" || e.code === "CUSTOMER_DISABLED");
      if (taken) {
        return { ok: true, message: "You're already on the list. Guide on the way." };
      }
      console.error("[newsletter] errors:", errors);
      return { ok: false, message: errors[0].message };
    }

    return { ok: true, message: "Sent. Check your inbox for the guide." };
  } catch (err) {
    if (err instanceof ShopifyConfigError) {
      console.warn("[newsletter] shopify config missing — accepting silently");
      return { ok: true, message: "Sent. Check your inbox for the guide." };
    }
    console.error("[newsletter] subscribe failed:", err);
    return { ok: false, message: "Something broke on our end. Try again in a minute." };
  }
}
