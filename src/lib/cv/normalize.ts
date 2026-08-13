/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CV } from "./opencv";
import { ID_CARD, PAPER_SIZES, type Corner, type PaperKind } from "./quality";

type Mat = any;

/** Kanvas ternormalisasi tetap: A4 @ 300 DPI. Semua sampel keluar dengan dimensi ini. */
export const CANVAS_WIDTH = 2480;
export const CANVAS_HEIGHT = 3508;
export const TARGET_DPI = 300;
export const MM_PER_INCH = 25.4;

export type CalibrationMetadata = {
  /** Rasio piksel per milimeter pada kanvas ternormalisasi. */
  pxPerMm: number;
  /** Metode kalibrasi yang dipakai. */
  method: "paper" | "id-card";
  paper?: PaperKind;
  paperWidthMm?: number;
  paperHeightMm?: number;
  canvasWidth: number;
  canvasHeight: number;
  dpi: number;
  /** Jarak antar garis kertas bergaris (mm) hasil Hough — validasi silang, null bila polos. */
  ruledLineSpacingMm: number | null;
  /** Metrik kualitas pada saat capture. */
  quality: {
    blurVar: number;
    brightness: number;
    skewDeg: number;
    areaRatio: number;
  };
  correctedSkewDeg: 0;
  createdAt: string;
};

export type NormalizedResult = {
  canvas: HTMLCanvasElement;
  metadata: CalibrationMetadata;
};

export function canvasFromSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  maxWidth?: number,
): HTMLCanvasElement {
  const sw =
    (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).naturalWidth ||
    (source as HTMLCanvasElement).width;
  const sh =
    (source as HTMLVideoElement).videoHeight ||
    (source as HTMLImageElement).naturalHeight ||
    (source as HTMLCanvasElement).height;
  const scale = maxWidth ? Math.min(1, maxWidth / sw) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Perspective transform: kertas → persegi panjang tegak lurus pada 300 DPI. */
function warpQuad(
  cv: CV,
  src: Mat,
  quad: Corner[],
  widthMm: number,
  heightMm: number,
): Mat {
  const w = Math.round((widthMm / MM_PER_INCH) * TARGET_DPI);
  const h = Math.round((heightMm / MM_PER_INCH) * TARGET_DPI);
  const srcTri = cv.matFromArray(
    4,
    1,
    cv.CV_32FC2,
    quad.flatMap((p) => [p.x, p.y]),
  );
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  const dst = new cv.Mat();
  cv.warpPerspective(
    src,
    dst,
    M,
    new cv.Size(w, h),
    cv.INTER_CUBIC,
    cv.BORDER_REPLICATE,
    new cv.Scalar(),
  );
  srcTri.delete();
  dstTri.delete();
  M.delete();
  return dst;
}

/**
 * Pipeline fotometrik: grayscale → CLAHE → shadow removal (morfologi + divide)
 * → noise removal → adaptive threshold → normalisasi kontras.
 * Background dipaksa putih merata; goresan tetap menyimpan gradasi tekanan.
 */
function photometric(cv: CV, src: Mat): Mat {
  const gray = new cv.Mat();
  const bg = new cv.Mat();
  const shadowFree = new cv.Mat();
  const denoised = new cv.Mat();
  const binary = new cv.Mat();
  const out = new cv.Mat();
  const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
  const bigKernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(41, 41));

  try {
    // 1. Grayscale
    if (src.channels() > 1) cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    else src.copyTo(gray);

    // 2. CLAHE (perataan kontras lokal)
    clahe.apply(gray, gray);

    // 3. Shadow removal: estimasi background lewat closing lalu bagi
    cv.morphologyEx(gray, bg, cv.MORPH_CLOSE, bigKernel);
    cv.medianBlur(bg, bg, 21);
    cv.divide(gray, bg, shadowFree, 255);

    // 4. Noise removal
    cv.medianBlur(shadowFree, denoised, 3);

    // 5. Adaptive threshold → masker background
    cv.adaptiveThreshold(
      denoised,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      31,
      10,
    );

    // Background = putih murni, goresan = nilai grayscale ternormalisasi
    cv.max(denoised, binary, out);

    // 6. Contrast normalization
    cv.normalize(out, out, 0, 255, cv.NORM_MINMAX);
    return out.clone();
  } finally {
    [gray, bg, shadowFree, denoised, binary, out, bigKernel].forEach((m) =>
      m.delete(),
    );
    clahe.delete();
  }
}

/** Validasi silang skala memakai jarak antar garis pada kertas bergaris (Hough). */
function ruledLineSpacingMm(cv: CV, gray: Mat, pxPerMm: number): number | null {
  const edges = new cv.Mat();
  const lines = new cv.Mat();
  try {
    cv.Canny(gray, edges, 50, 150);
    cv.HoughLines(edges, lines, 1, Math.PI / 180, Math.round(gray.cols * 0.35));
    const ys: number[] = [];
    for (let i = 0; i < lines.rows; i++) {
      const rho = lines.floatAt(i, 0);
      const theta = lines.floatAt(i, 1);
      const deg = (theta * 180) / Math.PI;
      if (Math.abs(deg - 90) <= 3) ys.push(Math.abs(rho));
    }
    if (ys.length < 4) return null;
    ys.sort((a, b) => a - b);
    const gaps = ys.slice(1).map((y, i) => y - ys[i]).filter((g) => g > 8);
    if (gaps.length < 3) return null;
    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    return +(median / pxPerMm).toFixed(2);
  } catch {
    return null;
  } finally {
    edges.delete();
    lines.delete();
  }
}

function fitToFixedCanvas(cv: CV, processed: Mat): {
  canvas: HTMLCanvasElement;
  scale: number;
} {
  const scale = Math.min(
    CANVAS_WIDTH / processed.cols,
    CANVAS_HEIGHT / processed.rows,
  );
  const w = Math.round(processed.cols * scale);
  const h = Math.round(processed.rows * scale);

  const tmp = document.createElement("canvas");
  tmp.width = processed.cols;
  tmp.height = processed.rows;
  cv.imshow(tmp, processed);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tmp, (CANVAS_WIDTH - w) / 2, (CANVAS_HEIGHT - h) / 2, w, h);
  return { canvas, scale };
}

export type QualityInput = {
  blurVar: number;
  brightness: number;
  skewDeg: number;
  areaRatio: number;
};

/** Pipeline penuh untuk capture berbasis kertas (metode kalibrasi utama). */
export function normalizeFromPaper(
  cv: CV,
  src: Mat,
  quad: Corner[],
  paper: PaperKind,
  quality: QualityInput,
): NormalizedResult {
  const { widthMm, heightMm } = PAPER_SIZES[paper];
  const warped = warpQuad(cv, src, quad, widthMm, heightMm);
  const processed = photometric(cv, warped);
  const { canvas, scale } = fitToFixedCanvas(cv, processed);
  const pxPerMm = +((TARGET_DPI / MM_PER_INCH) * scale).toFixed(4);
  const spacing = ruledLineSpacingMm(cv, processed, TARGET_DPI / MM_PER_INCH);

  warped.delete();
  processed.delete();

  return {
    canvas,
    metadata: {
      pxPerMm,
      method: "paper",
      paper,
      paperWidthMm: widthMm,
      paperHeightMm: heightMm,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      dpi: TARGET_DPI,
      ruledLineSpacingMm: spacing,
      quality,
      correctedSkewDeg: 0,
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Mode cadangan: kertas tidak sepenuhnya terlihat, kalibrasi memakai kartu
 * referensi ID-1 (85.6 × 53.98 mm) yang ikut difoto.
 */
export function normalizeFromCard(
  cv: CV,
  src: Mat,
  cardQuad: Corner[],
  quality: QualityInput,
): NormalizedResult {
  const [tl, tr, br, bl] = cardQuad;
  const edgeA = (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2;
  const edgeB = (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2;
  const longPx = Math.max(edgeA, edgeB);
  const srcPxPerMm = longPx / ID_CARD.widthMm;

  // Skalakan gambar agar resolusi efektif = 300 DPI
  const target = TARGET_DPI / MM_PER_INCH;
  const factor = target / srcPxPerMm;
  const resized = new cv.Mat();
  cv.resize(
    src,
    resized,
    new cv.Size(
      Math.max(1, Math.round(src.cols * factor)),
      Math.max(1, Math.round(src.rows * factor)),
    ),
    0,
    0,
    cv.INTER_AREA,
  );
  const processed = photometric(cv, resized);
  const { canvas, scale } = fitToFixedCanvas(cv, processed);
  const pxPerMm = +(target * scale).toFixed(4);

  resized.delete();
  processed.delete();

  return {
    canvas,
    metadata: {
      pxPerMm,
      method: "id-card",
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      dpi: TARGET_DPI,
      ruledLineSpacingMm: null,
      quality,
      correctedSkewDeg: 0,
      createdAt: new Date().toISOString(),
    },
  };
}

export function canvasToJpeg(canvas: HTMLCanvasElement, maxWidth: number, q = 0.9) {
  const scale = Math.min(1, maxWidth / canvas.width);
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", q);
}
