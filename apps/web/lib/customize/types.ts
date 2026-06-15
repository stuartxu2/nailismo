// Shared types for the "Customize to Order" AI nail-art studio.
// Backed by the Shopify `customize_session` metaobject (one record per session).

export type SessionStatus =
  | "pending_payment" // session created, awaiting the $2 Stripe deposit
  | "generating" // deposit captured, the design (3 views) being generated
  | "ready" // the design landed, awaiting the customer's order
  | "selected" // order confirmed, $2-off code minted
  | "ordered" // $69 order placed (reconciled from orders/paid)
  | "refunded" // deposit refunded (generation failed / no-credit safety net)
  | "failed"; // generation failed before any usable design

export type DesignJobStatus = "pending" | "ready" | "failed";

export type DesignJob = {
  /** Fixed per-slot seed (101 / 202 / 303) so reruns stay deterministic. */
  seed: number;
  status: DesignJobStatus;
  /** Public Blob URL of the finished mockup, once ready. */
  resultUrl?: string;
};

export type CustomizeSession = {
  /** Stable id; also the metaobject handle (lowercase, hyphen-safe). */
  sessionId: string;
  email?: string;
  status: SessionStatus;
  /** Blob URL of the customer's uploaded reference image. */
  uploadUrl?: string;
  /** Server-derived palette/motif/mood descriptor ({REF}). */
  referenceDescriptor?: string;
  shape?: string;
  note?: string;
  /** Optional style axes (lowercase keys); unset/neutral → today's defaults. */
  finish?: string;
  feel?: string;
  occasion?: string;
  detail?: string;
  interpretation?: string;
  paymentIntentId?: string;
  jobs?: DesignJob[];
  selectedIndex?: number;
  discountCode?: string;
  /** Soft link to Shopify, stamped from the orders/paid webhook. */
  shopifyOrderId?: string;
  shopifyCustomerId?: string;
};
