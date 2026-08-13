/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadOpenCv } from "./opencv";
import {
  ID_CARD,
  analyzeFrame,
  validateFrame,
  type PaperKind,
  type Validation,
} from "./quality";
import {
  canvasFromSource,
  normalizeFromCard,
  normalizeFromPaper,
  type NormalizedResult,
} from "./normalize";

export type ProcessOutcome = {
  ok: boolean;
  result?: NormalizedResult;
  reason?: string;
  validation?: Validation;
};

/**
 * Re-validasi + normalisasi penuh untuk gambar diam (hasil upload atau capture manual).
 * Tetap menolak foto blur, gelap, miring, atau kertas tidak lengkap.
 */
export async function processStillImage(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  paper: PaperKind,
  mode: "paper" | "id-card" = "paper",
): Promise<ProcessOutcome> {
  const cv = await loadOpenCv();
  const work = canvasFromSource(source, 1600);
  const src = cv.imread(work);
  try {
    const metrics =
      mode === "paper"
        ? analyzeFrame(cv, src, { minAreaRatio: 0.08 })
        : analyzeFrame(cv, src, {
            minAreaRatio: 0.01,
            aspectRatio: ID_CARD.ratio,
            aspectTol: 0.2,
          });

    const quality = {
      blurVar: +metrics.blurVar.toFixed(1),
      brightness: +metrics.brightness.toFixed(1),
      skewDeg: +metrics.skewDeg.toFixed(2),
      areaRatio: +metrics.areaRatio.toFixed(3),
    };

    if (mode === "paper") {
      const validation = validateFrame(metrics);
      // Untuk gambar diam, kemiringan berlebih tetap bisa dikoreksi oleh warp,
      // jadi yang wajib: kertas terdeteksi, 4 sudut lengkap, tidak blur, pencahayaan wajar.
      const blocking =
        !validation.checks.paper ||
        !validation.checks.corners ||
        !validation.checks.blur ||
        !validation.checks.brightness ||
        metrics.areaRatio < 0.2;
      if (blocking || !metrics.quad) {
        return {
          ok: false,
          reason: !validation.checks.paper
            ? "Kertas tidak terdeteksi pada foto. Pastikan seluruh lembar terlihat dengan latar kontras."
            : !validation.checks.corners
              ? "Ada sudut kertas yang terpotong. Ulangi foto dengan keempat sudut terlihat."
              : !validation.checks.blur
                ? `Foto terlalu buram (ketajaman ${quality.blurVar}). Ulangi dengan kamera stabil.`
                : !validation.checks.brightness
                  ? quality.brightness < 100
                    ? "Foto terlalu gelap. Cari tempat lebih terang."
                    : "Foto terlalu terang / memantul. Kurangi pantulan cahaya."
                  : "Kertas terlalu kecil di frame. Dekatkan kamera.",
          validation,
        };
      }
      return {
        ok: true,
        result: normalizeFromPaper(cv, src, metrics.quad, paper, quality),
      };
    }

    if (!metrics.quad) {
      return {
        ok: false,
        reason:
          "Kartu referensi tidak terdeteksi. Letakkan kartu berukuran standar (85,6 × 54 mm) di dalam frame.",
      };
    }
    return { ok: true, result: normalizeFromCard(cv, src, metrics.quad, quality) };
  } finally {
    src.delete();
  }
}

export async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gagal membaca gambar."));
      img.src = url;
    });
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
