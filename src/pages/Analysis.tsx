import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Sparkles } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CalibrationMetadata } from "@/lib/cv/normalize";

type Trait = {
  skor: number;
  analisis: string;
  indikator: string[];
};

type AnalysisResult = {
  ringkasan: string;
  sifat: {
    loyalitas: Trait;
    integritas: Trait;
    kreativitas: Trait;
    kerapian: Trait;
    logika: Trait;
    disiplin: Trait;
  };
  disc: {
    dominance: Trait;
    influence: Trait;
    steadiness: Trait;
    conscientiousness: Trait;
    tipe_dominan: string;
  };
  rekomendasi_pekerjaan: { nama: string; alasan: string }[];
};

const TRAIT_LABELS: Record<string, string> = {
  loyalitas: "Loyalitas",
  integritas: "Integritas",
  kreativitas: "Kreativitas",
  kerapian: "Kerapian",
  logika: "Logika",
  disiplin: "Disiplin",
};

const DISC_LABELS: Record<string, string> = {
  dominance: "Dominance (Dominasi)",
  influence: "Influence (Pengaruh)",
  steadiness: "Steadiness (Stabilitas)",
  conscientiousness: "Conscientiousness (Kehati-hatian)",
};

const ScoreBar = ({ score }: { score: number }) => (
  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-white/60 to-white rounded-full transition-all"
      style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
    />
  </div>
);

const TraitCard = ({ label, trait }: { label: string; trait: Trait }) => (
  <div className="liquid-glass rounded-2xl p-5">
    <div className="flex items-baseline justify-between mb-3">
      <h3 className="text-white font-heading text-lg">{label}</h3>
      <span className="text-white font-body text-2xl font-semibold tabular-nums">
        {trait.skor}
        <span className="text-white/40 text-sm">/100</span>
      </span>
    </div>
    <ScoreBar score={trait.skor} />
    <p className="text-white/70 font-body text-sm mt-4 leading-relaxed">
      {trait.analisis}
    </p>
    <ul className="mt-3 space-y-1.5">
      {trait.indikator.map((i, idx) => (
        <li key={idx} className="text-white/60 font-body text-xs flex gap-2">
          <span className="text-white/40 mt-0.5">•</span>
          <span>{i}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Analysis = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [calibration, setCalibration] = useState<CalibrationMetadata | null>(
    null,
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("handwriting-analysis");
      const img = sessionStorage.getItem("handwriting-image");
      const cal = sessionStorage.getItem("handwriting-calibration");
      if (raw) setData(JSON.parse(raw));
      if (img) setImageUrl(img);
      if (cal) setCalibration(JSON.parse(cal));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleNew = () => navigate("/");

  const handleDownload = useMemo(
    () => () => {
      if (!data) return;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Laporan Analisis Tulisan Tangan", margin, y);
      y += 24;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(
        `Dibuat pada ${new Date().toLocaleString("id-ID")}`,
        margin,
        y,
      );
      doc.setTextColor(0);
      y += 24;

      // Ringkasan
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Ringkasan Eksekutif", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const ringkasanLines = doc.splitTextToSize(
        data.ringkasan,
        pageWidth - margin * 2,
      );
      doc.text(ringkasanLines, margin, y);
      y += ringkasanLines.length * 14 + 10;

      // Sifat kepribadian table
      autoTable(doc, {
        startY: y,
        head: [["Sifat", "Skor", "Analisis"]],
        body: Object.entries(data.sifat).map(([k, v]) => [
          TRAIT_LABELS[k] ?? k,
          `${v.skor}/100`,
          v.analisis,
        ]),
        styles: { fontSize: 9, cellPadding: 6, valign: "top" },
        headStyles: { fillColor: [30, 30, 30], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 90, fontStyle: "bold" },
          1: { cellWidth: 50, halign: "center" },
          2: { cellWidth: "auto" },
        },
        margin: { left: margin, right: margin },
        didDrawPage: () => {},
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 20;

      // Indikator detail per sifat
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      if (y > 700) {
        doc.addPage();
        y = margin;
      }
      doc.text("Indikator Sifat Kepribadian", margin, y);
      y += 14;
      doc.setFontSize(10);
      Object.entries(data.sifat).forEach(([k, v]) => {
        if (y > 760) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`${TRAIT_LABELS[k] ?? k} (${v.skor}/100)`, margin, y);
        y += 12;
        doc.setFont("helvetica", "normal");
        v.indikator.forEach((ind) => {
          const lines = doc.splitTextToSize(`• ${ind}`, pageWidth - margin * 2 - 10);
          if (y + lines.length * 11 > 780) {
            doc.addPage();
            y = margin;
          }
          doc.text(lines, margin + 10, y);
          y += lines.length * 11;
        });
        y += 6;
      });

      // DiSC
      if (y > 650) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Profil Kepribadian DiSC", margin, y);
      y += 8;

      autoTable(doc, {
        startY: y + 6,
        head: [["Dimensi", "Skor", "Analisis"]],
        body: (
          ["dominance", "influence", "steadiness", "conscientiousness"] as const
        ).map((k) => [
          DISC_LABELS[k],
          `${data.disc[k].skor}/100`,
          data.disc[k].analisis,
        ]),
        styles: { fontSize: 9, cellPadding: 6, valign: "top" },
        headStyles: { fillColor: [30, 30, 30], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 130, fontStyle: "bold" },
          1: { cellWidth: 50, halign: "center" },
          2: { cellWidth: "auto" },
        },
        margin: { left: margin, right: margin },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } })
        .lastAutoTable.finalY + 14;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      if (y > 760) {
        doc.addPage();
        y = margin;
      }
      doc.text("Tipe DiSC Dominan:", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const tipeLines = doc.splitTextToSize(
        data.disc.tipe_dominan,
        pageWidth - margin * 2,
      );
      doc.text(tipeLines, margin, y);
      y += tipeLines.length * 13 + 16;

      // Rekomendasi pekerjaan
      if (y > 700) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Rekomendasi Pekerjaan", margin, y);
      y += 8;

      autoTable(doc, {
        startY: y + 6,
        head: [["Pekerjaan", "Alasan"]],
        body: data.rekomendasi_pekerjaan.map((r) => [r.nama, r.alasan]),
        styles: { fontSize: 10, cellPadding: 6, valign: "top" },
        headStyles: { fillColor: [30, 30, 30], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 140, fontStyle: "bold" },
          1: { cellWidth: "auto" },
        },
        margin: { left: margin, right: margin },
      });

      doc.save(`analisis-tulisan-tangan-${Date.now()}.pdf`);
    },
    [data],
  );

  if (!data) {
    return (
      <main className="bg-black min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <Sparkles className="h-10 w-10 text-white/40 mb-4" />
        <h1 className="text-2xl md:text-3xl font-heading text-white mb-2">
          Belum ada hasil analisis
        </h1>
        <p className="text-white/60 font-body mb-8 max-w-md">
          Silakan unggah tulisan tangan terlebih dahulu pada halaman utama
          untuk memulai analisis.
        </p>
        <button
          onClick={() => navigate("/")}
          className="liquid-glass-strong rounded-full px-6 py-3 inline-flex items-center gap-2 text-white text-sm font-body font-medium"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
        </button>
      </main>
    );
  }

  return (
    <main className="bg-black min-h-screen text-white">
      <div className="px-6 md:px-12 lg:px-20 pt-10 pb-20 max-w-6xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="text-white/60 hover:text-white text-sm font-body inline-flex items-center gap-2 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </button>

        <div className="flex flex-col items-center text-center mb-10">
          <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body mb-5">
            Hasil Analisis Grafologi
          </div>
          <h1 className="text-3xl md:text-5xl font-heading italic text-white tracking-tight leading-[0.95] max-w-3xl">
            Profil Psikologis Tulisan Tangan Anda
          </h1>
        </div>

        <div className="grid md:grid-cols-[280px,1fr] gap-6 mb-10">
          {imageUrl && (
            <div className="liquid-glass rounded-2xl p-3">
              <div className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/10 max-h-[260px] overflow-y-auto">
                <img
                  src={imageUrl}
                  alt="Sampel tulisan tangan yang dianalisis"
                  className="w-full h-auto block"
                />
              </div>
              {calibration && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    `${calibration.pxPerMm.toFixed(2)} px/mm`,
                    `${calibration.canvasWidth}×${calibration.canvasHeight} px @ ${calibration.dpi} DPI`,
                    calibration.method === "paper"
                      ? `Kalibrasi kertas ${calibration.paperWidthMm}×${calibration.paperHeightMm} mm`
                      : "Kalibrasi kartu referensi",
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="text-[10px] font-body text-white/60 px-2 py-1 rounded-full bg-white/[0.04] border border-white/10"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="liquid-glass rounded-2xl p-6">
            <h2 className="text-white font-heading text-xl mb-3">
              Ringkasan Eksekutif
            </h2>
            <p className="text-white/75 font-body text-sm md:text-base leading-relaxed">
              {data.ringkasan}
            </p>
          </div>
        </div>

        <h2 className="text-white font-heading text-2xl md:text-3xl mb-5">
          Sifat Kepribadian
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {(Object.keys(TRAIT_LABELS) as (keyof typeof TRAIT_LABELS)[]).map(
            (k) => (
              <TraitCard
                key={k}
                label={TRAIT_LABELS[k]}
                trait={data.sifat[k as keyof typeof data.sifat]}
              />
            ),
          )}
        </div>

        <h2 className="text-white font-heading text-2xl md:text-3xl mb-2">
          Profil DiSC
        </h2>
        <p className="text-white/60 font-body text-sm mb-5">
          {data.disc.tipe_dominan}
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {(
            ["dominance", "influence", "steadiness", "conscientiousness"] as const
          ).map((k) => (
            <TraitCard key={k} label={DISC_LABELS[k]} trait={data.disc[k]} />
          ))}
        </div>

        <h2 className="text-white font-heading text-2xl md:text-3xl mb-5">
          Rekomendasi Pekerjaan
        </h2>
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {data.rekomendasi_pekerjaan.map((r, i) => (
            <div key={i} className="liquid-glass rounded-2xl p-5">
              <h3 className="text-white font-heading text-lg mb-2">
                {r.nama}
              </h3>
              <p className="text-white/70 font-body text-sm leading-relaxed">
                {r.alasan}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleNew}
            className="liquid-glass rounded-full px-6 py-3 inline-flex items-center gap-2 text-white text-sm font-body font-medium w-full sm:w-auto justify-center"
          >
            <RefreshCw className="h-4 w-4" /> Analisis Tulisan Lain
          </button>
          <button
            onClick={handleDownload}
            className="liquid-glass-strong rounded-full px-6 py-3 inline-flex items-center gap-2 text-white text-sm font-body font-medium w-full sm:w-auto justify-center"
          >
            <Download className="h-4 w-4" /> Download PDF
          </button>
        </div>
      </div>
    </main>
  );
};

export default Analysis;
