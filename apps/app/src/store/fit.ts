// Fit state for the camera measure flow. Holds the calibrated card width (px in
// the captured photo) and per-finger nail widths (mm), persisted to AsyncStorage
// so a user's size is remembered. Size is derived from the shared sizing math.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  sizeFromMeasurements,
  pxPerMm,
  type FingerKey,
  type SetSize,
  type SavedFit,
} from "@nailismo/fit-sizing";

const FIT_KEY = "nailismo_fit_v1";

type FitState = {
  cardPxWidth: number | null;
  fingerMm: Partial<Record<FingerKey, number>>;
  /** px→mm factor for the current photo, or null until calibrated. */
  factor: () => number | null;
  size: () => SetSize | null;
  hydrate: () => Promise<void>;
  setCardPxWidth: (px: number) => void;
  setFingerMm: (finger: FingerKey, mm: number) => void;
  reset: () => void;
};

async function persist(state: SavedFit) {
  try {
    await AsyncStorage.setItem(FIT_KEY, JSON.stringify(state));
  } catch {
    // best-effort; fitting still works in-memory
  }
}

export const useFit = create<FitState>((set, get) => ({
  cardPxWidth: null,
  fingerMm: {},

  factor: () => {
    const px = get().cardPxWidth;
    return px && px > 0 ? pxPerMm(px) : null;
  },
  size: () => sizeFromMeasurements(get().fingerMm),

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(FIT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedFit;
      if (parsed.version !== 1) return;
      set({ cardPxWidth: parsed.cardPxWidth, fingerMm: parsed.fingerMm });
    } catch {
      // ignore corrupt state
    }
  },

  setCardPxWidth: (px) => {
    set({ cardPxWidth: px });
    void persist({ version: 1, cardPxWidth: px, fingerMm: get().fingerMm });
  },

  setFingerMm: (finger, mm) => {
    const fingerMm = { ...get().fingerMm, [finger]: mm };
    set({ fingerMm });
    void persist({ version: 1, cardPxWidth: get().cardPxWidth, fingerMm });
  },

  reset: () => {
    set({ cardPxWidth: null, fingerMm: {} });
    void AsyncStorage.removeItem(FIT_KEY);
  },
}));
