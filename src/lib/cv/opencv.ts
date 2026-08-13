import type * as CVType from "@techstark/opencv-js";

export type CV = typeof CVType;

let loader: Promise<CV> | null = null;

/**
 * Memuat OpenCV.js (WASM) secara lazy — hanya saat modul capture dipakai.
 * Build @techstark/opencv-js mengekspor Promise yang resolve ke instance `cv`.
 */
export function loadOpenCv(): Promise<CV> {
  if (!loader) {
    loader = import("@techstark/opencv-js").then(async (mod) => {
      const candidate = ((mod as unknown as { default?: unknown }).default ??
        mod) as unknown;
      const resolved = (
        candidate &&
        typeof (candidate as PromiseLike<unknown>).then === "function"
          ? await (candidate as PromiseLike<unknown>)
          : candidate
      ) as CV & { onRuntimeInitialized?: () => void };

      if (typeof (resolved as unknown as { Mat?: unknown }).Mat === "function") {
        return resolved;
      }
      return new Promise<CV>((resolve) => {
        resolved.onRuntimeInitialized = () => resolve(resolved);
      });
    });
  }
  return loader;
}
