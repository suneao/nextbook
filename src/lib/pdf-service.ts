"use client";

let pdfjsLib: any = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  if (typeof window === "undefined")
    throw new Error("PDF.js only works in browser");

  pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjsLib;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const raw = base64.includes("base64,") ? base64.split("base64,")[1] : base64;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function extractTextFromPDF(base64Data: string): Promise<string> {
  const pdfjs = await getPdfJs();

  if (!base64Data || base64Data.length < 100) {
    throw new Error("PDF data is empty or too small");
  }

  let bytes: Uint8Array;
  try {
    bytes = base64ToUint8Array(base64Data);
  } catch (e) {
    throw new Error(
      "Failed to decode PDF file. The file may be corrupted. " +
        (e instanceof Error ? e.message : ""),
    );
  }

  if (bytes.length === 0) {
    throw new Error("Decoded PDF data is empty");
  }

  let pdf: any;
  try {
    const loadingTask = pdfjs.getDocument({ data: bytes });
    pdf = await loadingTask.promise;
  } catch (e) {
    throw new Error(
      "Failed to parse PDF. The file may be encrypted, corrupted, or not a valid PDF. " +
        (e instanceof Error ? e.message : ""),
    );
  }

  try {
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = (content.items as any[])
        .map((item: any) => item.str || "")
        .join(" ");
      if (text.trim()) pages.push(text);
    }

    if (pages.length === 0) {
      throw new Error(
        "No readable text found in PDF. The file may be a scanned image or contain only graphics.",
      );
    }

    return pages.join("\n\n");
  } finally {
    // Clean up PDF resources to avoid memory leaks
    try {
      pdf.cleanup?.();
      pdf.destroy?.();
    } catch {}
  }
}

export async function extractTextFromPDFFile(file: File): Promise<string> {
  if (!file) throw new Error("No file provided");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const text = await extractTextFromPDF(base64);
        resolve(text);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () =>
      reject(new Error("Failed to read file: " + (file.name || "unknown")));
    reader.readAsDataURL(file);
  });
}
