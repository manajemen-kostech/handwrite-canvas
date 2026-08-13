/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CV } from "./opencv";

type Mat = any;

export type PaperKind = "a4" | "f4";

export const PAPER_SIZES: Record<
  PaperKind,
  { widthMm: number; heightMm: number; label: string }
> = {
  a4: { widthMm: 210, heightMm: 297, label: "A4 — 210 × 297 mm" },
  f4: { widthMm: 215, heightMm: 330, label: "F4 / Folio — 215 × 330 mm" },
};

/** Kartu identitas standar ISO/IEC 7810 ID-1 — dipakai sebagai referensi cadangan. */
export const ID_CARD = { widthMm: 85.6, heightMm: 53.98, ratio: 85.6 / 53.98 };

/** Ambang batas validasi kualitas frame. */
export const THRESHOLDS = {
  areaMin: 0.4, // kertas minimal 40% area frame agar tidak "terlalu jauh"
  areaIdealMin: 0.5,
  areaIdealMax: 0.95,
  areaMax: 0.995, // di atas ini kertas dianggap terpotong
  skewMaxDeg: 12,
  blurMin: 35, // variance of Laplacian
  brightnessMin: 70,
  brightnessMax: 215,
  stableFrames: 5,
};

export type Corner = { x: number; y: number };

export type FrameMetrics = {
  quad: Corner[] | null;
  areaRatio: number;
  skewDeg: number;
  blurVar: number;
  brightness: number;
  cornersInside: boolean;
};

export type Validation = {
  ok: boolean;
  message: string;
  checks: {
    paper: boolean;
    area: boolean;
    skew: boolean;
    blur: boolean;
    brightness: boolean;
    corners: boolean;
  };
};

/** Urutkan 4 titik menjadi: kiri-atas, kanan-atas, kanan-bawah, kiri-bawah. */
export function orderCorners(pts: Corner[]): Corner[] {
  const bySum = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const tl = bySum[0];
  const br = bySum[3];
  const rest = pts.filter((p) => p !== tl && p !== br);
  const [tr, bl] = rest[0].x > rest[1].x ? [rest[0], rest[1]] : [rest[1], rest[0]];
  return [tl, tr, br, bl];
}

function polygonArea(pts: Corner[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** Sudut kemiringan maksimum dari sisi atas (terhadap horizontal) dan sisi kiri (terhadap vertikal). */
export function skewOf(quad: Corner[]): number {
  const [tl, tr, br, bl] = quad;
  const top = (Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180) / Math.PI;
  const bottom = (Math.atan2(br.y - bl.y, br.x - bl.x) * 180) / Math.PI;
  const left = (Math.atan2(bl.x - tl.x, bl.y - tl.y) * 180) / Math.PI;
  const right = (Math.atan2(br.x - tr.x, br.y - tr.y) * 180) / Math.PI;
  return Math.max(...[top, bottom, -left, -right].map((v) => Math.abs(v)));
}

/**
 * Deteksi kuadrilateral terbesar (kertas) pada sebuah Mat RGBA + hitung metrik kualitas.
 * `minAreaRatio` menyaring kontur kecil, `aspectRatio` (opsional) memfilter bentuk
 * tertentu — dipakai untuk mode kartu referensi.
 */
export function analyzeFrame(
  cv: CV,
  src: Mat,
  opts: { minAreaRatio?: number; aspectRatio?: number; aspectTol?: number } = {},
): FrameMetrics {
  const { minAreaRatio = 0.08, aspectRatio, aspectTol = 0.18 } = opts;
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const lap = new cv.Mat();
  const mean = new cv.Mat();
  const stddev = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Brightness: rata-rata intensitas grayscale
    const brightness = cv.mean(gray)[0];

    // Blur: variance of Laplacian
    cv.Laplacian(gray, lap, cv.CV_64F);
    cv.meanStdDev(lap, mean, stddev);
    const sd = stddev.doubleAt(0, 0);
    const blurVar = sd * sd;

    // Deteksi tepi kertas
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 50, 150);
    cv.dilate(edges, edges, kernel, new cv.Point(-1, -1), 2);
    cv.findContours(
      edges,
      contours,
      hierarchy,
      cv.RETR_LIST,
      cv.CHAIN_APPROX_SIMPLE,
    );

    const frameArea = src.cols * src.rows;
    let best: Corner[] | null = null;
    let bestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const approx = new cv.Mat();
      try {
        const peri = cv.arcLength(c, true);
        cv.approxPolyDP(c, approx, 0.02 * peri, true);
        if (approx.rows === 4 && cv.isContourConvex(approx)) {
          const pts: Corner[] = [];
          for (let j = 0; j < 4; j++) {
            pts.push({ x: approx.intAt(j, 0), y: approx.intAt(j, 1) });
          }
          const ordered = orderCorners(pts);
          const area = polygonArea(ordered);
          if (area / frameArea < minAreaRatio || area <= bestArea) continue;

          if (aspectRatio) {
            const w =
              (Math.hypot(ordered[1].x - ordered[0].x, ordered[1].y - ordered[0].y) +
                Math.hypot(ordered[2].x - ordered[3].x, ordered[2].y - ordered[3].y)) /
              2;
            const h =
              (Math.hypot(ordered[3].x - ordered[0].x, ordered[3].y - ordered[0].y) +
                Math.hypot(ordered[2].x - ordered[1].x, ordered[2].y - ordered[1].y)) /
              2;
            const r = Math.max(w, h) / Math.max(1, Math.min(w, h));
            if (Math.abs(r - aspectRatio) / aspectRatio > aspectTol) continue;
          }

          bestArea = area;
          best = ordered;
        }
      } finally {
        approx.delete();
        c.delete();
      }
    }

    const margin = 2;
    const cornersInside =
      !!best &&
      best.every(
        (p) =>
          p.x > margin &&
          p.y > margin &&
          p.x < src.cols - margin &&
          p.y < src.rows - margin,
      );

    return {
      quad: best,
      areaRatio: bestArea / frameArea,
      skewDeg: best ? skewOf(best) : 0,
      blurVar,
      brightness,
      cornersInside,
    };
  } finally {
    [gray, blurred, edges, lap, mean, stddev, hierarchy, kernel].forEach((m) =>
      m.delete(),
    );
    contours.delete();
  }
}

/** Terjemahkan metrik menjadi keputusan + instruksi berbahasa Indonesia. */
export function validateFrame(m: FrameMetrics): Validation {
  const checks = {
    paper: !!m.quad,
    area: m.areaRatio >= THRESHOLDS.areaMin && m.areaRatio <= THRESHOLDS.areaMax,
    skew: m.skewDeg <= THRESHOLDS.skewMaxDeg,
    blur: m.blurVar >= THRESHOLDS.blurMin,
    brightness:
      m.brightness >= THRESHOLDS.brightnessMin &&
      m.brightness <= THRESHOLDS.brightnessMax,
    corners: m.cornersInside,
  };

  let message = "Posisi sudah pas — menahan fokus…";
  if (!checks.paper) message = "Arahkan kamera ke kertas";
  else if (!checks.corners) message = "Pastikan 4 sudut kertas terlihat";
  else if (m.areaRatio < THRESHOLDS.areaMin) message = "Dekatkan kamera";
  else if (m.areaRatio > THRESHOLDS.areaMax) message = "Kamera terlalu dekat";
  else if (!checks.skew) message = "Luruskan kertas";
  else if (!checks.blur) message = "Tahan kamera — gambar buram";
  else if (m.brightness < THRESHOLDS.brightnessMin)
    message = "Cari tempat lebih terang";
  else if (m.brightness > THRESHOLDS.brightnessMax)
    message = "Kurangi pantulan cahaya";
  else if (
    m.areaRatio < THRESHOLDS.areaIdealMin ||
    m.areaRatio > THRESHOLDS.areaIdealMax
  )
    message = "Sesuaikan sedikit agar kertas mengisi lebih banyak frame";

  return { ok: Object.values(checks).every(Boolean), message, checks };
}
