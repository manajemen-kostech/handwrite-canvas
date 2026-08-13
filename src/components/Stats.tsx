import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  X,
  Sparkles,
  ImageIcon,
  Maximize2,
  Loader2,
  Ruler,
  ScanLine,
  CreditCard,
  FileText,
  PenTool,
  AlignLeft,
  BookOpen,
  Heart,
  Sparkle,
  Signature,
  Info,
  CheckCircle2,
  ArrowDown,
} from "lucide-react";
import HlsVideo from "./HlsVideo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import DocumentScanner from "./DocumentScanner";
import { PAPER_SIZES, type PaperKind } from "@/lib/cv/quality";
import {
  canvasToJpeg,
  type CalibrationMetadata,
  type NormalizedResult,
} from "@/lib/cv/normalize";

export const Stats = () => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<CalibrationMetadata | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paper, setPaper] = useState<PaperKind>("f4");
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [cardMode, setCardMode] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const applyResult = (result: NormalizedResult) => {
    canvasRef.current = result.canvas;
    setMetadata(result.metadata);
    setImageUrl(canvasToJpeg(result.canvas, 1000, 0.85));
    toast({
      title: "Gambar ternormalisasi",
      description: `Kalibrasi ${result.metadata.pxPerMm.toFixed(2)} px/mm • kanvas ${result.metadata.canvasWidth}×${result.metadata.canvasHeight}px @ ${result.metadata.dpi} DPI`,
    });
  };

  const handleClear = () => {
    canvasRef.current = null;
    setImageUrl(null);
    setMetadata(null);
  };

  const handleAnalyze = async () => {
    if (!canvasRef.current || !metadata || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const payload = canvasToJpeg(canvasRef.current, 1654, 0.92);
      const { data, error } = await supabase.functions.invoke("analyze-handwriting", {
        body: { imageBase64: payload, calibration: metadata },
      });
      if (error) throw error;
      if (!data?.analysis) throw new Error("Analisis tidak tersedia.");

      sessionStorage.setItem("handwriting-analysis", JSON.stringify(data.analysis));
      sessionStorage.setItem("handwriting-image", canvasToJpeg(canvasRef.current, 800, 0.8));
      sessionStorage.setItem("handwriting-calibration", JSON.stringify(metadata));
      navigate("/analysis");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Terjadi kesalahan saat analisis.";
      toast({
        title: "Gagal menganalisis",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section id="start" className="relative overflow-hidden scroll-mt-24">
      <HlsVideo
        src="https://stream.mux.com/NcU3HlHeF7CUL86azTTzpy3Tlb00d6iF3BmCdFslMJYM.m3u8"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ filter: "saturate(0)" }}
      />
      <div
        className="absolute top-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: 200, background: "linear-gradient(to bottom, #000, transparent)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: 200, background: "linear-gradient(to top, #000, transparent)" }}
      />

      <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-12 pb-32 max-w-6xl mx-auto">
        <div className="liquid-glass rounded-3xl p-8 md:p-12 lg:p-16">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body mb-6">
              Capture & Kalibrasi Otomatis
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading italic text-white tracking-tight leading-[0.9] max-w-2xl mb-4">
              Pindai Tulisan Tangan Anda Di Sini
            </h2>
            <p className="text-white/60 font-body text-sm max-w-xl">
              Setiap foto dikoreksi perspektifnya, dikalibrasi ke satuan milimeter,
              dan dinormalisasi ke kanvas {PAPER_SIZES[paper].label.split(" —")[0]} 300 DPI
              sebelum masuk ke mesin analisis.
            </p>
          </div>

          {/* Pengaturan referensi kalibrasi */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className="liquid-glass rounded-full px-3 py-1.5 flex items-center gap-2">
              <Ruler className="h-3.5 w-3.5 text-white/70" />
              <select
                value={paper}
                onChange={(e) => setPaper(e.target.value as PaperKind)}
                disabled={cardMode}
                className="bg-transparent text-white text-xs font-body outline-none disabled:opacity-40"
              >
                {(Object.keys(PAPER_SIZES) as PaperKind[]).map((k) => (
                  <option key={k} value={k} className="bg-black">
                    {PAPER_SIZES[k].label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setCardMode((v) => !v)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-body inline-flex items-center gap-2 border transition-colors ${
                cardMode
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-white/5 text-white/60 border-white/15"
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              Mode kartu referensi (kertas tidak utuh)
            </button>
          </div>

          {/* Fixed-size preview frame */}
          <div className="flex justify-center">
            <div className="relative liquid-glass rounded-2xl p-3 w-full max-w-2xl">
              <div className="relative h-[420px] w-full rounded-xl overflow-hidden bg-white/[0.03] border border-white/10">
                {isProcessing && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 text-white gap-3">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="font-body text-sm">Preprocessing & kalibrasi…</p>
                  </div>
                )}
                {!imageUrl ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                    <div
                      className="absolute inset-0 opacity-[0.15] pointer-events-none"
                      style={{
                        backgroundImage:
                          "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    />
                    <div className="relative liquid-glass rounded-full p-4 mb-4">
                      <ImageIcon className="h-6 w-6 text-white/70" />
                    </div>
                    <p className="relative text-white/70 font-body text-sm md:text-base">
                      Hasil pindaian ternormalisasi akan tampil di sini
                    </p>
                    <p className="relative text-white/40 font-body text-xs mt-1">
                      Perspektif lurus • background putih • skala px→mm tervalidasi
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setIsPreviewOpen(true)}
                      className="absolute inset-0 h-full w-full overflow-y-auto overflow-x-hidden cursor-zoom-in group"
                      aria-label="Buka foto utuh"
                    >
                      <img
                        src={imageUrl}
                        alt="Pratinjau tulisan tangan yang sudah dinormalisasi"
                        className="w-full h-auto block"
                      />
                    </button>
                    <div className="absolute top-2 right-2 flex items-center gap-2 pointer-events-none">
                      <div className="liquid-glass-strong rounded-full p-2 text-white pointer-events-auto">
                        <Maximize2 className="h-3.5 w-3.5" />
                      </div>
                      <button
                        onClick={handleClear}
                        aria-label="Hapus foto"
                        className="liquid-glass-strong rounded-full p-2 text-white pointer-events-auto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Metadata kalibrasi */}
          {metadata && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {[
                `${metadata.pxPerMm.toFixed(2)} px/mm`,
                `${metadata.canvasWidth}×${metadata.canvasHeight} px @ ${metadata.dpi} DPI`,
                `Rotasi ${metadata.correctedSkewDeg}°`,
                metadata.method === "paper"
                  ? `Kalibrasi kertas ${metadata.paperWidthMm}×${metadata.paperHeightMm} mm`
                  : "Kalibrasi kartu referensi",
                metadata.ruledLineSpacingMm
                  ? `Garis ${metadata.ruledLineSpacingMm} mm (cross-check)`
                  : null,
                `Ketajaman ${metadata.quality.blurVar}`,
              ]
                .filter(Boolean)
                .map((chip) => (
                  <span
                    key={chip as string}
                    className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] text-white/80 font-body"
                  >
                    {chip}
                  </span>
                ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setInstructionsOpen(true)}
              disabled={isProcessing || isAnalyzing}
              className="liquid-glass rounded-full px-6 py-3 inline-flex items-center gap-2 text-white text-sm font-body font-medium w-full sm:w-auto justify-center disabled:opacity-50"
            >
              <ScanLine className="h-4 w-4" />
              {imageUrl ? "Pindai Ulang" : "Pindai dengan Kamera"}
            </button>
            {imageUrl && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || isProcessing}
                className="liquid-glass-strong rounded-full px-6 py-3 inline-flex items-center gap-2 text-white text-sm font-body font-medium w-full sm:w-auto justify-center disabled:opacity-60"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menganalisis…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analisis Tulisan Tangan
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-white/40 font-body text-[11px] text-center mt-4 inline-flex items-center gap-1.5 justify-center w-full">
            <Camera className="h-3 w-3" />
            Foto blur, gelap, miring, atau kertas tidak lengkap otomatis ditolak
            sebelum dianalisis.
          </p>
        </div>
      </div>

      <DocumentScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        paper={paper}
        onPaperChange={setPaper}
        mode={cardMode ? "id-card" : "paper"}
        onCaptured={applyResult}
      />

      {/* Full-size preview dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl bg-black/90 border-white/10 p-2 md:p-4">
          {imageUrl && (
            <div className="max-h-[85vh] overflow-auto rounded-lg">
              <img
                src={imageUrl}
                alt="Foto tulisan tangan ternormalisasi"
                className="w-full h-auto block"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pre-scan instructions dialog */}
      <Dialog
        open={instructionsOpen}
        onOpenChange={(o) => {
          setInstructionsOpen(o);
          if (o) setScrolledToEnd(false);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[92vh] !rounded-2xl bg-[#0a0a0a]/95 border-white/10 p-0 overflow-hidden">
          <div className="relative">
            {/* Header gradient */}
            <div className="relative px-6 pt-8 pb-6 bg-gradient-to-br from-blue-500/20 via-violet-500/10 to-transparent">
              <div className="flex items-start gap-4">
                <div className="shrink-0 liquid-glass-strong rounded-2xl p-3.5 text-white">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-2xl md:text-3xl font-heading italic text-white leading-[0.95]">
                      Panduan Pengambilan Foto
                    </h3>
                    <div className="liquid-glass rounded-full px-2.5 py-1 text-[10px] font-body text-white/80">
                      Wajib dibaca
                    </div>
                  </div>
                  <p className="text-white/60 font-body text-sm">
                    Baca seluruh ketentuan di bawah agar analisis tulisan tangan Anda akurat dan maksimal.
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable instructions */}
            <div
              className="px-6 py-2 max-h-[55vh] overflow-y-auto"
              ref={(el) => {
                if (el && el.scrollHeight <= el.clientHeight + 24) setScrolledToEnd(true);
              }}
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
                  setScrolledToEnd(true);
                }
              }}
            >
              <div className="space-y-3">
                {[
                  {
                    icon: FileText,
                    title: "Kertas",
                    desc: "Gunakan kertas putih polos ukuran F4 (folio), tanpa garis atau kotak.",
                  },
                  {
                    icon: PenTool,
                    title: "Alat Tulis",
                    desc: "Gunakan pulpen atau pensil biasa yang nyaman. Hindari spidol atau ujung terlalu tebal.",
                  },
                  {
                    icon: AlignLeft,
                    title: "Panjang Tulisan",
                    desc: "Tulis minimal 10–20 baris agar pola tulisan dapat dianalisis dengan baik.",
                  },
                  {
                    icon: BookOpen,
                    title: "Jenis Tulisan",
                    desc: "Tulis secara bebas dan natural, misalnya cerita, pengalaman, aktivitas, atau opini. Hindari menyalin teks.",
                  },
                  {
                    icon: Heart,
                    title: "Kondisi Menulis",
                    desc: "Tulis dalam kondisi nyaman, tenang, dan tidak terburu-buru.",
                  },
                  {
                    icon: Sparkle,
                    title: "Keaslian Tulisan",
                    desc: "Gunakan gaya tulisan sehari-hari. Jangan sengaja memperindah atau mengubah tulisan.",
                  },
                  {
                    icon: Signature,
                    title: "Tanda Tangan",
                    desc: "Tambahkan tanda tangan asli di bagian bawah halaman.",
                  },
                  {
                    icon: Info,
                    title: "Informasi Tambahan",
                    desc: "Tuliskan tanggal, usia, dan tangan dominan (kanan/kiri) di bagian bawah halaman.",
                  },
                  {
                    icon: Camera,
                    title: "Foto / Scan",
                    desc: "Pastikan seluruh kertas terlihat dengan kamera lurus, pencahayaan cukup, dan tulisan jelas.",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 py-2">
                    <div className="shrink-0 text-white/80">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-body font-semibold text-sm mb-0.5">
                        {item.title}
                      </h4>
                      <p className="text-white/60 font-body text-sm leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="py-6 text-center text-white/40 font-body text-xs">
                Anda telah membaca semua ketentuan. Tombol lanjut pindai kini aktif.
              </div>
            </div>

            {/* Footer action */}
            <div className="sticky bottom-0 px-6 py-5 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent border-t border-white/10">
              {!scrolledToEnd && (
                <p className="mb-3 flex items-center justify-center gap-2 text-white/35 font-body text-xs animate-bounce">
                  <ArrowDown className="h-3.5 w-3.5" />
                  Scroll hingga bawah untuk melanjutkan pindai
                </p>
              )}
              <button
                onClick={() => {
                  setInstructionsOpen(false);
                  setScannerOpen(true);
                }}
                disabled={!scrolledToEnd}
                className="w-full liquid-glass-strong rounded-full px-6 py-3.5 inline-flex items-center justify-center gap-2 text-white text-sm font-body font-medium hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <CheckCircle2 className="h-4 w-4" />
                Saya mengerti, lanjut pindai
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Stats;
