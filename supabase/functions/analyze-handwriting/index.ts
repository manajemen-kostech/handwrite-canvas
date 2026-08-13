// Edge function: analisis tulisan tangan menggunakan OpenAI GPT-4o Vision
// Mengembalikan JSON terstruktur berisi skor sifat, profil DiSC, dan rekomendasi pekerjaan
// dalam Bahasa Indonesia.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Anda adalah ahli grafologi profesional yang mengkhususkan diri dalam analisis tulisan tangan. Analisis sampel tulisan tangan yang diberikan menggunakan metode grafologi profesional dan berikan profil psikologis yang komprehensif.

SANGAT PENTING: SEMUA TEKS HARUS DALAM BAHASA INDONESIA. Jangan gunakan bahasa Inggris sama sekali (kecuali nama field JSON).

Untuk setiap sifat, berikan:
1. Skor dari 0-100
2. Analisis detail dalam Bahasa Indonesia yang menjelaskan fitur tulisan tangan spesifik
3. Indikator spesifik dalam Bahasa Indonesia (3-5 poin)

Analisis sifat-sifat kepribadian berikut:
- Loyalitas: Konsistensi dalam pembentukan huruf, stabilitas garis dasar, penempatan garis-t
- Integritas: Kelengkapan huruf, konsistensi kemiringan, penempatan titik-i, indikator kejujuran
- Kreativitas: Variasi dalam bentuk huruf, hiasan unik, orisinalitas dalam gaya
- Kerapian: Organisasi, keseragaman jarak, konsistensi margin, kerapihan
- Logika: Pendekatan sistematis, koneksi huruf, tulisan angular vs melengkung
- Disiplin: Kelurusan garis dasar, ukuran seragam, tekanan konsisten, regularitas

Analisis WAJIB juga mencakup profil kepribadian DiSC:
- Dominance (Dominasi): Tekanan tulisan, ukuran huruf, kecepatan tulisan, keberanian garis
- Influence (Pengaruh): Kelengkungan, ekspresi, variasi, gaya ekspresif
- Steadiness (Stabilitas): Konsistensi, keteraturan, kesabaran yang terlihat dari tulisan
- Conscientiousness (Kehati-hatian): Detail, presisi, kerapian, struktur sistematis

Berdasarkan analisis lengkap, rekomendasikan 3-5 pilihan pekerjaan dalam Bahasa Indonesia dengan alasan detail.

Berikan ringkasan eksekutif (executive summary) 3-5 kalimat dalam Bahasa Indonesia yang merangkum kepribadian penulis.

INGAT: Respons HARUS 100% dalam Bahasa Indonesia. Jangan gunakan bahasa Inggris untuk konten.`;

const ANALYSIS_TOOL = {
  type: "function" as const,
  function: {
    name: "submit_handwriting_analysis",
    description:
      "Submit hasil analisis grafologi tulisan tangan secara terstruktur dalam Bahasa Indonesia.",
    parameters: {
      type: "object",
      properties: {
        ringkasan: {
          type: "string",
          description:
            "Ringkasan eksekutif 3-5 kalimat dalam Bahasa Indonesia tentang kepribadian penulis.",
        },
        sifat: {
          type: "object",
          properties: {
            loyalitas: { $ref: "#/definitions/trait" },
            integritas: { $ref: "#/definitions/trait" },
            kreativitas: { $ref: "#/definitions/trait" },
            kerapian: { $ref: "#/definitions/trait" },
            logika: { $ref: "#/definitions/trait" },
            disiplin: { $ref: "#/definitions/trait" },
          },
          required: [
            "loyalitas",
            "integritas",
            "kreativitas",
            "kerapian",
            "logika",
            "disiplin",
          ],
          additionalProperties: false,
        },
        disc: {
          type: "object",
          properties: {
            dominance: { $ref: "#/definitions/trait" },
            influence: { $ref: "#/definitions/trait" },
            steadiness: { $ref: "#/definitions/trait" },
            conscientiousness: { $ref: "#/definitions/trait" },
            tipe_dominan: {
              type: "string",
              description:
                "Tipe DiSC paling dominan (Dominance/Influence/Steadiness/Conscientiousness) beserta penjelasan singkat dalam Bahasa Indonesia.",
            },
          },
          required: [
            "dominance",
            "influence",
            "steadiness",
            "conscientiousness",
            "tipe_dominan",
          ],
          additionalProperties: false,
        },
        rekomendasi_pekerjaan: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              nama: { type: "string", description: "Nama pekerjaan dalam Bahasa Indonesia." },
              alasan: {
                type: "string",
                description:
                  "Alasan detail dalam Bahasa Indonesia mengapa pekerjaan ini cocok berdasarkan analisis.",
              },
            },
            required: ["nama", "alasan"],
            additionalProperties: false,
          },
        },
      },
      required: ["ringkasan", "sifat", "disc", "rekomendasi_pekerjaan"],
      additionalProperties: false,
      definitions: {
        trait: {
          type: "object",
          properties: {
            skor: { type: "integer", minimum: 0, maximum: 100 },
            analisis: {
              type: "string",
              description:
                "Analisis detail (3-5 kalimat) dalam Bahasa Indonesia yang menjelaskan fitur tulisan tangan spesifik.",
            },
            indikator: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: { type: "string" },
              description: "Indikator spesifik dalam Bahasa Indonesia.",
            },
          },
          required: ["skor", "analisis", "indikator"],
          additionalProperties: false,
        },
      },
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY belum dikonfigurasi." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    const imageBase64: string | undefined = body?.imageBase64;
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "Field 'imageBase64' (data URL) wajib disertakan." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Re-validasi metadata kalibrasi di sisi server — mencegah bypass validasi klien.
    const cal = body?.calibration;
    const calErrors: string[] = [];
    if (!cal || typeof cal !== "object") {
      calErrors.push("Metadata kalibrasi (px per mm) tidak disertakan.");
    } else {
      if (typeof cal.pxPerMm !== "number" || !(cal.pxPerMm > 0)) {
        calErrors.push("Rasio piksel-per-mm tidak valid.");
      }
      if (cal.canvasWidth !== 2480 || cal.canvasHeight !== 3508) {
        calErrors.push("Dimensi kanvas tidak sesuai standar 2480×3508 px.");
      }
      if (cal.correctedSkewDeg !== 0) {
        calErrors.push("Gambar belum dikoreksi perspektifnya (rotasi ≠ 0°).");
      }
      const q = cal.quality ?? {};
      if (typeof q.blurVar === "number" && q.blurVar < 60) {
        calErrors.push("Gambar terlalu buram (variance of Laplacian < 60).");
      }
      if (
        typeof q.brightness === "number" &&
        (q.brightness < 60 || q.brightness > 210)
      ) {
        calErrors.push("Pencahayaan gambar di luar rentang aman.");
      }
    }
    if (calErrors.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Gambar tidak lolos validasi preprocessing.",
          detail: calErrors,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const calibrationNote =
      `Gambar sudah dinormalisasi: perspektif dikoreksi (rotasi 0°), background diputihkan, ` +
      `kanvas ${cal.canvasWidth}×${cal.canvasHeight} px pada ${cal.dpi ?? 300} DPI. ` +
      `Skala terkalibrasi: ${cal.pxPerMm} piksel = 1 mm` +
      (cal.method === "paper"
        ? ` (kalibrasi dari kertas ${cal.paperWidthMm}×${cal.paperHeightMm} mm).`
        : " (kalibrasi dari kartu referensi 85,6×53,98 mm).") +
      (cal.ruledLineSpacingMm
        ? ` Jarak antar garis kertas terukur ${cal.ruledLineSpacingMm} mm sebagai validasi silang.`
        : "") +
      ` WAJIB: konversi semua pengukuran fitur tulisan (tinggi huruf, tebal goresan, jarak antar kata, margin) ` +
      `ke satuan milimeter memakai rasio tersebut sebelum memberi skor, jangan menilai dari piksel mentah. ` +
      `Sebutkan nilai milimeter tersebut pada bagian indikator bila relevan.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.5,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `Analisislah tulisan tangan pada gambar berikut. ${calibrationNote} Gunakan tool 'submit_handwriting_analysis' untuk memberikan hasil terstruktur. Semua teks WAJIB dalam Bahasa Indonesia.`,
              },
              {
                type: "image_url",
                image_url: { url: imageBase64, detail: "high" },
              },
            ],
          },
        ],
        tools: [ANALYSIS_TOOL],
        tool_choice: {
          type: "function",
          function: { name: "submit_handwriting_analysis" },
        },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("OpenAI error:", openaiRes.status, errText);
      return new Response(
        JSON.stringify({
          error: `OpenAI API gagal (${openaiRes.status}). Periksa API key atau coba lagi.`,
          detail: errText.slice(0, 500),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await openaiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      console.error("No tool call in response", JSON.stringify(data).slice(0, 1000));
      return new Response(
        JSON.stringify({ error: "Model tidak mengembalikan analisis terstruktur." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(argsStr);
    } catch (e) {
      console.error("JSON parse failed", e, argsStr.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Format JSON dari model tidak valid." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-handwriting error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
