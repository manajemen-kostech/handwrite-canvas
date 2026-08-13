/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ScanLine, X, CheckCircle2, CircleAlert, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { loadOpenCv } from "@/lib/cv/opencv";
import {
  PAPER_SIZES,
  THRESHOLDS,
  analyzeFrame,
  validateFrame,
  type PaperKind,
  type Validation,
} from "@/lib/cv/quality";
import { canvasFromSource, type NormalizedResult } from "@/lib/cv/normalize";
import { processStillImage } from "@/lib/cv/process";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paper: PaperKind;
  onPaperChange: (p: PaperKind) => void;
  mode: "paper" | "id-card";
  onCaptured: (result: NormalizedResult) => void;
};

const CHECK_LABELS: Record<keyof Validation["checks"], string> = {
  paper: "Kertas",
  corners: "4 sudut",
  area: "Jarak",
  skew: "Kelurusan",
  blur: "Ketajaman",
  brightness: "Cahaya",
};

export const DocumentScanner = ({
  open,
  onOpenChange,
  paper,
  onPaperChange,
  mode,
  onCaptured,
}: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const stableRef = useRef(0);
  const busyRef = useRef(false);

  const [status, setStatus] = useState("Menyiapkan kamera…");
  const [checks, setChecks] = useState<Validation["checks"] | null>(null);
  const [stable, setStable] = useState(0);
  const [fill, setFill] = useState(0);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async () => {
    if (busyRef.current || !videoRef.current) return;
    busyRef.current = true;
    setProcessing(true);
    setError(null);
    try {
      const still = canvasFromSource(videoRef.current);
      const outcome = await processStillImage(still, paper, mode);
      if (outcome.ok && outcome.result) {
        onCaptured(outcome.result);
        onOpenChange(false);
      } else {
        setError(outcome.reason ?? "Foto tidak memenuhi standar kualitas.");
        stableRef.current = 0;
        setStable(0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses foto.");
    } finally {
      busyRef.current = false;
      setProcessing(false);
    }
  }, [mode, onCaptured, onOpenChange, paper]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let cv: any = null;
    const work = document.createElement("canvas");

    const stop = () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    const tick = () => {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (cancelled || !cv || !video || !overlay || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const scale = 480 / video.videoWidth;
      work.width = 480;
      work.height = Math.round(video.videoHeight * scale);
      const wctx = work.getContext("2d")!;
      wctx.drawImage(video, 0, 0, work.width, work.height);

      let metrics: ReturnType<typeof analyzeFrame> | null = null;
      const src = cv.imread(work);
      try {
        metrics = analyzeFrame(cv, src, {
          minAreaRatio: mode === "paper" ? 0.1 : 0.01,
        });
      } finally {
        src.delete();
      }

      const validation = validateFrame(metrics);
      setChecks(validation.checks);
      setStatus(validation.message);
      setFill(metrics.quad ? metrics.areaRatio : 0);

      // Overlay: (1) bracket panduan statis, (2) kontur kertas terdeteksi
      overlay.width = video.clientWidth;
      overlay.height = video.clientHeight;
      const ctx = overlay.getContext("2d")!;
      ctx.clearRect(0, 0, overlay.width, overlay.height);

      // (1) Bracket sudut sebagai target area — bukan kotak penuh agar tidak tertukar
      const insetX = overlay.width * 0.05;
      const insetY = overlay.height * 0.05;
      const x0 = insetX;
      const y0 = insetY;
      const x1 = overlay.width - insetX;
      const y1 = overlay.height - insetY;
      const arm = Math.min(overlay.width, overlay.height) * 0.09;
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      const bracket = (cx: number, cy: number, dx: number, dy: number) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx * arm, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy * arm);
        ctx.stroke();
      };
      bracket(x0, y0, 1, 1);
      bracket(x1, y0, -1, 1);
      bracket(x1, y1, -1, -1);
      bracket(x0, y1, 1, -1);

      // (2) Kertas yang terdeteksi
      if (metrics.quad) {
        const kx = overlay.width / work.width;
        const ky = overlay.height / work.height;
        ctx.beginPath();
        metrics.quad.forEach((p, i) => {
          const x = p.x * kx;
          const y = p.y * ky;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.strokeStyle = validation.ok ? "#7dffb4" : "#ffd479";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.fillStyle = validation.ok
          ? "rgba(125,255,180,0.16)"
          : "rgba(255,212,121,0.08)";
        ctx.fill();
        metrics.quad.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x * kx, p.y * ky, 6, 0, Math.PI * 2);
          ctx.fillStyle = validation.ok ? "#7dffb4" : "#ffd479";
          ctx.fill();
        });
      }

      if (validation.ok && !busyRef.current) {
        stableRef.current += 1;
        setStable(stableRef.current);
        if (stableRef.current >= THRESHOLDS.stableFrames) {
          stableRef.current = 0;
          setStable(0);
          void capture();
        }
      } else if (!validation.ok) {
        stableRef.current = 0;
        setStable(0);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        setError(null);
        setReady(false);
        setStatus("Memuat mesin visi komputer…");
        cv = await loadOpenCv();
        if (cancelled) return;
        setStatus("Mengaktifkan kamera…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setError(
          e instanceof Error
            ? `Kamera tidak dapat diakses: ${e.message}`
            : "Kamera tidak dapat diakses.",
        );
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, mode, capture]);

  const fillOk = fill >= THRESHOLDS.areaMin && fill <= THRESHOLDS.areaMax;
  const distanceHint =
    fill === 0
      ? { Icon: ScanLine, label: "Arahkan ke kertas" }
      : fill < THRESHOLDS.areaIdealMin
        ? { Icon: ZoomIn, label: "Dekatkan kamera" }
        : fill > THRESHOLDS.areaIdealMax
          ? { Icon: ZoomOut, label: "Jauhkan sedikit" }
          : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-black/95 border-white/10 p-3 md:p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-white font-body text-sm">
            <ScanLine className="h-4 w-4" />
            Pemindai Tulisan Tangan
          </div>
          <div className="flex items-center gap-2">
            {mode === "paper" && (
              <select
                value={paper}
                onChange={(e) => onPaperChange(e.target.value as PaperKind)}
                className="bg-white/10 text-white text-xs rounded-full px-3 py-1.5 border border-white/15 outline-none"
              >
                {(Object.keys(PAPER_SIZES) as PaperKind[]).map((k) => (
                  <option key={k} value={k} className="bg-black">
                    {PAPER_SIZES[k].label}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Tutup pemindai"
              className="liquid-glass-strong rounded-full p-2 text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-[3/4]">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover"
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />

          {(!ready || processing) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="font-body text-sm">
                {processing ? "Menormalisasi gambar…" : status}
              </p>
            </div>
          )}

          <div className="absolute top-3 left-1/2 -translate-x-1/2 liquid-glass-strong rounded-full px-4 py-2 text-white text-xs md:text-sm font-body whitespace-nowrap">
            {status}
          </div>

          {/* Legenda dua bingkai */}
          <div className="absolute top-14 left-3 flex flex-col gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-white/80 font-body">
              <span className="h-2 w-2 rounded-[2px] border-2 border-white/60" />
              Bingkai target
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] text-white/80 font-body">
              <span
                className="h-2 w-2 rounded-[2px] border-2"
                style={{ borderColor: fillOk ? "#7dffb4" : "#ffd479" }}
              />
              Kertas terdeteksi
            </span>
          </div>

          {/* Indikator jarak: arahkan kertas ke zona hijau */}
          <div className="absolute top-14 right-3 flex flex-col items-center gap-2">
            <div className="relative h-40 w-3 rounded-full bg-black/50 overflow-hidden border border-white/15">
              <div
                className="absolute left-0 right-0 bg-[#7dffb4]/25"
                style={{
                  bottom: `${THRESHOLDS.areaIdealMin * 100}%`,
                  height: `${(THRESHOLDS.areaIdealMax - THRESHOLDS.areaIdealMin) * 100}%`,
                }}
              />
              <div
                className="absolute left-0 right-0 h-1 bg-white transition-all"
                style={{ bottom: `calc(${Math.min(1, fill) * 100}% - 2px)` }}
              />
            </div>
            <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/80 font-body">
              {Math.round(fill * 100)}%
            </span>
          </div>

          {/* Petunjuk gerak kamera */}
          {ready && !processing && distanceHint && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 text-white">
              <distanceHint.Icon className="h-10 w-10 opacity-90 animate-pulse" />
              <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-body">
                {distanceHint.label}
              </span>
            </div>
          )}

          {stable > 0 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-40 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${(stable / THRESHOLDS.stableFrames) * 100}%` }}
              />
            </div>
          )}

          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 px-4">
            {checks && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {(Object.keys(CHECK_LABELS) as (keyof Validation["checks"])[]).map(
                  (k) => (
                    <span
                      key={k}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-body inline-flex items-center gap-1 border ${
                        checks[k]
                          ? "bg-white/15 text-white border-white/25"
                          : "bg-black/40 text-white/50 border-white/10"
                      }`}
                    >
                      {checks[k] ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <CircleAlert className="h-3 w-3" />
                      )}
                      {CHECK_LABELS[k]}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-white/50 font-body text-[11px] mt-3 text-center">
          Foto diambil otomatis saat seluruh sudut kertas terlihat, cukup tajam,
          dan pencahayaan memadai. Tahan kamera stabil sejenak.
        </p>
        {error && (
          <p className="text-red-300 font-body text-xs mt-2 text-center">{error}</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DocumentScanner;
