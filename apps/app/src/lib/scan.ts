// Client for the nail-size scanner. Downscales a captured/uploaded photo, sends
// it to the /api/scan vision endpoint, and returns the card + per-nail width
// segments in normalized [0,1] image coordinates. The screen maps those onto the
// displayed (downscaled) photo, so we hand the SAME processed image back for
// display — guaranteeing detection coordinates line up with what the user sees.
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { type FingerKey } from "@nailismo/fit-sizing";
import { scanEnv } from "@/lib/env";

export type Point = [number, number];
export type Seg = { a: Point; b: Point };
export type NailDetection = { finger: FingerKey; a: Point; b: Point; confidence: number };

export type Detection =
  | { found: false }
  | { found: true; card: Seg; nails: NailDetection[] };

/** A processed (downscaled, orientation-baked) image ready to display + measure. */
export type ProcessedImage = { uri: string; w: number; h: number; base64: string };

const MAX_EDGE = 1280;

/**
 * Downscale to at most MAX_EDGE on the longest side and export JPEG base64.
 * Resizing by the longest edge avoids distortion and never upscales. The
 * exported image bakes EXIF orientation, so its pixels match the coordinates the
 * model returns.
 */
export async function processImage(
  uri: string,
  w: number,
  h: number,
): Promise<ProcessedImage> {
  const longest = Math.max(w, h);
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1;
  const resize =
    w >= h
      ? { width: Math.round(w * scale) }
      : { height: Math.round(h * scale) };

  const ref = await ImageManipulator.manipulate(uri).resize(resize).renderAsync();
  const out = await ref.saveAsync({
    format: SaveFormat.JPEG,
    base64: true,
    compress: 0.7,
  });
  return { uri: out.uri, w: out.width, h: out.height, base64: out.base64 ?? "" };
}

/** POST the processed image to the detection endpoint. Throws on network/HTTP error. */
export async function detectHand(img: ProcessedImage): Promise<Detection> {
  const res = await fetch(`${scanEnv.apiBase}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: `data:image/jpeg;base64,${img.base64}` }),
  });
  if (!res.ok) throw new Error(`scan failed: ${res.status}`);
  const data = (await res.json()) as Detection;
  return data;
}

/** Convenience: process then detect in one call. */
export async function scanHand(
  uri: string,
  w: number,
  h: number,
): Promise<{ image: ProcessedImage; detection: Detection }> {
  const image = await processImage(uri, w, h);
  const detection = await detectHand(image);
  return { image, detection };
}

/** Map a normalized [0,1] point onto a display box of the given px size. */
export function toDisplay(pt: Point, boxW: number, boxH: number): { x: number; y: number } {
  return { x: pt[0] * boxW, y: pt[1] * boxH };
}

/** Pixel length of a segment once mapped onto the display box. */
export function segPx(seg: Seg, boxW: number, boxH: number): number {
  const a = toDisplay(seg.a, boxW, boxH);
  const b = toDisplay(seg.b, boxW, boxH);
  return Math.hypot(b.x - a.x, b.y - a.y);
}
