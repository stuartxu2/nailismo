// Shared types for the "Customize to Order" AI nail-art studio.
// Backed by the Shopify `customize_session` metaobject (one record per session).

export type SessionStatus =
  | "pending_payment" // session created, awaiting the $2 Stripe deposit
  | "generating" // deposit captured, 3 designs being generated
  | "ready" // all designs landed, awaiting the customer's pick
  | "selected" // a design chosen, $2-off code minted
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
  paymentIntentId?: string;
  jobs?: DesignJob[];
  selectedIndex?: number;
  discountCode?: string;
};
