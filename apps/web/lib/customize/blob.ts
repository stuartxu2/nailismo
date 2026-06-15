// Vercel Blob storage for the Customize-to-Order flow.
//
// Uploads (the customer's reference) get a random-suffixed, effectively
// unguessable path; results (the finished mockups) get stable, shareable URLs.
// Reads BLOB_READ_WRITE_TOKEN from the environment automatically. Server-only.

import { put } from "@vercel/blob";

/** Exactly the body type `put` accepts, to stay in lockstep with the SDK. */
type BlobBody = Parameters<typeof put>[1];

/** Store the customer's uploaded reference image; returns its Blob URL. */
export async function putUpload(
  sessionId: string,
  data: BlobBody,
  contentType: string,
): Promise<string> {
  const { url } = await put(`customize/uploads/${sessionId}`, data, {
    access: "public",
    addRandomSuffix: true, // unguessable path for the raw upload
    contentType,
  });
  return url;
}

/** Store one finished design mockup at a stable, shareable URL. */
export async function putResult(
  sessionId: string,
  index: number,
  data: BlobBody,
): Promise<string> {
  const { url } = await put(`customize/results/${sessionId}-${index}.png`, data, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "image/png",
  });
  return url;
}
